const fs = require('fs');
const path = require('path');

// SVG 아이콘 템플릿 (간단한 H 로고)
const generateSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563eb"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">H</text>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// icons 디렉토리가 없으면 생성
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`Generated ${filename}`);
});

console.log('All PWA icons generated successfully!');
console.log('Note: For production, convert SVG icons to PNG format for better browser compatibility.');