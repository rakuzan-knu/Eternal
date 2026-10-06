-- Independent paid nameplate catalog and ownership. No public grants.
CREATE TYPE "NameplateAssetType" AS ENUM ('video');
CREATE TABLE nameplates (
 id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,name TEXT NOT NULL,description TEXT NOT NULL,
 asset_type "NameplateAssetType" NOT NULL DEFAULT 'video',asset_url TEXT NOT NULL,preview_url TEXT NOT NULL,
 width INTEGER NOT NULL DEFAULT 640,height INTEGER NOT NULL DEFAULT 112,fps DOUBLE PRECISION NOT NULL,
 duration_ms INTEGER NOT NULL,shade_opacity DOUBLE PRECISION NOT NULL DEFAULT 0.5,
 rarity "DecorationRarity" NOT NULL DEFAULT 'epic',price_cents INTEGER NOT NULL DEFAULT 199,is_available BOOLEAN NOT NULL DEFAULT FALSE,
 CONSTRAINT nameplates_media_check CHECK (width>0 AND height>0 AND fps>0 AND duration_ms>0 AND shade_opacity BETWEEN 0 AND 0.75 AND price_cents>=0)
);
CREATE TABLE user_nameplates (
 user_id TEXT NOT NULL,nameplate_id TEXT NOT NULL,purchased_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,nameplate_id),
 FOREIGN KEY(user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY(nameplate_id) REFERENCES nameplates(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX user_nameplates_nameplate_id_idx ON user_nameplates(nameplate_id);
ALTER TABLE "User" ADD COLUMN active_nameplate_id TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_active_nameplate_id_fkey" FOREIGN KEY(active_nameplate_id) REFERENCES nameplates(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_active_nameplate_owned_fkey" FOREIGN KEY(id,active_nameplate_id) REFERENCES user_nameplates(user_id,nameplate_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "User_active_nameplate_id_idx" ON "User"(active_nameplate_id);
INSERT INTO nameplates (id,slug,name,description,asset_type,asset_url,preview_url,width,height,fps,duration_ms,shade_opacity,rarity,price_cents,is_available) VALUES
('nameplate-glowing-sky','nameplate-glowing-sky','Glowing Sky','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-glowing-sky.mp4?v=1','/Profile-decorations/Nameplates/nameplate-glowing-sky.preview.webp?v=1',640,112,10,1500,0.58,'epic',199,FALSE),
('nameplate-meteor-sky','nameplate-meteor-sky','Meteor Sky','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-meteor-sky.mp4?v=1','/Profile-decorations/Nameplates/nameplate-meteor-sky.preview.webp?v=1',640,112,20,1500,0.58,'epic',199,FALSE),
('nameplate-purple-stars','nameplate-purple-stars','Purple Stars','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-purple-stars.mp4?v=1','/Profile-decorations/Nameplates/nameplate-purple-stars.preview.webp?v=1',640,112,33.333333333333336,1170,0.58,'epic',199,FALSE),
('nameplate-rain-japan','nameplate-rain-japan','Rain Garden','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-rain-japan.mp4?v=1','/Profile-decorations/Nameplates/nameplate-rain-japan.preview.webp?v=1',640,112,11.11111111111111,1440,0.58,'epic',199,FALSE),
('nameplate-rain-japan2','nameplate-rain-japan2','Rain Reflections','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-rain-japan2.mp4?v=1','/Profile-decorations/Nameplates/nameplate-rain-japan2.preview.webp?v=1',640,112,10,900,0.58,'epic',199,FALSE),
('nameplate-rolling-hills-cloudy-sky-landscape','nameplate-rolling-hills-cloudy-sky-landscape','Rolling Hills','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-rolling-hills-cloudy-sky-landscape.mp4?v=1','/Profile-decorations/Nameplates/nameplate-rolling-hills-cloudy-sky-landscape.preview.webp?v=1',640,112,12,11500,0.58,'epic',199,FALSE),
('nameplate-sakura-japan','nameplate-sakura-japan','Sakura Window','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-sakura-japan.mp4?v=1','/Profile-decorations/Nameplates/nameplate-sakura-japan.preview.webp?v=1',640,112,10,1100,0.58,'epic',199,FALSE),
('nameplate-sakura-sunset','nameplate-sakura-sunset','Sakura Sunset','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-sakura-sunset.mp4?v=1','/Profile-decorations/Nameplates/nameplate-sakura-sunset.preview.webp?v=1',640,112,10,2100,0.58,'epic',199,FALSE),
('nameplate-skull-horizon','nameplate-skull-horizon','Skull Horizon','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-skull-horizon.mp4?v=1','/Profile-decorations/Nameplates/nameplate-skull-horizon.preview.webp?v=1',640,112,33.333333333333336,2040,0.58,'epic',199,FALSE),
('nameplate-summer-wave','nameplate-summer-wave','Summer Wave','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-summer-wave.mp4?v=1','/Profile-decorations/Nameplates/nameplate-summer-wave.preview.webp?v=1',640,112,10,1500,0.58,'epic',199,FALSE),
('nameplate-sunflower-dus','nameplate-sunflower-dus','Sunflower Dusk','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-sunflower-dus.mp4?v=1','/Profile-decorations/Nameplates/nameplate-sunflower-dus.preview.webp?v=1',640,112,6.666666666666667,3150,0.58,'epic',199,FALSE),
('nameplate-sunny-clouds','nameplate-sunny-clouds','Sunlit Clouds','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-sunny-clouds.mp4?v=1','/Profile-decorations/Nameplates/nameplate-sunny-clouds.preview.webp?v=1',640,112,7.6923076923076925,2860,0.58,'epic',199,FALSE),
('nameplate-sunny-sakura','nameplate-sunny-sakura','Sunny Sakura','Анимированная панорама с мягким фоном слева и чёткими деталями справа. Украшает строку пользователя в списках.','video','/Profile-decorations/Nameplates/nameplate-sunny-sakura.mp4?v=1','/Profile-decorations/Nameplates/nameplate-sunny-sakura.preview.webp?v=1',640,112,7.142857142857143,1680,0.58,'epic',199,FALSE);
