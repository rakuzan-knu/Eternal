# Desktop packaging resources

Icons derive from the existing artwork in `apps/web/public/icons`. PNG sizes
16–512 retain the original files; 256 is downsampled and 1024 is upsampled from
the 512 image. ICO contains 16/32/48/64/256 PNG entries; ICNS contains 512/1024.
Store tile artwork preserves the square icon proportions.

To regenerate, install the existing Playwright Chromium browser if needed,
then run `pnpm --filter @eternal/desktop generate:icons`. Normal packaging uses
the checked-in resources and does not launch or download a browser.
