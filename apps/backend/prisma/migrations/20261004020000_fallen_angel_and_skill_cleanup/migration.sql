BEGIN;
-- Nine closed, paid wing variants; ownership remains server-controlled.
INSERT INTO avatar_decorations (id,name,slug,description,asset_type,asset_url,preview_url,rarity,price_cents,is_available,render_scale) VALUES
('fallen-angel-amber','Fallen Angel · Orange','fallen-angel-amber','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-amber.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-amber.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-black','Fallen Angel · Black','fallen-angel-black','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-black.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-black.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-crimson','Fallen Angel · Red','fallen-angel-crimson','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-crimson.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-crimson.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-emerald','Fallen Angel · Green','fallen-angel-emerald','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-emerald.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-emerald.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-nightshade','Fallen Angel · Nightshade','fallen-angel-nightshade','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-nightshade.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-nightshade.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-rose','Fallen Angel · Pink','fallen-angel-rose','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-rose.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-rose.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-sky-blue','Fallen Angel · Light Blue','fallen-angel-sky-blue','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-sky-blue.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-sky-blue.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-sunlight','Fallen Angel · Yellow','fallen-angel-sunlight','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-sunlight.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-sunlight.preview.webp?v=1','epic',199,FALSE,1.2),
('fallen-angel-white','Fallen Angel · White','fallen-angel-white','Fallen Wings — объёмные перья раскрываются, крылья плавно взмахивают и складываются вдоль аватара с исходным таймингом Fallen Angel.','animated_webp','/Profile-decorations/Avatar-decorations/fallen-angel-white.webp?v=1','/Profile-decorations/Avatar-decorations/fallen-angel-white.preview.webp?v=1','epic',199,FALSE,1.2);

-- Preserve existing ownership and purchase timestamps when consolidating the duplicate.
-- This transfers only existing Comic Pop inventory; it grants no Fallen Angel items.
INSERT INTO user_decorations (user_id,decoration_id,purchased_at)
SELECT user_id,'skill-issue',purchased_at FROM user_decorations
WHERE decoration_id='skill-issue-comic'
ON CONFLICT (user_id,decoration_id) DO NOTHING;
UPDATE "User" SET active_decoration_id='skill-issue'
WHERE active_decoration_id='skill-issue-comic';
DELETE FROM user_decorations WHERE decoration_id='skill-issue-comic';
DELETE FROM avatar_decorations WHERE id='skill-issue-comic';
COMMIT;
