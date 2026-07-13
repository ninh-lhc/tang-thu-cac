/**
 * Chính sách ghi truyện lên thư mục: debounce, nhận diện lỗi khóa file (OneDrive),
 * retry backoff. Logic thuần — useAppPersistence / novelDiskLayout gọi.
 */

export const NOVEL_DISK_DEBOUNCE_MS = 1000;
export const NOVEL_BACKUP_MIN_INTERVAL_MS = 60_000;
export const NOVEL_DISK_WRITE_MAX_ATTEMPTS = 5;
export const NOVEL_DISK_RETRY_BASE_MS = 400;

export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

/** Lỗi tạm do khóa file / OneDrive sync — nên retry, chưa hẳn mất quyền FS. */
export function isTransientFsWriteError(err) {
  if (!err) return false;
  const name = String(err.name || '');
  if (
    name === 'InvalidModificationError' ||
    name === 'NoModificationAllowedError' ||
    name === 'AbortError' ||
    name === 'NotReadableError'
  ) {
    return true;
  }
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('locked') ||
    msg.includes('being used') ||
    msg.includes('access denied') ||
    msg.includes('cannot be written') ||
    msg.includes('modifications are not allowed') ||
    msg.includes('failed to create writable') ||
    msg.includes('createwritable')
  );
}

/**
 * Chạy fn với exponential backoff khi lỗi tạm (khóa file / sync mây).
 * Không nuốt NotAllowedError / SecurityError thuần quyền (trừ khi message giống lock).
 */
export async function withFsWriteRetry(fn, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts) || NOVEL_DISK_WRITE_MAX_ATTEMPTS);
  const baseMs = Number(options.baseMs) || NOVEL_DISK_RETRY_BASE_MS;
  const isPermissionHard = typeof options.isPermissionHardError === 'function' ? options.isPermissionHardError : null;
  const onRetry = typeof options.onRetry === 'function' ? options.onRetry : null;

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const hardPerm = isPermissionHard ? isPermissionHard(err) : false;
      const transient = isTransientFsWriteError(err);
      const canRetry = attempt < maxAttempts && transient && !hardPerm;
      if (!canRetry) throw err;
      const delay = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 120);
      if (onRetry) {
        try {
          onRetry({ attempt, delay, error: err });
        } catch {
          /* ignore */
        }
      }
      await sleepMs(delay);
    }
  }
  throw lastErr;
}

/** NotAllowed/Security thuần — không retry như khóa file. */
export function isHardFsPermissionError(err) {
  if (!err) return false;
  const name = String(err.name || '');
  if (name !== 'NotAllowedError' && name !== 'SecurityError') return false;
  // Một số môi trường gói lock vào NotAllowedError + message createWritable / modifications.
  if (isTransientFsWriteError(err)) {
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('modifications are not allowed') || msg.includes('createwritable')) {
      return false;
    }
  }
  return true;
}
