-- Real artist-mesh renders replace the old painted dragon flight assets.
-- Existing IDs, purchases, active selections, prices and sale availability survive.
UPDATE avatar_decorations
SET asset_type = 'animated_webp',
    asset_url = '/Profile-decorations/Avatar-decorations/' || slug || '.webp?v=5',
    preview_url = '/Profile-decorations/Avatar-decorations/' || slug || '.preview.webp?v=5',
    render_scale = 1.43,
    description = 'Объёмный дракон с выразительным лицом пролетает через аватар, наклоняет тело и реагирует хвостом и усами на инерцию. Резная китайская рамка неподвижна. Между полётами — 5 секунд.'
WHERE slug IN ('dragon-black','dragon-blue','dragon-gold','dragon-silver',
               'dragon-red','dragon-green','dragon-purple');
