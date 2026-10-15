-- A lunar crescent overlaps the avatar edge rather than using a hollow-ring fit.
-- Versioned URLs invalidate old decoded art while retaining catalog IDs and inventory.
UPDATE avatar_decorations SET render_scale = 1.08,
  asset_url = '/Profile-decorations/Avatar-decorations/' || slug || '.json?v=2',
  preview_url = '/Profile-decorations/Avatar-decorations/' || slug || '.preview.webp?v=2'
WHERE slug IN ('dark-moon-white','dark-moon-red','dark-moon-purple','dark-moon-blue','dark-moon-green','dark-moon-pink');
