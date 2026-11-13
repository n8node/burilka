-- +goose Up
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT universities_name_unique UNIQUE (name)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS universities_active_name_idx ON universities (is_active, name);
CREATE INDEX IF NOT EXISTS users_university_id_idx ON users (university_id);

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS university_id;
DROP TABLE IF EXISTS universities;