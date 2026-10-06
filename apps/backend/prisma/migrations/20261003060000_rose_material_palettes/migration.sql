-- Refresh authored rose materials; preserve IDs, inventory and active selections.
UPDATE avatar_decorations
SET asset_url = regexp_replace(asset_url, '\?v=.*$', '') || '?v=4',
    preview_url = regexp_replace(preview_url, '\?v=.*$', '') || '?v=4',
    description = 'Яркие бархатные розы раскрывают лепестки, держат цветение 5 секунд и снова сворачиваются. Металлическая обводка подобрана под оттенок цветов.'
WHERE slug IN (
    'dark-roses', 'dark-roses-blue', 'dark-roses-black', 'dark-roses-white',
    'dark-roses-yellow', 'dark-roses-orange', 'dark-roses-green',
    'dark-roses-purple', 'dark-roses-pink'
);
