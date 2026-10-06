-- Replace presentation of the seven existing owned decorations with true
-- Curve-deformed five-second flight. IDs, inventory and paid sale policy survive.
UPDATE avatar_decorations
SET asset_url = '/Profile-decorations/Avatar-decorations/' || slug || '.webp?v=6',
    preview_url = '/Profile-decorations/Avatar-decorations/' || slug || '.preview.webp?v=6',
    render_scale = 1.7,
    description = 'Дракон извивается вокруг аватара и ныряет за резную рамку. Хвост, лапы и усы плавно следуют за движением, а выразительные глаза моргают.'
WHERE slug IN ('dragon-black','dragon-blue','dragon-gold','dragon-silver',
               'dragon-red','dragon-green','dragon-purple');
