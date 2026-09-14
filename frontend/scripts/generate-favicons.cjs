const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const sharp = require('../../backend/node_modules/sharp');
  const svgPath = path.resolve(__dirname, '../public/favicon.svg');
  const iconsDir = path.resolve(__dirname, '../public/icons');
  const publicDir = path.resolve(__dirname, '../public');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [16, 32, 48, 64, 96, 144, 192, 512];

  for (const size of sizes) {
    const outPng = path.join(iconsDir, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPng);
    console.log(`Generated ${outPng} (${size}x${size})`);
  }

  // Also copy 32x32 to public/favicon.ico or generate a valid 32x32 PNG as favicon.ico / favicon-32.png
  const faviconIcoPath = path.join(publicDir, 'favicon.ico');
  await sharp(svgBuffer).resize(32, 32).png().toFile(faviconIcoPath);
  console.log(`Generated ${faviconIcoPath}`);

  console.log('All Google Favicon & PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
