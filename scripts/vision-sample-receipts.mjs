/**
 * Call local API Google Vision proxy for each sample receipt image.
 * Writes: docs/SampleReceipts/_ocr-vision/<basename>.txt
 *
 * Requires: API running with Vision key (appsettings.Local.json) and quota.
 * Usage: node scripts/vision-sample-receipts.mjs
 */
import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const samplesDir = path.join(repoRoot, 'docs', 'SampleReceipts');
const outDir = path.join(samplesDir, '_ocr-vision');

const imageRe = /\.(jpe?g|jfif|png|webp)$/i;
const host = process.env.VISION_SAMPLE_HOST || 'localhost';
const port = Number(process.env.VISION_SAMPLE_PORT || 5188);

function postJson(bodyObj) {
  const body = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: '/api/vision/document-text',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const entries = await fs.readdir(samplesDir, { withFileTypes: true });
  const images = entries.filter((e) => e.isFile() && imageRe.test(e.name));
  if (images.length === 0) {
    console.log('No images in', samplesDir);
    return;
  }

  await fs.mkdir(outDir, { recursive: true });

  for (const e of images) {
    const filePath = path.join(samplesDir, e.name);
    const buf = await fs.readFile(filePath);
    const b64 = buf.toString('base64');
    const base = path.basename(e.name, path.extname(e.name));
    const { status, body } = await postJson({ images: [b64] });
    if (status !== 200) {
      console.error('FAIL', e.name, status, body.slice(0, 200));
      continue;
    }
    const j = JSON.parse(body);
    const text = (j.text || '').trimEnd() + '\n';
    await fs.writeFile(path.join(outDir, `${base}.txt`), text, 'utf8');
    console.log('OK', e.name);
  }
  console.log(`\nWrote OCR to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
