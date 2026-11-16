-- +goose Up
INSERT INTO library_objects (slug,name,category,scene_scope,description,metadata,states,skills,status)
VALUES
 ('crew-driller-a','Бурильщик — модель A','crew','classic-rig','Рабочий персонаж для кабины и пульта бурильщика.','{"role":"driller","asset":"driller_A.glb"}','["on_shift","busy","rest","stressed"]','["hoisting","rotation","bop","procedure"]','review'),
 ('crew-helper1-a','Помощник бурильщика — модель A','crew','classic-rig','Помощник бурильщика на рабочей площадке.','{"role":"assistant_driller","asset":"helper1_A.glb"}','["on_shift","busy","rest"]','["pipe_handling","procedure","safety"]','review'),
 ('crew-helper2-a','Помощник бурильщика 2 — модель A','crew','classic-rig','Второй помощник бурильщика.','{"role":"assistant_driller","asset":"helper2_A.glb"}','["on_shift","busy","rest"]','["pipe_handling","procedure","safety"]','review'),
 ('crew-derrick-a','Верховой рабочий','crew','classic-rig','Рабочий на балконе и в зоне подсвечника.','{"role":"derrickman","asset":"derrick_A.glb"}','["on_shift","busy","rest","stressed"]','["pipe_handling","height_work","safety"]','review'),
 ('crew-mechanic-a','Слесарь-дизелист','crew','classic-rig','Механик энергетического и бурового оборудования.','{"role":"mechanic","asset":"mech_A.glb"}','["on_shift","busy","rest","fatigued"]','["maintenance","diagnostics","repair"]','review'),
 ('crew-mud-a','Помбур на ЦСГО','crew','classic-rig','Растворщик, работающий с циркуляционной системой.','{"role":"mud_engineer","asset":"mud_A.glb"}','["on_shift","busy","rest"]','["mud","circulation","analysis"]','review'),
 ('crew-electric-a','Электромонтёр','crew','classic-rig','Специалист по электрике и ЧРП.','{"role":"electrician","asset":"electric_A.glb"}','["on_shift","busy","rest","fault"]','["electrical","diagnostics","safety"]','review'),
 ('crew-master','Буровой мастер','crew','classic-rig','Руководитель смены и ответственный за организацию работ.','{"role":"master","asset":"master.glb"}','["on_shift","busy","rest","stressed"]','["supervision","procedure","safety"]','review'),
 ('crew-gti','Оператор станции ГТИ','crew','classic-rig','Оператор станции геолого-технологических исследований.','{"role":"gti_operator","asset":"gti.glb"}','["on_shift","busy","rest"]','["parameters","analysis","reporting"]','review'),
 ('crew-shift-1','Сменная вахта 1','crew','classic-rig','Группа персонажей для фоновых и сценарных сменных операций.','{"role":"shift","asset":"shift1.glb"}','["on_shift","rest","moving"]','["teamwork","safety"]','review'),
 ('crew-shift-2','Сменная вахта 2','crew','classic-rig','Группа персонажей второй смены.','{"role":"shift","asset":"shift2.glb"}','["on_shift","rest","moving"]','["teamwork","safety"]','review'),
 ('crew-cook','Повар','crew','classic-rig','Персонаж вахтового городка.','{"role":"cook","asset":"cook.glb"}','["working","rest"]','["camp_service"]','review')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO library_object_assets (object_id,variant,asset_url)
SELECT id,'standard',CASE metadata->>'asset'
 WHEN 'driller_A.glb' THEN '/rig-characters/driller_A.glb'
 WHEN 'helper1_A.glb' THEN '/rig-characters/helper1_A.glb'
 WHEN 'helper2_A.glb' THEN '/rig-characters/helper2_A.glb'
 WHEN 'derrick_A.glb' THEN '/rig-characters/derrick_A.glb'
 WHEN 'mech_A.glb' THEN '/rig-characters/mech_A.glb'
 WHEN 'mud_A.glb' THEN '/rig-characters/mud_A.glb'
 WHEN 'electric_A.glb' THEN '/rig-characters/electric_A.glb'
 WHEN 'master.glb' THEN '/rig-characters/master.glb'
 WHEN 'gti.glb' THEN '/rig-characters/gti.glb'
 WHEN 'shift1.glb' THEN '/rig-characters/shift1.glb'
 WHEN 'shift2.glb' THEN '/rig-characters/shift2.glb'
 WHEN 'cook.glb' THEN '/rig-characters/cook.glb' END
FROM library_objects WHERE category='crew' AND metadata ? 'asset'
ON CONFLICT (object_id,variant) DO UPDATE SET asset_url=EXCLUDED.asset_url;

-- +goose Down
DELETE FROM library_object_assets WHERE object_id IN (SELECT id FROM library_objects WHERE slug LIKE 'crew-%-a' OR slug IN ('crew-master','crew-gti','crew-shift-1','crew-shift-2','crew-cook'));
DELETE FROM library_objects WHERE slug LIKE 'crew-%-a' OR slug IN ('crew-master','crew-gti','crew-shift-1','crew-shift-2','crew-cook');