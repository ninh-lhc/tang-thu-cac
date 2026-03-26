// Quản lý state + prefs cho truy vấn collection entity (search/filter/sort/group).
// Tách từ App.jsx để giảm churn render toàn cục.
/* eslint-disable react-hooks/set-state-in-effect -- đây là hook stateful điều phối UI; setState trong effect là chủ ý */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeString } from './MasterUtils.jsx';

export function useEntityCollectionQueryState({
  activeNovelId,
  activeTabLon,
  activeTabNho,
  entityFilterFields,
}) {
  const [entitySearch, setEntitySearch] = useState('');
  const [entityFilterField, setEntityFilterField] = useState('none');
  const [entityFilterValue, setEntityFilterValue] = useState('');
  const [entitySortMode, setEntitySortMode] = useState('newest');
  const [entityGroupBy, setEntityGroupBy] = useState('none');
  const [showEntityAdvanced, setShowEntityAdvanced] = useState(false);
  const [entityPage, setEntityPage] = useState(1);
  const [groupVisibleCount, setGroupVisibleCount] = useState({});
  const [entityUiPrefsByTab, setEntityUiPrefsByTab] = useState(() => {
    try {
      const raw = localStorage.getItem('tangthu_entity_ui_prefs_by_tab');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const entityUiPrefsKey = useMemo(() => {
    if (!activeNovelId || !activeTabLon) return '';
    return `${activeNovelId}::${activeTabLon}::${activeTabNho || 'default'}`;
  }, [activeNovelId, activeTabLon, activeTabNho]);

  const isEntityAdvancedActive =
    entityGroupBy !== 'none' || (entityFilterField !== 'none' && entityFilterValue.trim());

  const entityFilterOptions = useMemo(
    () => [
      { value: 'none', label: 'Không lọc theo trường' },
      ...(entityFilterFields || []).map((f) => ({ value: f.id, label: `Lọc: ${f.label}` })),
    ],
    [entityFilterFields]
  );
  const entityGroupOptions = useMemo(
    () => [
      { value: 'none', label: 'Không nhóm' },
      ...(entityFilterFields || []).map((f) => ({ value: f.id, label: `Nhóm: ${f.label}` })),
    ],
    [entityFilterFields]
  );

  const clearEntityAdvanced = useCallback(() => {
    setEntityGroupBy('none');
    setEntityFilterField('none');
    setEntityFilterValue('');
  }, []);

  const applyEntityPreset = useCallback((preset) => {
    if (!preset) return;
    setShowEntityAdvanced(true);
    if (preset.filterField) setEntityFilterField(preset.filterField);
    if (typeof preset.filterValue === 'string') setEntityFilterValue(preset.filterValue);
    if (preset.groupBy) setEntityGroupBy(preset.groupBy);
  }, []);

  const entityContextPresets = useMemo(() => {
    const fields = (entityFilterFields || []).filter((f) => f?.id);
    if (fields.length === 0) return [];
    const findFieldId = (...keywords) => {
      const lowered = keywords.map((k) => safeString(k).toLowerCase());
      const hit = fields.find((f) => {
        const label = safeString(f.label || f.id).toLowerCase();
        return lowered.some((k) => label.includes(k));
      });
      return hit?.id || null;
    };
    const presets = [];
    const realmField = findFieldId('cảnh giới', 'tu vi', 'cấp độ');
    if (realmField) presets.push({ id: 'group-realm', label: 'Nhóm theo cảnh giới', groupBy: realmField });
    const systemField = findFieldId('hệ thống', 'class', 'chức nghiệp');
    if (systemField) presets.push({ id: 'filter-system', label: 'Lọc theo hệ thống', filterField: systemField, filterValue: '' });
    const statusField = findFieldId('trạng thái', 'sinh tồn');
    if (statusField) presets.push({ id: 'group-status', label: 'Nhóm theo trạng thái', groupBy: statusField });
    return presets;
  }, [entityFilterFields]);

  useEffect(() => {
    if (entityGroupBy === 'none') return;
    const valid = (entityFilterFields || []).some((f) => f?.id === entityGroupBy);
    if (!valid) setEntityGroupBy('none');
  }, [entityFilterFields, entityGroupBy]);
  useEffect(() => {
    if (entityFilterField === 'none') return;
    const valid = (entityFilterFields || []).some((f) => f?.id === entityFilterField);
    if (!valid) setEntityFilterField('none');
  }, [entityFilterFields, entityFilterField]);

  useEffect(() => {
    setEntityPage(1);
    setGroupVisibleCount({});
  }, [entitySearch, entityFilterField, entityFilterValue, entitySortMode, entityGroupBy, activeTabLon, activeTabNho]);

  useEffect(() => {
    if (!entityUiPrefsKey) return;
    const pref = entityUiPrefsByTab[entityUiPrefsKey];
    if (!pref) {
      setEntityFilterField('none');
      setEntityFilterValue('');
      setEntityGroupBy('none');
      setEntitySortMode('newest');
      setShowEntityAdvanced(false);
      return;
    }
    setEntityFilterField(pref.filterField || 'none');
    setEntityFilterValue(pref.filterValue || '');
    setEntityGroupBy(pref.groupBy || 'none');
    setEntitySortMode(pref.sortMode || 'newest');
    setShowEntityAdvanced(!!pref.showAdvanced);
  }, [entityUiPrefsByTab, entityUiPrefsKey]);
  useEffect(() => {
    if (!entityUiPrefsKey) return;
    setEntityUiPrefsByTab((prev) => ({
      ...prev,
      [entityUiPrefsKey]: {
        filterField: entityFilterField,
        filterValue: entityFilterValue,
        groupBy: entityGroupBy,
        sortMode: entitySortMode,
        showAdvanced: showEntityAdvanced,
      },
    }));
  }, [entityUiPrefsKey, entityFilterField, entityFilterValue, entityGroupBy, entitySortMode, showEntityAdvanced]);
  useEffect(() => {
    try {
      localStorage.setItem('tangthu_entity_ui_prefs_by_tab', JSON.stringify(entityUiPrefsByTab || {}));
    } catch {
      void 0;
    }
  }, [entityUiPrefsByTab]);

  return {
    entitySearch, setEntitySearch,
    entityFilterField, setEntityFilterField,
    entityFilterValue, setEntityFilterValue,
    entitySortMode, setEntitySortMode,
    entityGroupBy, setEntityGroupBy,
    showEntityAdvanced, setShowEntityAdvanced,
    entityPage, setEntityPage,
    groupVisibleCount, setGroupVisibleCount,
    isEntityAdvancedActive,
    entityFilterOptions,
    entityGroupOptions,
    clearEntityAdvanced,
    entityContextPresets,
    applyEntityPreset,
  };
}

