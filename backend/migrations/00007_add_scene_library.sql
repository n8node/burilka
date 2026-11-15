-- +goose Up
CREATE TABLE IF NOT EXISTS library_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('aggregate','environment','building','vehicle','crew')),
    scene_scope TEXT NOT NULL DEFAULT 'classic-rig',
    description TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    states JSONB NOT NULL DEFAULT '[]'::jsonb,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_object_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID NOT NULL REFERENCES library_objects(id) ON DELETE CASCADE,
    variant TEXT NOT NULL CHECK (variant IN ('preview','standard','detailed','interior')),
    asset_url TEXT,
    checksum TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (object_id, variant)
);

CREATE INDEX IF NOT EXISTS library_objects_category_idx ON library_objects (category, scene_scope, status);
CREATE INDEX IF NOT EXISTS library_assets_object_idx ON library_object_assets (object_id);

INSERT INTO library_objects (slug,name,category,scene_scope,description,metadata,states,skills,status)
VALUES
 ('classic-rig-main','Классическая буровая установка','aggregate','classic-rig','Основная компоновка классической буровой установки.','{"systems":["hoisting","rotation","circulation","bop"]}','["assembled","operational","maintenance"]','[]','review'),
 ('drawworks-main','Буровая лебёдка','aggregate','classic-rig','Лебёдка для спуско-подъёмных операций.','{"system":"hoisting","parameters":["hook_load","speed"]}','["stopped","running","fault"]','[]','draft'),
 ('top-drive-main','Верхний привод','aggregate','classic-rig','Привод вращения бурильной колонны.','{"system":"rotation","parameters":["rpm","torque"]}','["stopped","running","overload"]','[]','draft'),
 ('bop-main','ПВО и устьевое оборудование','aggregate','classic-rig','Комплекс герметизации устья и контроля проявлений.','{"system":"well_control","components":["ram","annular","accumulator","choke_manifold"]}','["open","closed","partial","fault"]','[]','review'),
 ('mud-pump-01','Буровой насос','aggregate','classic-rig','Насос циркуляционной системы бурового раствора.','{"system":"circulation","parameters":["pressure","flow","rpm"]}','["stopped","running","overload","fault"]','[]','draft'),
 ('shale-shaker-01','Вибросито','aggregate','classic-rig','Первичная очистка бурового раствора от шлама.','{"system":"solids_control"}','["stopped","running","blocked"]','[]','draft'),
 ('hoisting-system-main','Талевая система','aggregate','classic-rig','Мачта, кронблок, талевый блок и оснастка.','{"system":"hoisting"}','["assembled","operational","maintenance"]','[]','draft'),
 ('mud-tank-01','Ёмкость бурового раствора','aggregate','classic-rig','Ёмкость хранения и контроля уровня раствора.','{"system":"circulation","parameters":["volume","density"]}','["empty","filling","operational","overflow"]','[]','draft'),
 ('environment-steppe','Степная площадка','environment','classic-rig','Сухая наземная площадка для базового обучения.','{"weather_profile":"steppe","marine":false}','["day","night","wind","dust"]','[]','published'),
 ('environment-arctic','Арктическая площадка','environment','classic-rig','Холодная наземная площадка с ветром и снегом.','{"weather_profile":"arctic","marine":false}','["day","night","wind","snow","low_temperature"]','[]','draft'),
 ('environment-mountain','Горная площадка','environment','classic-rig','Наземная площадка на горном рельефе.','{"weather_profile":"mountain","marine":false}','["day","night","wind","fog"]','[]','draft'),
 ('camp-living-module','Жилой модуль','building','classic-rig','Жилой модуль вахтового городка.','{"function":"living"}','["available","occupied","maintenance"]','[]','draft'),
 ('camp-canteen','Столовая','building','classic-rig','Столовая вахтового городка.','{"function":"canteen"}','["open","closed"]','[]','draft'),
 ('camp-workshop','Ремонтная мастерская','building','classic-rig','Мастерская для обслуживания оборудования.','{"function":"maintenance"}','["open","closed","busy"]','[]','draft'),
 ('camp-lab','Лаборатория раствора','building','classic-rig','Лаборатория контроля параметров бурового раствора.','{"function":"mud_lab"}','["open","closed","busy"]','[]','draft'),
 ('camp-power','Электростанция','building','classic-rig','Энергетический модуль площадки.','{"function":"power"}','["running","backup","fault"]','[]','draft'),
 ('vehicle-crane','Автокран','vehicle','classic-rig','Кран для монтажных и логистических операций.','{"capacity_tons":25,"marine":false}','["parked","moving","lifting"]','[]','draft'),
 ('vehicle-pipe-carrier','Трубовоз','vehicle','classic-rig','Транспорт для доставки труб.','{"capacity_tons":20,"marine":false}','["parked","moving","loading"]','[]','draft'),
 ('vehicle-supply-truck','Грузовой автомобиль','vehicle','classic-rig','Грузовой транспорт площадки.','{"marine":false}','["parked","moving","loading"]','[]','draft'),
 ('vehicle-snowmobile','Вездеход','vehicle','classic-rig','Вездеход для сложных наземных условий.','{"terrain":["arctic","mountain"],"marine":false}','["parked","moving"]','[]','draft'),
 ('crew-driller','Бурильщик','crew','classic-rig','Оператор пульта и основных буровых операций.','{"role":"driller"}','["on_shift","busy","rest","stressed"]','["hoisting","rotation","bop","procedure"]','draft'),
 ('crew-assistant-driller','Помощник бурильщика','crew','classic-rig','Помощник бурильщика на полу буровой.','{"role":"assistant_driller"}','["on_shift","busy","rest"]','["pipe_handling","procedure","safety"]','draft'),
 ('crew-drilling-engineer','Инженер по бурению','crew','classic-rig','Контролирует технологические параметры и режимы бурения.','{"role":"drilling_engineer"}','["on_shift","busy","rest"]','["parameters","analysis","procedure"]','draft'),
 ('crew-mud-engineer','Инженер по растворам','crew','classic-rig','Контролирует свойства и циркуляцию раствора.','{"role":"mud_engineer"}','["on_shift","busy","rest"]','["mud","circulation","analysis"]','draft'),
 ('crew-mechanic','Механик','crew','classic-rig','Обслуживает и ремонтирует оборудование.','{"role":"mechanic"}','["on_shift","busy","rest","fatigued"]','["maintenance","diagnostics","repair"]','draft'),
 ('crew-bop-specialist','Специалист по ПВО','crew','classic-rig','Контролирует барьеры и действия при проявлениях.','{"role":"bop_specialist"}','["on_shift","busy","rest","stressed"]','["bop","well_control","safety"]','draft')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO library_object_assets (object_id,variant)
SELECT id, variant FROM library_objects CROSS JOIN (VALUES ('preview'),('standard'),('detailed'),('interior')) AS variants(variant)
ON CONFLICT (object_id,variant) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS library_object_assets;
DROP TABLE IF EXISTS library_objects;