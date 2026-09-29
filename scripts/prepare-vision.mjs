import {
  mkdir,
  copyFile,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "public/vision");
await mkdir(destination, { recursive: true });
const wasm = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
for (const file of await readdir(wasm)) {
  if (/\.(wasm|js)$/.test(file))
    await copyFile(path.join(wasm, file), path.join(destination, file));
}
const url =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const modelPath = path.join(destination, "hand_landmarker.task");
const lockPath = path.join(root, "scripts/model-lock.json");
let lock;
try {
  lock = JSON.parse(await readFile(lockPath, "utf8"));
} catch {}
let bytes;
try {
  bytes = await readFile(modelPath);
} catch {}
if (bytes && lock && createHash("sha256").update(bytes).digest("hex") !== lock.sha256) {
  try {
    const restored = brotliDecompressSync(bytes);
    bytes = createHash("sha256").update(restored).digest("hex") === lock.sha256
      ? restored : undefined;
  } catch {
    bytes = undefined;
  }
}
if (!bytes) {
  console.log("Downloading pinned Hand Landmarker model (v1)...");
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (lock && lock.sha256 !== sha256)
  throw new Error("Model checksum mismatch; refusing changed model.");
if (!lock)
  await writeFile(
    lockPath,
    JSON.stringify({ url, sha256, bytes: bytes.length }, null, 2) + "\n",
  );
await writeFile(modelPath, bytes);
const compressed = process.argv.includes("--brotli");
if (compressed) {
  // Vercel does not compress application/wasm automatically. Ship precompressed
  // bytes under the original path and declare Content-Encoding: br in vercel.json.
  const quality = { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 7 } };
  for (const file of await readdir(wasm)) {
    if (file.endsWith(".wasm")) {
      const target = path.join(destination, file);
      await writeFile(target, brotliCompressSync(await readFile(target), quality));
    }
  }
  await writeFile(modelPath, brotliCompressSync(bytes, quality));
}
console.log(
  `Vision assets ready: model ${bytes.length} bytes; ${compressed ? "Brotli for Vercel" : "uncompressed locally"}.`,
);
