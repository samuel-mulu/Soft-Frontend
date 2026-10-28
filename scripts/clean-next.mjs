/**
 * Remove .next with retries (Windows often locks files while dev is stopping).
 * Run only when `npm run dev` is NOT running.
 */
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), '.next');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (!existsSync(dir)) {
  process.exit(0);
}

let lastErr;
for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    process.exit(0);
  } catch (err) {
    lastErr = err;
    await sleep(300 * attempt);
  }
}

console.error(
  'Could not delete .next — stop the dev server (Ctrl+C), close other terminals running next/build, then run again.',
);
console.error(lastErr?.message || lastErr);
process.exit(1);
