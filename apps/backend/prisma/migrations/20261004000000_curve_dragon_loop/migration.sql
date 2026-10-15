-- Replace presentation of the seven existing owned decorations with true
-- Curve-deformed five-second flight. IDs, inventory and paid sale policy survive.
UPDATE avatar_decorations
SET asset_url = '/Profile-decorations/Avatar-decorations/' || slug || '.webp?v=6',
    preview_url = '/Profile-decorations/Avatar-decorations/' || slug || '.preview.webp?v=6',
    render_scale = 1.7,
    description = ''
WHERE slug IN ('dragon-black','dragon-blue','dragon-gold','dragon-silver',
               'dragon-red','dragon-green','dragon-purple');
