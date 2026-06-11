const sharp = require('sharp');

async function createGradientBackground() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="562.5">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1C5C8E"/>
        <stop offset="100%" style="stop-color:#4ECDC4"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('workspace/gradient-bg.png');

  console.log('Gradient background created: workspace/gradient-bg.png');
}

createGradientBackground().catch(console.error);
