-- Refresh authored rose materials; preserve IDs, inventory and active selections.
UPDATE avatar_decorations
SET asset_url = regexp_replace(asset_url, '\?v=.*$', '') || '?v=4',
    preview_url = regexp_replace(preview_url, '\?v=.*$', '') || '?v=4',
    description = ''
WHERE slug IN (
    'dark-roses', 'dark-roses-blue', 'dark-roses-black', 'dark-roses-white',
    'dark-roses-yellow', 'dark-roses-orange', 'dark-roses-green',
    'dark-roses-purple', 'dark-roses-pink'
);
