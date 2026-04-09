// ==========================================
// MasterUtils.gemini.test.js
// Covers Gemini key rotation and cooldown behavior.
// Keeps follow-up requests away from a key that just hit 429/503.
// ==========================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createGeminiResponse(text) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text }] },
        },
      ],
    }),
  };
}

function createRateLimitResponse(status = 429) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: async () => ({
      error: { message: `HTTP ${status}` },
    }),
  };
}

describe('callGeminiAPIText', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips a recently rate-limited key on the next request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createRateLimitResponse(429))
      .mockResolvedValueOnce(createGeminiResponse('first-ok'))
      .mockResolvedValueOnce(createGeminiResponse('second-ok'));

    vi.stubGlobal('fetch', fetchMock);

    const { callGeminiAPIText } = await import('./MasterUtils.jsx');

    await callGeminiAPIText(
      { contents: [{ parts: [{ text: 'first request' }] }] },
      ['key-1', 'key-2']
    );
    await callGeminiAPIText(
      { contents: [{ parts: [{ text: 'second request' }] }] },
      ['key-1', 'key-2']
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=key-1',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=key-2',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=key-2',
    ]);
  });
});
