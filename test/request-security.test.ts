import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLimitedBody } from '../lib/request-security';
import { AdminError } from '../lib/errors';

test('un corps admissible est lu intégralement', async () => {
  const request = new Request('https://admin.test/api/action', { method: 'POST', body: 'abc' });
  assert.equal(new TextDecoder().decode(await readLimitedBody(request, 3)), 'abc');
});

test('une taille déclarée excessive est refusée avant lecture', async () => {
  const request = new Request('https://admin.test/api/action', { method: 'POST', body: 'abc', headers: { 'Content-Length': '100' } });
  await assert.rejects(readLimitedBody(request, 3), (error: unknown) => error instanceof AdminError && error.status === 413);
});

test('un flux trop grand est refusé même sans Content-Length', async () => {
  const request = new Request('https://admin.test/api/action', { method: 'POST', body: 'abcd' });
  await assert.rejects(readLimitedBody(request, 3), (error: unknown) => error instanceof AdminError && error.status === 413);
});
