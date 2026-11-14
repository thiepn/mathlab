import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const expectedSha = 'b'.repeat(40);
const staleSha = 'a'.repeat(40);

function metadata(commit) {
  return { schema: 'mathlab-release-v1', commit, buildId: commit.slice(0, 12) };
}

async function runProbe(options = {}) {
  const routes = {
    '/mathlab/': options.title ?? '<title>MathLab</title>',
    '/mathlab/manifest.webmanifest': '{"name": "MathLab"}',
    '/mathlab/sw.js': options.worker ?? "const CACHE_PREFIX = 'mathlab-build-'; const BUILD_ID='old'; const SHELL_CACHE='-shell'; const RUNTIME_CACHE='-runtime';",
  };
  if (options.release !== null) routes['/mathlab/release.json'] = JSON.stringify(options.release ?? metadata(expectedSha));

  const server = createServer((request, response) => {
    const path = (request.url ?? '').split('?')[0];
    const body = routes[path];
    if (body === undefined) {
      response.writeHead(404).end('Not found');
    } else {
      response.writeHead(200, { 'Content-Type': path.endsWith('.json') ? 'application/json' : 'text/plain' }).end(body);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing ephemeral test port');
    const url = 'http://127.0.0.1:' + address.port + '/mathlab/';
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/wait-for-production.mjs', import.meta.url))], {
        env: {
          ...process.env,
          GITHUB_SHA: options.expected ?? expectedSha,
          MATHLAB_PRODUCTION_URL: url,
          MATHLAB_PRODUCTION_ATTEMPTS: '1',
          MATHLAB_PRODUCTION_DELAY_MS: '0',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk.toString(); });
      child.stderr.on('data', (chunk) => { output += chunk.toString(); });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, output }));
    });
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

describe('production release identity — fail closed against healthy stale deployments', () => {
  it('accepts an exact full-SHA production release', async () => {
    const outcome = await runProbe({ release: metadata(expectedSha) });
    expect(outcome.code).toBe(0);
    expect(outcome.output).toContain('is ready');
  });

  it('rejects an otherwise healthy older production release', async () => {
    const outcome = await runProbe({ release: metadata(staleSha) });
    expect(outcome.code).toBe(1);
    expect(outcome.output).toContain('Release identity mismatch');
  });

  it('checks all 40 SHA characters, not only the 12-character service-worker prefix', async () => {
    const collision = expectedSha.slice(0, 12) + 'c'.repeat(28);
    const outcome = await runProbe({ release: metadata(collision) });
    expect(outcome.code).toBe(1);
    expect(outcome.output).toContain('Release identity mismatch');
  });

  it('rejects a missing release asset rather than accepting a legacy deployment', async () => {
    const outcome = await runProbe({ release: null });
    expect(outcome.code).toBe(1);
    expect(outcome.output).toContain('HTTP 404');
  });

  it('refuses to certify when the expected commit is absent', async () => {
    const outcome = await runProbe({ expected: '' });
    expect(outcome.code).toBe(1);
    expect(outcome.output).toContain('Missing or invalid GITHUB_SHA');
  });

  it('retains the existing page and service-worker checks', async () => {
    const wrongPage = await runProbe({ title: '<title>Other site</title>' });
    expect(wrongPage.code).toBe(1);
    const wrongWorker = await runProbe({ worker: 'unexpected sw content' });
    expect(wrongWorker.code).toBe(1);
  });
});
