-- +goose Up
UPDATE library_object_assets a SET asset_url = CASE o.slug
    WHEN 'bop-main' THEN '/rig-glb/01_classic_rig/bop.glb'
    WHEN 'drawworks-main' THEN '/rig-glb/01_classic_rig/drawworks.glb'
    WHEN 'top-drive-main' THEN '/rig-glb/01_classic_rig/topdrive.glb'
    WHEN 'mud-pump-01' THEN '/rig-glb/01_classic_rig/mudpumps.glb'
    WHEN 'shale-shaker-01' THEN '/rig-glb/01_classic_rig/shakers.glb'
    WHEN 'hoisting-system-main' THEN '/rig-glb/01_classic_rig/travel.glb'
    WHEN 'mud-tank-01' THEN '/rig-glb/01_classic_rig/tanks.glb'
    WHEN 'environment-steppe' THEN '/rig-glb/01_classic_rig/substructure.glb'
    WHEN 'camp-living-module' THEN '/rig-glb/03_camp/living.glb'
    WHEN 'camp-canteen' THEN '/rig-glb/03_camp/canteen.glb'
    WHEN 'camp-workshop' THEN '/rig-glb/01_classic_rig/compressor.glb'
    WHEN 'camp-power' THEN '/rig-glb/03_camp/power.glb'
    WHEN 'vehicle-crane' THEN '/rig-glb/03_camp/vehicles.glb'
    WHEN 'vehicle-pipe-carrier' THEN '/rig-glb/03_camp/vehicles.glb'
    WHEN 'vehicle-supply-truck' THEN '/rig-glb/03_camp/vehicles.glb'
    WHEN 'vehicle-snowmobile' THEN '/rig-glb/03_camp/vehicles.glb'
    ELSE NULL END
FROM library_objects o WHERE a.object_id = o.id AND a.variant IN ('preview','standard');

-- +goose Down
UPDATE library_object_assets SET asset_url = NULL WHERE asset_url LIKE '/rig-glb/%';