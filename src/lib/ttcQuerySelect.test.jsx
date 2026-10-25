import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { runTtcQueryFromSource, executeTtcQuery } from './ttcQueryEngine.js';
import { parseTtcQuery } from './ttcQueryParser.js';
import { renderEntityNotesMarkdown } from './renderEntityNotesMarkdown.jsx';

const novel = {
  tabsConfig: {
    tabs: [
      {
        id: 'tab-lon',
        subTabs: [
          {
            id: 'tab-nho',
            label: 'Tab Nho',
            fieldsTemplate: [
              { id: 'f_level', label: 'Cấp' },
              { id: 'f_unused_template', label: 'Chua ai dien' },
            ],
          },
        ],
      },
    ],
  },
  data: {
    'tab-lon': {
      'tab-nho': {
        entities: [
          { id: 'e1', name: 'Alpha', dynamicData: { f_level: '9', f_only_data: 'x' } },
          { id: 'e2', name: 'Beta', dynamicData: {} },
        ],
      },
    },
  },
};

describe('ttcQuery SELECT validation', () => {
  it('allows virtual, dynamicData, and template-only fields', () => {
    const r = runTtcQueryFromSource(
      'VIEW TABLE\nFROM entity\nSELECT entity, id, type, f_level, f_only_data, f_unused_template',
      novel,
    );
    expect(r.ok).toBe(true);
    expect(r.columns.map((c) => c.id)).toEqual([
      'entity',
      'id',
      'type',
      'f_level',
      'f_only_data',
      'f_unused_template',
    ]);
    const row1 = r.rows.find((x) => x.entityId === 'e1');
    expect(row1.cells.find((c) => c.fieldId === 'f_unused_template').display).toBe('');
    expect(row1.cells.find((c) => c.fieldId === 'f_level').display).toBe('9');
  });

  it('errors on unknown SELECT field with suggestion', () => {
    const r = runTtcQueryFromSource('VIEW TABLE\nFROM entity\nSELECT entity, f_levl', novel);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Field SELECT không tồn tại: f_levl/);
    expect(r.errors[0]).toMatch(/f_level/);
  });

  it('errors when one of multiple SELECT fields is invalid', () => {
    const r = runTtcQueryFromSource(
      'VIEW TABLE\nFROM entity\nSELECT entity, f_level, f_bad_col',
      novel,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('f_bad_col'))).toBe(true);
    expect(r.errors.some((e) => e.includes('SELECT'))).toBe(true);
  });

  it('valid SELECT with no rows stays no_match, not field error', () => {
    const r = runTtcQueryFromSource(
      'VIEW LIST\nFROM entity\nWHERE id = "missing"\nSELECT entity, f_level',
      novel,
    );
    expect(r.ok).toBe(true);
    expect(r.emptyReason).toBe('no_match');
  });

  it('does not mutate activeNovelData on SELECT validation path', () => {
    const copy = JSON.parse(JSON.stringify(novel));
    const before = JSON.stringify(copy);
    runTtcQueryFromSource('VIEW TABLE\nFROM entity\nSELECT f_nope', copy);
    expect(JSON.stringify(copy)).toBe(before);
  });

  it('rename/undo keeps SELECT results in sync', () => {
    const dynamic = JSON.parse(JSON.stringify(novel));
    const snap = JSON.stringify(dynamic);
    let r = executeTtcQuery(dynamic, parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query);
    expect(r.rows.find((x) => x.entityId === 'e1').entityName).toBe('Alpha');
    dynamic.data['tab-lon']['tab-nho'].entities[0].name = 'Alpha 2';
    r = executeTtcQuery(dynamic, parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query);
    expect(r.rows.find((x) => x.entityId === 'e1').entityName).toBe('Alpha 2');
    Object.assign(dynamic, JSON.parse(snap));
    r = executeTtcQuery(dynamic, parseTtcQuery('VIEW LIST\nFROM entity\nSELECT entity').query);
    expect(r.rows.find((x) => x.entityId === 'e1').entityName).toBe('Alpha');
  });

  it('SELECT error renders locally beside markdown table/callout', () => {
    const md = [
      '| H |',
      '|---|',
      '| 1 |',
      '',
      '```ttc-query',
      'VIEW TABLE',
      'FROM entity',
      'SELECT entity, f_typo_field',
      '```',
      '',
      '> [!INFO] Note',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, [], null, vi.fn(), null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.querySelector('[data-ttc-query-error="true"]')).not.toBeNull();
    expect(container.textContent).toMatch(/SELECT không tồn tại: f_typo_field/);
    expect(container.querySelector('.entity-notes-md-table')).not.toBeNull();
    expect(container.textContent).toContain('Note');
  });
});
