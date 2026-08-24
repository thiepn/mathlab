const base = new URL(process.env.MATHLAB_PRODUCTION_URL ?? 'https://thiepn.dev/mathlab/');
const attempts = Number(process.env.MATHLAB_PRODUCTION_ATTEMPTS ?? 24);
const delayMs = Number(process.env.MATHLAB_PRODUCTION_DELAY_MS ?? 5000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe() {
  const targets = [
    ['', (text) => /<title>MathLab<\/title>/i.test(text)],
    ['manifest.webmanifest', (text) => text.includes('"name": "MathLab"')],
    ['sw.js', (text) => text.includes("mathlab-v2-shell") && text.includes("mathlab-v2-runtime")],
  ];

  for (const [relative, validate] of targets) {
    const url = new URL(relative, base);
    const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    const text = await response.text();
    if (!validate(text)) throw new Error(`${url} did not expose the expected MathLab v2 production contract`);
  }
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await probe();
    console.log(`MathLab production endpoint is ready at ${base}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Production probe ${attempt}/${attempts} not ready: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt < attempts) await sleep(delayMs);
  }
}

console.error(`MathLab production endpoint did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
process.exit(1);
