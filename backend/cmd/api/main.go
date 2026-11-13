package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/term"
)

type statusResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

const sessionCookieName = "burilka_session"
const sessionLifetime = 30 * 24 * time.Hour

type authRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	PolicyAccepted  bool   `json:"policy_accepted"`
	UniversityID    string `json:"university_id"`
	RequestedRole   string `json:"requested_role"`
	ConsentVersion  string `json:"consent_version"`
}

type authUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	PlatformRole  string `json:"platform_role"`
	Locale        string `json:"locale"`
	MustChangePwd bool   `json:"must_change_password"`
}

type authResponse struct {
	User authUser `json:"user"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type university struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name,omitempty"`
	IsActive  bool   `json:"is_active"`
}

type universityRequest struct {
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
}

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "healthcheck":
		if err := healthcheck(); err != nil {
			log.Fatal(err)
		}
	case "migrate":
		if err := migrate(); err != nil {
			log.Fatal(err)
		}
	case "superadmin-bootstrap":
		if err := bootstrapSuperadmin(); err != nil {
			log.Fatal(err)
		}
	case "serve":
		if err := serve(); err != nil {
			log.Fatal(err)
		}
	default:
		log.Fatalf("unknown command %q", command)
	}
}

func databaseURL() string {
	return strings.TrimSpace(os.Getenv("DATABASE_URL"))
}

func openDB() (*sql.DB, error) {
	url := databaseURL()
	if url == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	return db, nil
}

func healthcheck() error {
	db, err := openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return db.PingContext(ctx)
}

func migrate() error {
	db, err := openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		return err
	}
	goose.SetDialect("postgres")
	return goose.Up(db, "/app/migrations")
}

func bootstrapSuperadmin() error {
	if !term.IsTerminal(int(os.Stdin.Fd())) {
		return errors.New("superadmin bootstrap requires an interactive terminal so the password is not exposed in shell history")
	}
	if len(os.Args) != 3 {
		return errors.New("usage: burilka-api superadmin-bootstrap <email>")
	}
	email := strings.ToLower(strings.TrimSpace(os.Args[2]))
	if email == "" || !strings.Contains(email, "@") {
		return errors.New("a valid email is required")
	}

	fmt.Fprint(os.Stderr, "Initial password (input hidden): ")
	password, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stderr)
	if err != nil {
		return fmt.Errorf("read password: %w", err)
	}
	if len(password) < 12 {
		return errors.New("password must contain at least 12 bytes")
	}
	hash, err := bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
	for i := range password {
		password[i] = 0
	}
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	db, err := openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin superadmin bootstrap: %w", err)
	}
	defer tx.Rollback()
	var id string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO users (email, password_hash, platform_role, must_change_password)
		VALUES ($1, $2, 'superadmin', TRUE)
		ON CONFLICT (email) DO NOTHING
		RETURNING id`, email, string(hash)).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("account already exists; bootstrap does not reset existing passwords or change roles")
	}
	if err != nil {
		return fmt.Errorf("create superadmin: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO audit_events (actor_user_id, action, target_type, target_id) VALUES ($1::uuid, 'platform.superadmin_bootstrapped', 'user', $2::text)`, id, id); err != nil {
		return fmt.Errorf("write bootstrap audit event: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit superadmin bootstrap: %w", err)
	}
	fmt.Fprintln(os.Stdout, "Superadmin account created. It must change its password after the authentication UI is implemented.")
	return nil
}

func serve() error {
	addr := strings.TrimSpace(os.Getenv("HTTP_ADDR"))
	if addr == "" {
		addr = ":8080"
	}
	r := chi.NewRouter()
	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 2*time.Second)
		defer cancel()
		db, err := openDB()
		if err == nil {
			defer db.Close()
			err = db.PingContext(ctx)
		}
		if err != nil {
			http.Error(w, "degraded", http.StatusServiceUnavailable)
			return
		}
		writeJSON(w, http.StatusOK, statusResponse{Status: "ok", Service: "burilka-api"})
	})
	r.Get("/api/v1/status", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, statusResponse{Status: "ok", Service: "burilka-api"})
	})
	r.Post("/api/v1/auth/register", registerHandler)
	r.Post("/api/v1/auth/login", loginHandler)
	r.Post("/api/v1/auth/logout", logoutHandler)
	r.Get("/api/v1/auth/me", meHandler)
	r.Get("/api/v1/universities", listUniversitiesHandler)
	r.Get("/api/v1/admin/universities", adminListUniversitiesHandler)
	r.Post("/api/v1/admin/universities", adminCreateUniversityHandler)
	server := &http.Server{Addr: addr, Handler: r, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	log.Printf("API listening on %s", addr)
	return server.ListenAndServe()
}

func registerHandler(w http.ResponseWriter, req *http.Request) {
	var input authRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 16<<10)).Decode(&input); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_request", "Некорректные данные формы")
		return
	}
	email, password, err := validateCredentials(input, true)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_credentials", err.Error())
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "password_error", "Не удалось обработать пароль")
		return
	}
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	var userID string
	var universityID any
	if strings.TrimSpace(input.UniversityID) != "" {
		universityID = strings.TrimSpace(input.UniversityID)
	}
	err = db.QueryRowContext(ctx, `INSERT INTO users (email, password_hash, requested_role, policy_accepted_at, policy_consent_version, university_id) VALUES ($1, $2, $3, now(), $4, $5) RETURNING id`, email, string(hash), input.RequestedRole, input.ConsentVersion, universityID).Scan(&userID)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			writeAPIError(w, http.StatusConflict, "email_exists", "Пользователь с таким email уже зарегистрирован")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	user, err := loadUser(ctx, db, userID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	if err := createSession(ctx, db, user.ID, w); err != nil {
		writeAPIError(w, http.StatusInternalServerError, "session_error", "Не удалось создать сессию")
		return
	}
	writeJSON(w, http.StatusCreated, authResponse{User: user})
}

func loginHandler(w http.ResponseWriter, req *http.Request) {
	var input authRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 16<<10)).Decode(&input); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_request", "Некорректные данные формы")
		return
	}
	email, password, err := validateCredentials(input, false)
	if err != nil {
		writeAPIError(w, http.StatusUnauthorized, "invalid_credentials", "Неверный email или пароль")
		return
	}
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	var id, passwordHash string
	err = db.QueryRowContext(ctx, `SELECT id, password_hash FROM users WHERE email = $1`, email).Scan(&id, &passwordHash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) != nil {
		writeAPIError(w, http.StatusUnauthorized, "invalid_credentials", "Неверный email или пароль")
		return
	}
	user, err := loadUser(ctx, db, id)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	if err := createSession(ctx, db, user.ID, w); err != nil {
		writeAPIError(w, http.StatusInternalServerError, "session_error", "Не удалось создать сессию")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: user})
}

func logoutHandler(w http.ResponseWriter, req *http.Request) {
	if cookie, err := req.Cookie(sessionCookieName); err == nil {
		if db, dbErr := openDB(); dbErr == nil {
			defer db.Close()
			_, _ = db.ExecContext(req.Context(), `DELETE FROM sessions WHERE token_hash = $1`, hashToken(cookie.Value))
		}
	}
	http.SetCookie(w, expiredSessionCookie())
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func meHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	user, ok := authenticatedUser(ctx, db, req)
	if !ok {
		writeAPIError(w, http.StatusUnauthorized, "unauthorized", "Требуется вход в систему")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: user})
}

func listUniversitiesHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	rows, err := db.QueryContext(req.Context(), `SELECT id, name, COALESCE(short_name, ''), is_active FROM universities WHERE is_active = TRUE ORDER BY name`)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer rows.Close()
	items, err := scanUniversities(rows)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"universities": items})
}

func adminListUniversitiesHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, http.StatusForbidden, "forbidden", "Недостаточно прав")
		return
	}
	rows, err := db.QueryContext(ctx, `SELECT id, name, COALESCE(short_name, ''), is_active FROM universities ORDER BY name`)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer rows.Close()
	items, err := scanUniversities(rows)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"universities": items})
}

func adminCreateUniversityHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, http.StatusForbidden, "forbidden", "Недостаточно прав")
		return
	}
	var input universityRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 16<<10)).Decode(&input); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid_request", "Некорректные данные")
		return
	}
	name := strings.TrimSpace(input.Name)
	shortName := strings.TrimSpace(input.ShortName)
	if len([]rune(name)) < 2 || len([]rune(name)) > 300 {
		writeAPIError(w, http.StatusBadRequest, "invalid_name", "Название ВУЗа должно содержать от 2 до 300 символов")
		return
	}
	var item university
	err = db.QueryRowContext(ctx, `INSERT INTO universities (name, short_name) VALUES ($1, NULLIF($2, '')) RETURNING id, name, COALESCE(short_name, ''), is_active`, name, shortName).Scan(&item.ID, &item.Name, &item.ShortName, &item.IsActive)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			writeAPIError(w, http.StatusConflict, "university_exists", "Такой ВУЗ уже добавлен")
			return
		}
		writeAPIError(w, http.StatusInternalServerError, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func scanUniversities(rows *sql.Rows) ([]university, error) {
	items := make([]university, 0)
	for rows.Next() {
		var item university
		if err := rows.Scan(&item.ID, &item.Name, &item.ShortName, &item.IsActive); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func validateCredentials(input authRequest, registration bool) (string, string, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !strings.Contains(email, "@") || len(email) > 320 {
		return "", "", errors.New("Укажите корректный email")
	}
	if len([]byte(input.Password)) < 8 || len([]byte(input.Password)) > 200 {
		return "", "", errors.New("Пароль должен содержать от 8 до 200 символов")
	}
	if registration {
		if input.Password != input.ConfirmPassword {
			return "", "", errors.New("Пароли не совпадают")
		}
		if !input.PolicyAccepted || input.ConsentVersion == "" {
			return "", "", errors.New("Необходимо согласиться с политикой обработки персональных данных")
		}
		if input.RequestedRole != "student" && input.RequestedRole != "instructor" && input.RequestedRole != "other" {
			return "", "", errors.New("Выберите корректный статус")
		}
		for _, rule := range []struct {
			ok      bool
			message string
		}{{strings.IndexFunc(input.Password, func(r rune) bool { return r >= 'a' && r <= 'z' }) >= 0, "Нужна строчная буква"}, {strings.IndexFunc(input.Password, func(r rune) bool { return r >= 'A' && r <= 'Z' }) >= 0, "Нужна заглавная буква"}, {strings.IndexFunc(input.Password, func(r rune) bool { return r >= '0' && r <= '9' }) >= 0, "Нужна цифра"}, {strings.IndexFunc(input.Password, func(r rune) bool {
			return !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9')
		}) >= 0, "Нужен спецсимвол"}} {
			if !rule.ok {
				return "", "", errors.New(rule.message)
			}
		}
	}
	return email, input.Password, nil
}

func loadUser(ctx context.Context, db *sql.DB, id string) (authUser, error) {
	var user authUser
	err := db.QueryRowContext(ctx, `SELECT id, email, platform_role, locale, must_change_password FROM users WHERE id = $1`, id).Scan(&user.ID, &user.Email, &user.PlatformRole, &user.Locale, &user.MustChangePwd)
	return user, err
}

func createSession(ctx context.Context, db *sql.DB, userID string, w http.ResponseWriter) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := fmt.Sprintf("%x", tokenBytes)
	expiresAt := time.Now().UTC().Add(sessionLifetime)
	if _, err := db.ExecContext(ctx, `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, userID, hashToken(token), expiresAt); err != nil {
		return err
	}
	secure := strings.EqualFold(os.Getenv("APP_ENV"), "production")
	http.SetCookie(w, &http.Cookie{Name: sessionCookieName, Value: token, Path: "/", Expires: expiresAt, MaxAge: int(sessionLifetime.Seconds()), HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
	return nil
}

func authenticatedUser(ctx context.Context, db *sql.DB, req *http.Request) (authUser, bool) {
	cookie, err := req.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return authUser{}, false
	}
	var user authUser
	err = db.QueryRowContext(ctx, `
		SELECT u.id, u.email, u.platform_role, u.locale, u.must_change_password
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`, hashToken(cookie.Value)).Scan(&user.ID, &user.Email, &user.PlatformRole, &user.Locale, &user.MustChangePwd)
	return user, err == nil
}

func authenticatedSuperadmin(ctx context.Context, db *sql.DB, req *http.Request) (authUser, bool) {
	user, ok := authenticatedUser(ctx, db, req)
	return user, ok && user.PlatformRole == "superadmin"
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", sum[:])
}

func expiredSessionCookie() *http.Cookie {
	return &http.Cookie{Name: sessionCookieName, Value: "", Path: "/", MaxAge: -1, Expires: time.Unix(1, 0).UTC(), HttpOnly: true, Secure: strings.EqualFold(os.Getenv("APP_ENV"), "production"), SameSite: http.SameSiteLaxMode}
}

func writeAPIError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, apiError{Code: code, Message: message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
