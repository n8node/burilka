-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role TEXT NOT NULL DEFAULT 'other' CHECK (requested_role IN ('student', 'instructor', 'other'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS policy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS policy_consent_version TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS policy_consent_version;
ALTER TABLE users DROP COLUMN IF EXISTS policy_accepted_at;
ALTER TABLE users DROP COLUMN IF EXISTS requested_role;