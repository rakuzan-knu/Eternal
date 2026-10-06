-- Retire the procedural free item before removing its inventory (ownership FK).
UPDATE "User" SET active_decoration_id = NULL WHERE active_decoration_id = 'cyber-neon-pulse';
DELETE FROM user_decorations WHERE decoration_id = 'cyber-neon-pulse';
DELETE FROM avatar_decorations WHERE id = 'cyber-neon-pulse';

ALTER TABLE avatar_decorations ADD COLUMN render_scale DOUBLE PRECISION NOT NULL DEFAULT 1.2;
ALTER TABLE avatar_decorations ADD CONSTRAINT avatar_decorations_render_scale CHECK (render_scale > 0 AND render_scale <= 2);

-- Listed for preview; is_available controls sale availability, never ownership.
UPDATE avatar_decorations SET price_cents = 199, is_available = FALSE,
  asset_type = 'lottie',
  asset_url = '/Profile-decorations/Avatar-decorations/' || slug || '.json'
WHERE slug IN ('astral-sigil', 'obsidian-crown', 'ronin-orbit');
UPDATE avatar_decorations SET render_scale = 1.58,
  description = 'Светлая резная печать: четыре острия плавно входят к центру и возвращаются обратно.'
WHERE slug = 'astral-sigil';
UPDATE avatar_decorations SET render_scale = 1.36,
  description = 'Чёрный готический орнамент вращается вокруг аватара. Четыре креста остаются неподвижными.'
WHERE slug = 'obsidian-crown';
UPDATE avatar_decorations SET render_scale = 1.2,
  description = 'Кольцо исходных каллиграфических символов вращается на 360°. На светлой теме символы становятся чёрными.'
WHERE slug = 'ronin-orbit';
