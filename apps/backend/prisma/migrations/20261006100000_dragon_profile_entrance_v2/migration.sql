-- Replace only dragon entrance media. No ownership, selection or price changes.
UPDATE profile_effects
SET asset_url = regexp_replace(asset_url, '\?v=[0-9]+$', '?v=2'),
    preview_url = regexp_replace(preview_url, '\?v=[0-9]+$', '?v=2'),
    description = 'Китайский дракон плавно появляется у аватара, проходит через профиль и ускоряется на выходе. Голова и корпус сохраняют форму, хвост мягко следует за поворотом.'
WHERE family = 'dragon';
