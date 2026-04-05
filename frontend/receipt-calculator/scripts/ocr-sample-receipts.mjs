/**
 * Batch local OCR for repo sample images (Tesseract, English).
 * Reads:  <repo>/docs/SampleReceipts/*.{jfif,jpeg,jpg,png,webp}
 * Writes: <repo>/docs/SampleReceipts/_ocr-tesseract/<basename>.txt
 *
 * Usage (from frontend/receipt-calculator): npm run ocr:samples
 * For Chinese-heavy receipts, edit createWorker to e.g. 'eng+chi_sim+chi_tra' (slower, larger download).
 */
import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const samplesDir = path.join(repoRoot, 'docs', 'SampleReceipts');
const outDir = path.join(samplesDir, '_ocr-tesseract');

const imageRe = /\.(jpe?g|jfif|png|webp)$/i;

async function main() {
  let entries;
  try {
    entries = await fs.readdir(samplesDir, { withFileTypes: true });
  } catch (e) {
    console.error(`Cannot read ${samplesDir}:`, e.message);
    process.exit(1);
  }

  const images = entries.filter((e) => e.isFile() && imageRe.test(e.name));
  if (images.length === 0) {
    console.log(`No images matching ${imageRe} in ${samplesDir}`);
    return;
  }

  await fs.mkdir(outDir, { recursive: true });
  const worker = await createWorker('eng');
  try {
    for (const e of images) {
      const filePath = path.join(samplesDir, e.name);
      const base = path.basename(e.name, path.extname(e.name));
      const {
        data: { text },
      } = await worker.recognize(filePath);
      await fs.writeFile(path.join(outDir, `${base}.txt`), text.trimEnd() + '\n', 'utf8');
      console.log(`OK ${e.name}`);
    }
  } finally {
    await worker.terminate();
  }
  console.log(`\nWrote ${images.length} file(s) to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
