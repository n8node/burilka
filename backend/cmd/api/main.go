package main

import (
	"context"
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
	if _, err := tx.ExecContext(ctx, `INSERT INTO audit_events (actor_user_id, action, target_type, target_id) VALUES ($1, 'platform.superadmin_bootstrapped', 'user', $1::text)`, id); err != nil {
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
	server := &http.Server{Addr: addr, Handler: r, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	log.Printf("API listening on %s", addr)
	return server.ListenAndServe()
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
