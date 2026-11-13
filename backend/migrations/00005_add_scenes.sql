-- +goose Up
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    scene_type TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'basic',
    preview_url TEXT,
    available_modes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO scenes (slug, name, description, scene_type, difficulty, available_modes, sort_order)
VALUES
 ('classic-rig', 'Классическая буровая установка', 'Изучение устройства и основных процессов классической буровой установки.', 'rig', 'basic', '["anatomy", "demonstration", "guided"]', 10),
 ('robotic-rig', 'Роботизированная буровая установка', 'Знакомство с автоматизированными системами и роботизированными операциями.', 'rig', 'advanced', '["anatomy", "demonstration"]', 20),
 ('circulation-system', 'Циркуляционная система', 'Раствор, насосы, ёмкости, желоба и контроль параметров циркуляции.', 'equipment', 'basic', '["anatomy", "demonstration", "guided"]', 30),
 ('bop-wellhead', 'ПВО и устьевое оборудование', 'Противовыбросовое оборудование и элементы устьевой обвязки.', 'equipment', 'advanced', '["anatomy", "demonstration"]', 40),
 ('hoisting-system', 'Талевая система', 'Мачта, талевый блок, кронблок и спуско-подъёмные операции.', 'equipment', 'basic', '["anatomy", "demonstration", "guided"]', 50),
 ('complex-geology', 'Бурение в сложных геологических условиях', 'Сценарии смены пропластков и изменения параметров бурения.', 'scenario', 'advanced', '["guided", "manual", "complication"]', 60),
 ('emergency-situations', 'Аварийные ситуации', 'Учебные сценарии осложнений, отказов оборудования и аварийных реакций.', 'scenario', 'expert', '["complication", "exam"]', 70)
ON CONFLICT (slug) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS scenes;