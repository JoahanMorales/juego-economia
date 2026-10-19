const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../server');

test('GET /health responde ok', async () => {
  const { server, io } = createServer({ turnMs: 10000 });
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'ok');
  } finally {
    await io.close();
  }
});
