// Génère les icônes de l'app à partir d'une image source (recadrage carré centré).
// Usage : node scripts/gen-icons.mjs public/logo-source.png
import sharp from "sharp";

const SRC = process.argv[2] || "public/logo-source.png";

const meta = await sharp(SRC).metadata();
const side = Math.min(meta.width, meta.height);
const left = Math.round((meta.width - side) / 2);
const top = Math.round((meta.height - side) / 2);

const outputs = [
  ["public/icon-512.png", 512], // PWA (écran d'accueil)
  ["app/icon.png", 256], // favicon
  ["app/apple-icon.png", 180], // iOS
];

for (const [path, size] of outputs) {
  await sharp(SRC)
    .extract({ left, top, width: side, height: side })
    .resize(size, size)
    .png()
    .toFile(path);
  console.log(`✓ ${path} (${size}×${size})`);
}
