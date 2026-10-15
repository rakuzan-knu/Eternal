-- Future custom frames start at $1.99 with sales closed.
ALTER TABLE avatar_decorations ALTER COLUMN price_cents SET DEFAULT 199;
ALTER TABLE avatar_decorations ALTER COLUMN is_available SET DEFAULT FALSE;
-- Fit the original calligraphy's inner radius to the portrait edge.
UPDATE avatar_decorations SET render_scale = 1.32 WHERE slug = 'ronin-orbit';
