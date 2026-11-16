-- +goose Up
-- Link the original role cards to the concrete character GLBs.  The role cards
-- are the stable IDs used by scenarios; the -a/-b entries remain selectable
-- asset variants in the library.
UPDATE library_object_assets a
SET asset_url = CASE o.slug
    WHEN 'crew-driller' THEN '/rig-characters/driller_A.glb'
    WHEN 'crew-assistant-driller' THEN '/rig-characters/helper1_A.glb'
    WHEN 'crew-drilling-engineer' THEN '/rig-characters/master.glb'
    WHEN 'crew-mud-engineer' THEN '/rig-characters/mud_A.glb'
    WHEN 'crew-mechanic' THEN '/rig-characters/mech_A.glb'
    WHEN 'crew-bop-specialist' THEN '/rig-characters/helper_B.glb'
END
FROM library_objects o
WHERE a.object_id = o.id AND a.variant = 'standard'
  AND o.slug IN ('crew-driller','crew-assistant-driller','crew-drilling-engineer','crew-mud-engineer','crew-mechanic','crew-bop-specialist');

INSERT INTO library_objects (slug,name,category,scene_scope,description,metadata,states,skills,status)
VALUES
 ('crew-helper-b','Помбур-наблюдатель (роботизированная БУ)','crew','classic-rig','Наблюдает за роботизированной буровой установкой.','{"role":"robot_floorhand","asset":"helper_B.glb"}','["on_shift","busy","rest","alarm"]','["robotic_rig","safety","observation"]','review'),
 ('crew-mech-b','Механик-наладчик роботов','crew','classic-rig','Настраивает и обслуживает роботизированные узлы.','{"role":"robot_mechanic","asset":"mech_B.glb"}','["on_shift","busy","rest","fault"]','["robotics","diagnostics","repair"]','review')
ON CONFLICT (slug) DO UPDATE SET metadata=EXCLUDED.metadata, description=EXCLUDED.description, states=EXCLUDED.states, skills=EXCLUDED.skills;

INSERT INTO library_object_assets (object_id,variant,asset_url)
SELECT id,'standard',CASE slug
    WHEN 'crew-helper-b' THEN '/rig-characters/helper_B.glb'
    WHEN 'crew-mech-b' THEN '/rig-characters/mech_B.glb'
END
FROM library_objects
WHERE slug IN ('crew-helper-b','crew-mech-b')
ON CONFLICT (object_id,variant) DO UPDATE SET asset_url=EXCLUDED.asset_url;

-- +goose Down
DELETE FROM library_object_assets WHERE object_id IN (SELECT id FROM library_objects WHERE slug IN ('crew-helper-b','crew-mech-b'));
DELETE FROM library_objects WHERE slug IN ('crew-helper-b','crew-mech-b');
UPDATE library_object_assets a SET asset_url=NULL
FROM library_objects o
WHERE a.object_id=o.id AND a.variant='standard'
  AND o.slug IN ('crew-driller','crew-assistant-driller','crew-drilling-engineer','crew-mud-engineer','crew-mechanic','crew-bop-specialist');