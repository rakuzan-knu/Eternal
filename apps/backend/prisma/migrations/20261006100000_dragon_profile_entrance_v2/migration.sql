-- Replace only dragon entrance media. No ownership, selection or price changes.
UPDATE profile_effects
SET asset_url = regexp_replace(asset_url, '\?v=[0-9]+$', '?v=2'),
    preview_url = regexp_replace(preview_url, '\?v=[0-9]+$', '?v=2'),
    description = ''
WHERE family = 'dragon';
