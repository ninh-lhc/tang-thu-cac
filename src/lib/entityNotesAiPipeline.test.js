import { describe, expect, it } from 'vitest';
import { collectEntityNotesDiagnostics } from './entityNotesDiagnostics.js';
import { runNotesAiPipeline, runNotesCleanStep } from './entityNotesAiPipeline.js';

describe('entityNotesAiPipeline', () => {
  it('runNotesCleanStep trims messy whitespace', () => {
    const { text, changed } = runNotesCleanStep('##   Muc \n\n1.  Y');
    expect(changed).toBe(true);
    expect(text).toContain('## Muc');
  });

  it('pipeline wraps wiki without API then skips AI steps', async () => {
    const result = await runNotesAiPipeline('Linh Gioi Chau xuat hien giua troi.', {
      entityMap: [{ id: 'e1', name: 'Linh Gioi Chau' }],
      geminiApiKeys: [],
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('[[Linh Gioi Chau]]');
    expect(result.steps).toContain('link');
    expect(result.formatSkippedAi).toBe(true);
    expect(result.remainingWarningCount).toBeGreaterThanOrEqual(0);
  });

  it('returns remainingWarningCount aligned with diagnostics after clean', async () => {
    const result = await runNotesAiPipeline('- **Mo dau\n[[wiki', {
      entityMap: [],
      geminiApiKeys: [],
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('**Mo dau**');
    expect(result.remainingWarningCount).toBe(collectEntityNotesDiagnostics(result.text).length);
  });
});

