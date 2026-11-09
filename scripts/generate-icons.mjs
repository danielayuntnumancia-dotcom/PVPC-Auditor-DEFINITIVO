import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'assets/branding/app-icon.svg'), 'utf8');
const color = svg.match(/<rect[^>]*fill="(#[0-9a-f]{6})"/i)?.[1];
const bolt = svg.match(/<path\s+d="([^"]+)"/)?.[1];
if (!color || !bolt) throw new Error('The brand SVG must define its background and lightning path.');
const output = (relative, data) => {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error('Icon output outside the project.');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
};
const png = (source, size) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
const square = svg.replace('rx="12"', 'rx="0"');
const round = svg.replace('<rect width="40" height="40" rx="12"', '<rect width="40" height="40" rx="20"');

output('public/favicon.svg', svg);
for (const size of [16, 32]) output(`public/favicon-${size}x${size}.png`, png(svg, size));
output('public/icon-192.png', png(svg, 192));
output('public/icon.png', png(svg, 512));
output('public/apple-touch-icon.png', png(square, 180));
for (const size of [192, 512]) output(`public/icon-maskable-${size}.png`, png(square, size));

// ICO directory entries contain PNG images, supported by current browsers and Windows.
const icoSizes = [16, 32, 48, 256];
const images = icoSizes.map(size => png(svg, size));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const entry = 6 + i * 16;
  header[entry] = icoSizes[i] === 256 ? 0 : icoSizes[i];
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
output('public/favicon.ico', Buffer.concat([header, ...images]));

const res = 'android/app/src/main/res';
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  output(`${res}/mipmap-${density}/ic_launcher.png`, png(svg, size));
  output(`${res}/mipmap-${density}/ic_launcher_round.png`, png(round, size));
  // Replace the previous raster resources; adaptive foregrounds now use a vector.
  for (const name of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
    const old = path.join(root, res, `mipmap-${density}`, `${name}.webp`);
    if (existsSync(old)) unlinkSync(old);
  }
}
output('android/app/src/main/ic_launcher-playstore.png', png(square, 512));
output(`${res}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">${color}</color></resources>
`);
output(`${res}/drawable/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="${color}" android:pathData="M0,0h108v108h-108z"/>
</vector>
`);
output(`${res}/drawable-v24/ic_launcher_foreground.xml`, `<?xml version="1.0" encoding="utf-8"?>
<!-- Lightning: Lucide Zap, ISC. Artwork stays within the adaptive icon safe area. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <group android:translateX="32.4" android:translateY="32.4" android:scaleX="1.8" android:scaleY="1.8">
        <path android:fillColor="#FFFFFFFF" android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${bolt}"/>
    </group>
</vector>
`);
for (const name of ['ic_launcher', 'ic_launcher_round']) {
  output(`${res}/mipmap-anydpi-v26/${name}.xml`, `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`);
}
console.log('Generated matching web, PWA, legacy Android and adaptive Android icons.');
