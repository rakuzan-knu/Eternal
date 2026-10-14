-- Revised hood and one closed crystal decoration; no inventory grants.
UPDATE avatar_decorations SET description='',asset_url='/Profile-decorations/Avatar-decorations/cipher-hood.webp?v=2',preview_url='/Profile-decorations/Avatar-decorations/cipher-hood.preview.webp?v=2',render_scale=1.775 WHERE slug='cipher-hood';
INSERT INTO avatar_decorations (id,name,slug,description,asset_type,asset_url,preview_url,rarity,price_cents,is_available,render_scale) VALUES
('plumbob-crystal','Plumbob · Emerald','plumbob-crystal','','animated_webp','/Profile-decorations/Avatar-decorations/plumbob-crystal.webp?v=1','/Profile-decorations/Avatar-decorations/plumbob-crystal.preview.webp?v=1','epic',199,FALSE,1.775);
