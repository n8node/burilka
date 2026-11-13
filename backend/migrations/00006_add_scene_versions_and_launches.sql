-- +goose Up
CREATE TABLE IF NOT EXISTS scene_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    asset_url TEXT,
    manifest_url TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scene_id, version)
);

INSERT INTO scene_versions (scene_id, version, status)
SELECT id, 1, 'published' FROM scenes
ON CONFLICT (scene_id, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS scene_launches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE RESTRICT,
    scene_version_id UUID NOT NULL REFERENCES scene_versions(id) ON DELETE RESTRICT,
    mode TEXT NOT NULL DEFAULT 'anatomy',
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS scene_launches_user_started_idx ON scene_launches (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS scene_launches_scene_idx ON scene_launches (scene_id, started_at DESC);

-- +goose Down
DROP TABLE IF EXISTS scene_launches;
DROP TABLE IF EXISTS scene_versions;