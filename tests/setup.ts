import { createServer } from 'vite';

// Keep Vite in the test runner process so teardown also works on Windows
// without spawning npm/cmd process trees that require taskkill permissions.
export default async function setup() {
  const url = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (response.ok) return;
  } catch { /* Start the local test server below. */ }
  if (process.env.PLAYWRIGHT_BASE_URL) {
    throw new Error(`Test server is unavailable: ${url}`);
  }
  const server = await createServer({
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    logLevel: 'error',
  });
  await server.listen();
  return async () => { await server.close(); };
}
