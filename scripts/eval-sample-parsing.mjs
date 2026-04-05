/**
 * Batch-check: POST each Tesseract/Vision OCR dump to /api/receipt/analyze-test.
 * Run API first: dotnet run --project src/ReceiptCalculator.Api --urls http://localhost:5188
 *
 * Usage: node scripts/eval-sample-parsing.mjs
 */
import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const tessDir = path.join(repoRoot, 'docs', 'SampleReceipts', '_ocr-tesseract');
const visionDir = path.join(repoRoot, 'docs', 'SampleReceipts', '_ocr-vision');

const host = process.env.PARSE_EVAL_HOST || 'localhost';
const port = Number(process.env.PARSE_EVAL_PORT || 5188);

function postJson(pathname, bodyObj) {
  const body = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function evalDir(label, dir) {
  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.txt')).sort();
  } catch (e) {
    console.error(`[${label}] Missing folder:`, dir, e.message);
    return { failures: [], ok: [], skipped: true };
  }

  const failures = [];
  const ok = [];

  for (const name of files) {
    const p = path.join(dir, name);
    const ocrText = await fs.readFile(p, 'utf8');
    const { status, body } = await postJson('/api/receipt/analyze-test', {
      ocrText,
      currency: 'MYR',
    });
    if (status === 200) {
      const j = JSON.parse(body);
      ok.push({ file: name, items: j.items?.length ?? 0 });
    } else {
      failures.push({ file: name, status, snippet: body.slice(0, 400) });
    }
  }

  console.log(
    `[${label}] files: ${files.length} | OK: ${ok.length} | FAIL: ${failures.length}`
  );
  if (failures.length) {
    console.log(`\n--- ${label} failures ---`);
    for (const f of failures) {
      console.log(f.file, f.status);
      console.log(f.snippet.slice(0, 200));
    }
  } else {
    const low = ok.filter((x) => x.items < 1);
    if (low.length) console.log(`[${label}] Zero-item OK:`, low);
  }

  return { failures, ok, skipped: false };
}

async function main() {
  const runVision = process.argv.includes('--vision');
  const r1 = await evalDir('tesseract', tessDir);
  if (r1.failures.length) process.exitCode = 1;

  if (runVision) {
    const r2 = await evalDir('vision', visionDir);
    if (r2.failures.length) process.exitCode = 1;
    if (r2.skipped) console.log('[vision] skipped (folder missing)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
