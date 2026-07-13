import { describe, expect, it, vi } from 'vitest';
import {
  isHardFsPermissionError,
  isTransientFsWriteError,
  withFsWriteRetry,
} from './novelDiskWritePolicy.js';

describe('novelDiskWritePolicy', () => {
  it('detects OneDrive / lock style errors as transient', () => {
    expect(isTransientFsWriteError({ name: 'InvalidModificationError' })).toBe(true);
    expect(
      isTransientFsWriteError({ name: 'Error', message: 'Failed to createWritable: modifications are not allowed' })
    ).toBe(true);
    expect(isTransientFsWriteError({ name: 'Error', message: 'file is locked' })).toBe(true);
  });

  it('treats bare NotAllowedError as hard permission', () => {
    expect(isHardFsPermissionError({ name: 'NotAllowedError', message: '' })).toBe(true);
    expect(
      isHardFsPermissionError({
        name: 'NotAllowedError',
        message: 'Failed to createWritable: modifications are not allowed',
      })
    ).toBe(false);
  });

  it('retries transient failures then succeeds', async () => {
    let n = 0;
    const result = await withFsWriteRetry(
      async () => {
        n += 1;
        if (n < 3) {
          const err = new Error('file is locked');
          err.name = 'InvalidModificationError';
          throw err;
        }
        return 'ok';
      },
      { maxAttempts: 5, baseMs: 1 }
    );
    expect(result).toBe('ok');
    expect(n).toBe(3);
  });

  it('does not retry hard permission errors', async () => {
    const fn = vi.fn(async () => {
      const err = new Error('denied');
      err.name = 'NotAllowedError';
      throw err;
    });
    await expect(
      withFsWriteRetry(fn, {
        maxAttempts: 4,
        baseMs: 1,
        isPermissionHardError: isHardFsPermissionError,
      })
    ).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
