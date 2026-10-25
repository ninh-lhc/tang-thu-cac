/**
 * Danh mục field cho bảng Danh sách AUTO — scope tab con, không dùng TTC-Query.
 */
import { forEachNovelEntity } from './entityRename.js';
import { listTtcQueryFieldOptions } from './ttcQueryBuilder.js';
import { collectTtcFieldStats, truncateTtcSample } from './ttcQueryDiagnostics.js';
import { scopeMatches } from './ttcQueryScope.js';
import { getEntityAutoDisplayString } from './collectionListCardSync.js';

const CONTENT_VIRTUAL = Object.freeze({
  displayString: 'Chuỗi hiển thị (AUTO)',
});

export function listEntityCollectionFieldOptions(activeNovelData, scope) {
  const baseScope =
    scope?.kind === 'nho'
      ? scope
      : { kind: 'all', tabLabel: scope?.tabLabel || '' };
  const fromBuilder = listTtcQueryFieldOptions(activeNovelData, baseScope).filter(
    (f) => f.group === 'content',
  );
  const byId = new Map();
  const put = (field) => {
    if (!field?.id || byId.has(field.id)) return;
    byId.set(field.id, field);
  };
  fromBuilder.forEach(put);
  put({
    id: 'displayString',
    fieldId: 'displayString',
    label: CONTENT_VIRTUAL.displayString,
    source: 'virtual',
    group: 'content',
    scopeLabel: scope?.tabLabel || '',
    priority: 50,
  });

  const options = [...byId.values()];
  const statsScope =
    baseScope.kind === 'nho' ? baseScope : { kind: 'all' };

  return options.map((field) => {
    let stats;
    if (field.id === 'displayString') {
      let totalCount = 0;
      let populatedCount = 0;
      const sampleValues = [];
      forEachNovelEntity(activeNovelData, (ent, ctx) => {
        if (!scopeMatches(statsScope, ctx.lonId, ctx.nhoId)) return;
        totalCount += 1;
        const v = getEntityAutoDisplayString(ent);
        if (!v) return;
        populatedCount += 1;
        if (sampleValues.length < 5) sampleValues.push(truncateTtcSample(v));
      });
      stats = { totalCount, populatedCount, sampleValues };
    } else {
      stats = collectTtcFieldStats(activeNovelData, statsScope, field.id, activeNovelData?.tabsConfig);
    }
    return { ...field, ...stats, valueType: 'string' };
  });
}
