/**
 * Remove Next.js output dirs with retries (Windows often locks files while dev is stopping).
 * Run only when `npm run dev` is NOT running.
 */
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const dirs = ['.next', '.next-dev'].map((name) => join(process.cwd(), name));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function removeDir(dir) {
  if (!existsSync(dir)) {
    return true;
  }
  let lastErr;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
      return true;
    } catch (err) {
      lastErr = err;
      await sleep(300 * attempt);
    }
  }
  console.error(`Could not delete ${dir}`);
  console.error(lastErr?.message || lastErr);
  return false;
}

let ok = true;
for (const dir of dirs) {
  ok = (await removeDir(dir)) && ok;
}

if (!ok) {
  console.error(
    'Stop the dev server (Ctrl+C), close other terminals running next/build, then run again.',
  );
  process.exit(1);
}
