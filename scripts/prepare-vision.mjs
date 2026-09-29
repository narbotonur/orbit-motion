import { mkdir, copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'public/vision');
await mkdir(destination, { recursive: true });
const wasm = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
for (const file of await readdir(wasm)) {
  if (/\.(wasm|js)$/.test(file)) await copyFile(path.join(wasm, file), path.join(destination, file));
}
const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const modelPath = path.join(destination, 'hand_landmarker.task');
const lockPath = path.join(root, 'scripts/model-lock.json');
let lock;
try { lock = JSON.parse(await readFile(lockPath, 'utf8')); } catch {}
let bytes;
try { bytes = await readFile(modelPath); } catch {}
if (!bytes) {
  console.log('Downloading pinned Hand Landmarker model (v1)...');
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (lock && lock.sha256 !== sha256) throw new Error('Model checksum mismatch; refusing changed model.');
if (!lock) await writeFile(lockPath, JSON.stringify({ url, sha256, bytes: bytes.length }, null, 2) + '\n');
await writeFile(modelPath, bytes);
console.log(`Vision assets ready: model ${bytes.length} bytes; WASM served locally.`);
