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
	"strconv"
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
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	ShortName   string    `json:"short_name,omitempty"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	Students    int       `json:"students"`
	Instructors int       `json:"instructors"`
}

type universityRequest struct {
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
}

type adminUser struct {
	ID                 string    `json:"id"`
	Email              string    `json:"email"`
	PlatformRole       string    `json:"platform_role"`
	RequestedRole      string    `json:"requested_role"`
	Locale             string    `json:"locale"`
	UniversityID       *string   `json:"university_id,omitempty"`
	UniversityName     string    `json:"university_name,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	MustChangePassword bool      `json:"must_change_password"`
}

type scene struct {
	ID             string          `json:"id"`
	Slug           string          `json:"slug"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	SceneType      string          `json:"scene_type"`
	Difficulty     string          `json:"difficulty"`
	PreviewURL     *string         `json:"preview_url,omitempty"`
	AvailableModes json.RawMessage `json:"available_modes"`
	IsPublished    bool            `json:"is_published"`
	SortOrder      int             `json:"sort_order"`
}

type sceneLaunch struct {
	ID        string    `json:"id"`
	Scene     scene     `json:"scene"`
	Mode      string    `json:"mode"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"started_at"`
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
	r.Put("/api/v1/admin/universities/{id}", adminUpdateUniversityHandler)
	r.Delete("/api/v1/admin/universities/{id}", adminDeleteUniversityHandler)
	r.Get("/api/v1/admin/users", adminListUsersHandler)
	r.Get("/api/v1/scenes", listScenesHandler)
	r.Get("/api/v1/scenes/last-launch", lastLaunchHandler)
	r.Get("/api/v1/scenes/{slug}", getSceneHandler)
	r.Post("/api/v1/scenes/{slug}/launch", launchSceneHandler)
	r.Get("/api/v1/admin/scenes", adminListScenesHandler)
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
	rows, err := db.QueryContext(req.Context(), `SELECT u.id, u.name, COALESCE(u.short_name, ''), u.is_active, u.created_at, COUNT(*) FILTER (WHERE us.requested_role = 'student'), COUNT(*) FILTER (WHERE us.requested_role = 'instructor') FROM universities u LEFT JOIN users us ON us.university_id = u.id WHERE u.is_active = TRUE GROUP BY u.id ORDER BY u.name`)
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
	sort := req.URL.Query().Get("sort")
	order := "u.name ASC"
	switch sort {
	case "date_asc":
		order = "u.created_at ASC"
	case "date_desc":
		order = "u.created_at DESC"
	case "students":
		order = "students DESC, u.name ASC"
	case "instructors":
		order = "instructors DESC, u.name ASC"
	case "name_desc":
		order = "u.name DESC"
	}
	search := strings.TrimSpace(req.URL.Query().Get("q"))
	rows, err := db.QueryContext(ctx, `SELECT u.id, u.name, COALESCE(u.short_name, ''), u.is_active, u.created_at, COUNT(*) FILTER (WHERE us.requested_role = 'student'), COUNT(*) FILTER (WHERE us.requested_role = 'instructor') FROM universities u LEFT JOIN users us ON us.university_id = u.id WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR COALESCE(u.short_name, '') ILIKE '%' || $1 || '%') GROUP BY u.id ORDER BY `+order, search)
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
	err = db.QueryRowContext(ctx, `INSERT INTO universities (name, short_name) VALUES ($1, NULLIF($2, '')) RETURNING id, name, COALESCE(short_name, ''), is_active, created_at`, name, shortName).Scan(&item.ID, &item.Name, &item.ShortName, &item.IsActive, &item.CreatedAt)
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

func adminUpdateUniversityHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, 403, "forbidden", "Недостаточно прав")
		return
	}
	var input universityRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 16<<10)).Decode(&input); err != nil {
		writeAPIError(w, 400, "invalid_request", "Некорректные данные")
		return
	}
	name := strings.TrimSpace(input.Name)
	shortName := strings.TrimSpace(input.ShortName)
	if len([]rune(name)) < 2 || len([]rune(name)) > 300 {
		writeAPIError(w, 400, "invalid_name", "Название ВУЗа должно содержать от 2 до 300 символов")
		return
	}
	var item university
	err = db.QueryRowContext(ctx, `UPDATE universities SET name=$1, short_name=NULLIF($2,''), updated_at=now() WHERE id=$3 RETURNING id,name,COALESCE(short_name,''),is_active,created_at`, name, shortName, chi.URLParam(req, "id")).Scan(&item.ID, &item.Name, &item.ShortName, &item.IsActive, &item.CreatedAt)
	if err != nil {
		writeAPIError(w, 404, "not_found", "ВУЗ не найден")
		return
	}
	writeJSON(w, 200, item)
}

func adminDeleteUniversityHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, 403, "forbidden", "Недостаточно прав")
		return
	}
	result, err := db.ExecContext(ctx, `UPDATE universities SET is_active=FALSE, updated_at=now() WHERE id=$1 AND is_active=TRUE`, chi.URLParam(req, "id"))
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeAPIError(w, 404, "not_found", "ВУЗ не найден или уже удалён")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

func adminListUsersHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, 403, "forbidden", "Недостаточно прав")
		return
	}
	q := strings.TrimSpace(req.URL.Query().Get("q"))
	requestedRole := strings.TrimSpace(req.URL.Query().Get("requested_role"))
	platformRole := strings.TrimSpace(req.URL.Query().Get("platform_role"))
	limit, offset := 50, 0
	if value := req.URL.Query().Get("limit"); value != "" {
		if parsed, e := strconv.Atoi(value); e == nil && parsed >= 1 && parsed <= 100 {
			limit = parsed
		}
	}
	if value := req.URL.Query().Get("offset"); value != "" {
		if parsed, e := strconv.Atoi(value); e == nil && parsed >= 0 {
			offset = parsed
		}
	}
	sortColumn := "u.created_at"
	switch req.URL.Query().Get("sort") {
	case "email":
		sortColumn = "u.email"
	case "requested_role":
		sortColumn = "u.requested_role"
	case "university":
		sortColumn = "university_name"
	}
	order := "DESC"
	if strings.EqualFold(req.URL.Query().Get("order"), "asc") {
		order = "ASC"
	}
	where := `WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR u.id::text ILIKE '%' || $1 || '%') AND ($2 = '' OR u.requested_role = $2) AND ($3 = '' OR u.platform_role = $3)`
	baseArgs := []any{q, requestedRole, platformRole}
	var total int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users u `+where, baseArgs...).Scan(&total); err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	args := append(baseArgs, limit, offset)
	rows, err := db.QueryContext(ctx, `SELECT u.id,u.email,u.platform_role,u.requested_role,u.locale,u.university_id,COALESCE(v.name,''),u.created_at,u.must_change_password FROM users u LEFT JOIN universities v ON v.id=u.university_id `+where+` ORDER BY `+sortColumn+` `+order+` NULLS LAST LIMIT $4 OFFSET $5`, args...)
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer rows.Close()
	items := make([]adminUser, 0)
	for rows.Next() {
		var item adminUser
		if err := rows.Scan(&item.ID, &item.Email, &item.PlatformRole, &item.RequestedRole, &item.Locale, &item.UniversityID, &item.UniversityName, &item.CreatedAt, &item.MustChangePassword); err != nil {
			writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, 200, map[string]any{"users": items, "total": total, "limit": limit, "offset": offset})
}

func listScenesHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	rows, err := db.QueryContext(req.Context(), `SELECT id,slug,name,description,scene_type,difficulty,preview_url,available_modes,is_published,sort_order FROM scenes WHERE is_published=TRUE ORDER BY sort_order,name`)
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer rows.Close()
	items, err := scanScenes(rows)
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, 200, map[string]any{"scenes": items})
}

func getSceneHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	item, err := queryScene(req.Context(), db, chi.URLParam(req, "slug"), false)
	if err != nil {
		writeAPIError(w, 404, "scene_not_found", "Сцена не найдена")
		return
	}
	writeJSON(w, 200, item)
}

func launchSceneHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	user, ok := authenticatedUser(ctx, db, req)
	if !ok {
		writeAPIError(w, 401, "unauthorized", "Требуется вход в систему")
		return
	}
	item, err := queryScene(ctx, db, chi.URLParam(req, "slug"), false)
	if err != nil {
		writeAPIError(w, 404, "scene_not_found", "Сцена не найдена")
		return
	}
	mode := strings.TrimSpace(req.URL.Query().Get("mode"))
	if mode == "" {
		mode = "anatomy"
	}
	var launch sceneLaunch
	err = db.QueryRowContext(ctx, `INSERT INTO scene_launches (user_id,scene_id,scene_version_id,mode) SELECT $1,$2,id,$3 FROM scene_versions WHERE scene_id=$2 AND status='published' ORDER BY version DESC LIMIT 1 RETURNING id,started_at`, user.ID, item.ID, mode).Scan(&launch.ID, &launch.StartedAt)
	if err != nil {
		writeAPIError(w, 500, "launch_error", "Не удалось запустить сцену")
		return
	}
	launch.Scene = item
	launch.Mode = mode
	launch.Status = "started"
	writeJSON(w, 201, launch)
}

func lastLaunchHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	user, ok := authenticatedUser(ctx, db, req)
	if !ok {
		writeAPIError(w, 401, "unauthorized", "Требуется вход в систему")
		return
	}
	var launch sceneLaunch
	err = db.QueryRowContext(ctx, `SELECT l.id,l.mode,l.status,l.started_at,s.id,s.slug,s.name,s.description,s.scene_type,s.difficulty,s.preview_url,s.available_modes,s.is_published,s.sort_order FROM scene_launches l JOIN scenes s ON s.id=l.scene_id WHERE l.user_id=$1 ORDER BY l.started_at DESC LIMIT 1`, user.ID).Scan(&launch.ID, &launch.Mode, &launch.Status, &launch.StartedAt, &launch.Scene.ID, &launch.Scene.Slug, &launch.Scene.Name, &launch.Scene.Description, &launch.Scene.SceneType, &launch.Scene.Difficulty, &launch.Scene.PreviewURL, &launch.Scene.AvailableModes, &launch.Scene.IsPublished, &launch.Scene.SortOrder)
	if err == sql.ErrNoRows {
		writeJSON(w, 200, map[string]any{"launch": nil})
		return
	}
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, 200, map[string]any{"launch": launch})
}

func queryScene(ctx context.Context, db *sql.DB, slug string, admin bool) (scene, error) {
	query := `SELECT id,slug,name,description,scene_type,difficulty,preview_url,available_modes,is_published,sort_order FROM scenes WHERE slug=$1`
	if !admin {
		query += ` AND is_published=TRUE`
	}
	var item scene
	err := db.QueryRowContext(ctx, query, slug).Scan(&item.ID, &item.Slug, &item.Name, &item.Description, &item.SceneType, &item.Difficulty, &item.PreviewURL, &item.AvailableModes, &item.IsPublished, &item.SortOrder)
	return item, err
}

func adminListScenesHandler(w http.ResponseWriter, req *http.Request) {
	db, err := openDB()
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(req.Context(), 5*time.Second)
	defer cancel()
	if _, ok := authenticatedSuperadmin(ctx, db, req); !ok {
		writeAPIError(w, 403, "forbidden", "Недостаточно прав")
		return
	}
	rows, err := db.QueryContext(ctx, `SELECT id,slug,name,description,scene_type,difficulty,preview_url,available_modes,is_published,sort_order FROM scenes ORDER BY sort_order,name`)
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	defer rows.Close()
	items, err := scanScenes(rows)
	if err != nil {
		writeAPIError(w, 500, "database_error", "Временная ошибка сервера")
		return
	}
	writeJSON(w, 200, map[string]any{"scenes": items})
}

func scanScenes(rows *sql.Rows) ([]scene, error) {
	items := make([]scene, 0)
	for rows.Next() {
		var item scene
		if err := rows.Scan(&item.ID, &item.Slug, &item.Name, &item.Description, &item.SceneType, &item.Difficulty, &item.PreviewURL, &item.AvailableModes, &item.IsPublished, &item.SortOrder); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanUniversities(rows *sql.Rows) ([]university, error) {
	items := make([]university, 0)
	for rows.Next() {
		var item university
		if err := rows.Scan(&item.ID, &item.Name, &item.ShortName, &item.IsActive, &item.CreatedAt, &item.Students, &item.Instructors); err != nil {
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
