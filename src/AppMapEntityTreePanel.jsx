// ==========================================
// AppMapEntityTreePanel.jsx
// Purpose: drag-drop hierarchy hub for map collection entities (mapParentId).
// Imported by AppCollectionSection when tab is map scope.
// Notes: nhánh mặc định khóa; mở khóa mới kéo được; thả/chuột ra → khóa + xếp A→Z.
// ==========================================

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  Lock,
  LockOpen,
  MapPin,
  Plus,
  Unlink,
} from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import {
  buildMapBreadcrumb,
  buildMapForest,
  getDirectMapChildren,
  getMapBranchRoot,
  getSubtreeIds,
  readMapParentId,
} from './lib/mapEntityTree.js';

const PANEL_STORAGE_PREFIX = 'tt_map_entity_tree_panel_open';
const DND_TYPE = 'application/x-tt-map-entity-id';

function readPanelOpen(scopeKey, fallback) {
  if (!scopeKey || typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(`${PANEL_STORAGE_PREFIX}:${scopeKey}`);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* best effort */
  }
  return fallback;
}

function writePanelOpen(scopeKey, value) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${PANEL_STORAGE_PREFIX}:${scopeKey}`, value ? '1' : '0');
  } catch {
    /* best effort */
  }
}

function readDraggedId(event) {
  return (
    event.dataTransfer.getData(DND_TYPE) ||
    event.dataTransfer.getData('text/plain') ||
    ''
  ).trim();
}

function MapTreeNode({
  entity,
  depth,
  entities,
  selectedEntityId,
  collapsedIds,
  unlockedIds,
  draggedId,
  dropTargetId,
  onToggleCollapse,
  onToggleLock,
  onLockNode,
  onOpenEntity,
  onCreateChild,
  onDetachEntity,
  onDragEntityStart,
  onDragEntityEnd,
  onDragOverTarget,
  onDropOnTarget,
}) {
  const id = safeString(entity?.id);
  const name = safeString(entity?.name).trim() || 'Chưa đặt tên';
  const children = useMemo(() => getDirectMapChildren(entities, id), [entities, id]);
  const collapsed = collapsedIds.has(id);
  const isUnlocked = unlockedIds.has(id);
  const isActive = safeString(selectedEntityId) === id;
  const isDragging = draggedId === id;
  const isDropTarget = dropTargetId === id && draggedId && draggedId !== id;
  const childCount = children.length;
  const hasParent = Boolean(readMapParentId(entity));

  return (
    <div className="relative select-none">
      {depth > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-gradient-to-b from-emerald-800/50 via-slate-700/40 to-transparent"
          style={{ left: `${(depth - 1) * 18 + 18}px` }}
        />
      )}

      <div
        draggable={isUnlocked}
        onDragStart={(event) => {
          if (!isUnlocked) {
            event.preventDefault();
            return;
          }
          onDragEntityStart?.(event, id, name);
        }}
        onDragEnd={onDragEntityEnd}
        onDragOver={(event) => onDragOverTarget?.(event, id)}
        onDrop={(event) => onDropOnTarget?.(event, id)}
        onMouseLeave={() => {
          if (!isUnlocked || isDragging || draggedId) return;
          onLockNode?.(id, { reason: 'leave' });
        }}
        className={[
          'group relative flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition-all duration-150',
          isUnlocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          isDragging ? 'scale-[0.98] opacity-40 border-dashed border-slate-600' : '',
          isDropTarget
            ? 'border-emerald-400/70 bg-emerald-950/40 shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_8px_24px_rgba(16,185,129,0.12)]'
            : isUnlocked
              ? 'border-amber-500/45 bg-amber-950/20'
              : isActive
                ? 'border-cyan-500/50 bg-cyan-950/30 shadow-inner'
                : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/70',
        ].join(' ')}
        style={{ marginLeft: Math.min(depth, 10) * 18 }}
      >
        {depth > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute -left-[10px] top-1/2 h-px w-2.5 bg-slate-700/70"
          />
        )}

        <button
          type="button"
          title={
            isUnlocked
              ? 'Đang mở khóa — kéo sang cấp khác, thả hoặc đưa chuột ra để khóa & xếp A→Z'
              : 'Đã khóa — bấm để mở khóa rồi kéo đổi cấp'
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock?.(id);
          }}
          className={[
            'tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
            isUnlocked
              ? 'border-amber-500/50 bg-amber-950/40 text-amber-200 hover:bg-amber-900/45'
              : 'border-slate-700/80 bg-slate-900/70 text-slate-400 hover:border-emerald-700/50 hover:text-emerald-200',
          ].join(' ')}
          aria-label={isUnlocked ? `Mở khóa ${name}` : `Khóa ${name}`}
          aria-pressed={!isUnlocked}
        >
          {isUnlocked ? <LockOpen size={14} /> : <Lock size={14} />}
        </button>

        <span
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            isUnlocked ? 'text-amber-300' : 'text-slate-600',
          ].join(' ')}
          title={isUnlocked ? 'Kéo để đổi cấp' : 'Mở khóa trước khi kéo'}
        >
          <GripVertical size={15} />
        </span>

        {childCount > 0 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse?.(id);
            }}
            className="tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label={collapsed ? 'Mở nhánh' : 'Thu nhánh'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-700">
            <MapPin size={13} />
          </span>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenEntity?.(entity);
          }}
          className="tt-kbd-focus min-w-0 flex-1 truncate rounded-lg px-1.5 py-1 text-left font-serif text-[13px] font-semibold text-slate-100 hover:text-cyan-100"
          title={name}
        >
          {name}
        </button>

        {childCount > 0 && (
          <span className="hidden shrink-0 rounded-md border border-slate-700/80 bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">
            {childCount}
          </span>
        )}

        <button
          type="button"
          title={`Thêm con của ${name}`}
          onClick={(event) => {
            event.stopPropagation();
            onCreateChild?.(entity);
          }}
          className="tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 opacity-70 transition-all hover:border-emerald-700/45 hover:bg-emerald-950/30 hover:text-emerald-200 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Plus size={14} />
        </button>
        {hasParent ? (
          <button
            type="button"
            title={isUnlocked ? 'Gỡ khỏi cha (về Chưa gắn)' : 'Mở khóa trước khi gỡ cha'}
            disabled={!isUnlocked}
            onClick={(event) => {
              event.stopPropagation();
              if (!isUnlocked) return;
              onDetachEntity?.(entity);
              onLockNode?.(id, { reason: 'detach' });
            }}
            className="tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 opacity-70 transition-all hover:border-amber-700/45 hover:bg-amber-950/25 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-30 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Unlink size={13} />
          </button>
        ) : null}

        {isDropTarget && (
          <span className="pointer-events-none absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.65)]" />
        )}
      </div>

      {!collapsed && childCount > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <MapTreeNode
              key={child.id}
              entity={child}
              depth={depth + 1}
              entities={entities}
              selectedEntityId={selectedEntityId}
              collapsedIds={collapsedIds}
              unlockedIds={unlockedIds}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              onToggleCollapse={onToggleCollapse}
              onToggleLock={onToggleLock}
              onLockNode={onLockNode}
              onOpenEntity={onOpenEntity}
              onCreateChild={onCreateChild}
              onDetachEntity={onDetachEntity}
              onDragEntityStart={onDragEntityStart}
              onDragEntityEnd={onDragEntityEnd}
              onDragOverTarget={onDragOverTarget}
              onDropOnTarget={onDropOnTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const AppMapEntityTreePanel = memo(function AppMapEntityTreePanel({
  entities = [],
  selectedEntity,
  scopeKey,
  onMoveEntity,
  onCreateChild,
  onOpenEntity,
  onDetachEntity,
  onHideFeature,
}) {
  const selectedId = safeString(selectedEntity?.id);
  const forest = useMemo(() => buildMapForest(entities), [entities]);
  const breadcrumb = useMemo(
    () => buildMapBreadcrumb(entities, selectedId, { includeSelf: true }),
    [entities, selectedId]
  );

  const focusRoot = useMemo(() => {
    if (!selectedId) return null;
    return getMapBranchRoot(entities, selectedId) || selectedEntity || null;
  }, [entities, selectedId, selectedEntity]);

  const focusRootId = safeString(focusRoot?.id);
  const branchIds = useMemo(
    () => (focusRootId ? getSubtreeIds(entities, focusRootId) : new Set()),
    [entities, focusRootId]
  );

  const focusChildren = useMemo(
    () => (selectedId ? getDirectMapChildren(entities, selectedId) : []),
    [entities, selectedId]
  );

  const unattachedPool = useMemo(
    () => forest.roots.filter((ent) => !branchIds.has(safeString(ent?.id))),
    [forest.roots, branchIds]
  );

  const [isPanelOpen, setIsPanelOpen] = useState(() =>
    readPanelOpen(scopeKey, Boolean(selectedId) || forest.roots.length > 1)
  );
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [unlockedIds, setUnlockedIds] = useState(() => new Set());
  const [draggedId, setDraggedId] = useState(null);
  const [draggedName, setDraggedName] = useState('');
  const [dropTargetId, setDropTargetId] = useState(null);
  const [poolDropActive, setPoolDropActive] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createUnderId, setCreateUnderId] = useState(null);
  const [statusHint, setStatusHint] = useState('');
  const poolEnterCountRef = useRef(0);
  const hintTimerRef = useRef(0);
  const draggedIdRef = useRef(null);

  const showStatusHint = useCallback((message) => {
    setStatusHint(safeString(message));
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setStatusHint(''), 2800);
  }, []);

  useEffect(() => () => {
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const ancestors = buildMapBreadcrumb(entities, selectedId, { includeSelf: false });
    const ancestorIds = ancestors.map((item) => safeString(item?.id)).filter(Boolean);
    if (ancestorIds.length === 0) return;
    setCollapsedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      ancestorIds.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [entities, selectedId]);

  const setPanelOpen = (open) => {
    setIsPanelOpen(open);
    writePanelOpen(scopeKey, open);
  };

  const clearDragState = useCallback(() => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDraggedName('');
    setDropTargetId(null);
    setPoolDropActive(false);
    poolEnterCountRef.current = 0;
  }, []);

  const lockNode = useCallback((id, { reason } = {}) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setUnlockedIds((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    if (reason === 'leave' || reason === 'drop' || reason === 'detach') {
      showStatusHint('Đã khóa nhánh · cùng cấp xếp theo tên A→Z');
    }
  }, [showStatusHint]);

  const unlockNode = useCallback((id, { silent } = {}) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setUnlockedIds((prev) => {
      if (prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    if (!silent) {
      showStatusHint('Đã mở khóa — kéo sang cấp khác, thả chuột hoặc đưa chuột ra để khóa lại');
    }
  }, [showStatusHint]);

  const toggleLock = useCallback((id) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        showStatusHint('Đã khóa nhánh · cùng cấp xếp theo tên A→Z');
      } else {
        next.add(nodeId);
        showStatusHint('Đã mở khóa — kéo sang cấp khác, thả chuột hoặc đưa chuột ra để khóa lại');
      }
      return next;
    });
  }, [showStatusHint]);

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const beginCreateUnder = (parentEntity) => {
    setCreateUnderId(safeString(parentEntity?.id) || null);
    setCreateName('');
    setPanelOpen(true);
  };

  const submitCreate = (event) => {
    event?.preventDefault?.();
    const name = safeString(createName).trim();
    if (!name) return;
    const createdId = onCreateChild?.({
      name,
      parentId: createUnderId || selectedId || null,
    });
    setCreateName('');
    setCreateUnderId(null);
    const newId = safeString(createdId);
    if (newId) {
      unlockNode(newId, { silent: true });
      showStatusHint('Thẻ mới đang mở khóa — kéo tới cấp phù hợp, thả/chuột ra để khóa & xếp A→Z');
    }
  };

  const onDragEntityStart = useCallback((event, id, name) => {
    if (!unlockedIds.has(id)) {
      event.preventDefault();
      showStatusHint('Bấm biểu tượng khóa để mở khóa trước khi kéo');
      return;
    }
    event.dataTransfer.setData(DND_TYPE, id);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    try {
      event.dataTransfer.setDragImage(event.currentTarget, 28, 20);
    } catch {
      /* ignore */
    }
    draggedIdRef.current = id;
    setDraggedId(id);
    setDraggedName(safeString(name));
    setDropTargetId(null);
  }, [showStatusHint, unlockedIds]);

  const onDragEntityEnd = useCallback(() => {
    const id = draggedIdRef.current;
    clearDragState();
    if (id) lockNode(id, { reason: 'drop' });
  }, [clearDragState, lockNode]);

  const onDragOverTarget = useCallback((event, id) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetId((prev) => (prev === id ? prev : id));
    setPoolDropActive(false);
  }, []);

  const onDropOnTarget = useCallback(
    (event, id) => {
      event.preventDefault();
      event.stopPropagation();
      const fromId = readDraggedId(event) || draggedIdRef.current;
      clearDragState();
      if (!fromId || fromId === id) {
        if (fromId) lockNode(fromId, { reason: 'drop' });
        return;
      }
      onMoveEntity?.(fromId, id);
      lockNode(fromId, { reason: 'drop' });
    },
    [clearDragState, lockNode, onMoveEntity]
  );

  const titleId = `map-entity-tree-title-${selectedId || 'none'}`;
  const createParentLabel = createUnderId
    ? safeString(entities.find((e) => safeString(e?.id) === createUnderId)?.name).trim() || 'thẻ đã chọn'
    : safeString(selectedEntity?.name).trim() || 'gốc / chưa gắn';
  const dropHintName = dropTargetId
    ? safeString(entities.find((e) => safeString(e?.id) === dropTargetId)?.name).trim()
    : '';

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-emerald-900/35 bg-[var(--tt-surface-1)] shadow-[var(--tt-shadow-card)]">
      <div
        className={`flex flex-col gap-3 bg-gradient-to-r from-emerald-950/40 via-slate-950/20 to-transparent px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between ${
          isPanelOpen ? 'border-b border-slate-800/80' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-600/40 bg-emerald-950/45 text-emerald-200 shadow-inner">
            <FolderTree size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="text-base font-heading font-bold text-emerald-50">
                Cây thư mục
              </h3>
              <span className="rounded-md border border-emerald-800/50 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200/90">
                {entities.length} thẻ
              </span>
            </div>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-serif text-slate-400">
              {breadcrumb.length > 0 ? (
                breadcrumb.map((item, index) => {
                  const id = safeString(item?.id);
                  const name = safeString(item?.name).trim() || '—';
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <React.Fragment key={id || `${name}-${index}`}>
                      {index > 0 && <span className="text-slate-600">›</span>}
                      {isLast ? (
                        <span className="font-semibold text-emerald-200/90">{name}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenEntity?.(item)}
                          className="tt-kbd-focus rounded px-0.5 text-slate-400 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
                        >
                          {name}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <span>Khóa mặc định · mở khóa để kéo đổi cấp · thả chuột = khóa & xếp A→Z</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => beginCreateUnder(selectedEntity)}
            disabled={!selectedId}
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-emerald-800/55 bg-emerald-950/35 px-3 text-[12px] font-bold text-emerald-100 transition-colors hover:border-emerald-500/60 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus size={14} /> Con của thẻ này
          </button>
          {typeof onHideFeature === 'function' && (
            <button
              type="button"
              onClick={onHideFeature}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-[12px] font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
              title="Ẩn cây thư mục trên tab này (bật lại khi cần)"
            >
              <EyeOff size={14} /> Ẩn
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanelOpen(!isPanelOpen)}
            aria-expanded={isPanelOpen}
            aria-controls="map-entity-tree-body"
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-emerald-600/50 hover:text-emerald-200"
          >
            {isPanelOpen ? (
              <>
                <EyeOff size={14} /> Thu <ChevronUp size={13} />
              </>
            ) : (
              <>
                <Eye size={14} /> Hiện <ChevronDown size={13} />
              </>
            )}
          </button>
        </div>
      </div>

      {!isPanelOpen && (
        <div className="border-t border-slate-900/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-2.5">
            <p className="min-w-0 font-serif text-[12px] text-slate-400">
              {focusChildren.length > 0
                ? `${focusChildren.length} thẻ con trực tiếp · mở panel để xếp cây`
                : 'Đang thu gọn — mở để xếp cây thư mục'}
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-bold text-slate-300 hover:border-emerald-600/50 hover:text-emerald-200"
            >
              <Eye size={13} /> Mở
            </button>
          </div>
        </div>
      )}

      {isPanelOpen && (
        <div id="map-entity-tree-body" className="space-y-3 p-4" aria-labelledby={titleId}>
          {draggedId && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-700/40 bg-emerald-950/25 px-3 py-2 text-[12px] text-emerald-100">
              <LockOpen size={14} className="text-amber-300" />
              <span className="font-serif">
                Đang kéo <strong className="font-bold">{draggedName || 'thẻ'}</strong>
                {poolDropActive
                  ? ' → thả vào Chưa gắn để gỡ cha (rồi khóa lại)'
                  : dropHintName
                    ? ` → thả vào «${dropHintName}» để làm con`
                    : ' → thả lên thẻ đích'}
              </span>
            </div>
          )}
          {statusHint && !draggedId && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-[12px] font-serif text-amber-100">
              <Lock size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span>{statusHint}</span>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.85fr)]">
            <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/35 px-3.5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Cây từ gốc · khóa / A→Z
                </span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                  {focusChildren.length} con của thẻ đang mở
                </span>
              </div>
              <div className="max-h-[460px] space-y-1 overflow-y-auto p-3 custom-scrollbar">
                {focusRoot ? (
                  <MapTreeNode
                    entity={focusRoot}
                    depth={0}
                    entities={entities}
                    selectedEntityId={selectedId}
                    collapsedIds={collapsedIds}
                    unlockedIds={unlockedIds}
                    draggedId={draggedId}
                    dropTargetId={dropTargetId}
                    onToggleCollapse={toggleCollapse}
                    onToggleLock={toggleLock}
                    onLockNode={lockNode}
                    onOpenEntity={onOpenEntity}
                    onCreateChild={beginCreateUnder}
                    onDetachEntity={onDetachEntity}
                    onDragEntityStart={onDragEntityStart}
                    onDragEntityEnd={onDragEntityEnd}
                    onDragOverTarget={onDragOverTarget}
                    onDropOnTarget={onDropOnTarget}
                  />
                ) : (
                  <p className="px-3 py-10 text-center font-serif text-sm text-slate-500">
                    Chọn một thẻ để xem nhánh cây.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={[
                  'overflow-hidden rounded-xl border transition-all duration-150',
                  poolDropActive
                    ? 'border-amber-400/55 bg-amber-950/20 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]'
                    : 'border-slate-800/90 bg-slate-950/40',
                ].join(' ')}
                onDragEnter={(event) => {
                  event.preventDefault();
                  poolEnterCountRef.current += 1;
                  setPoolDropActive(true);
                  setDropTargetId(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setPoolDropActive(true);
                  setDropTargetId(null);
                }}
                onDragLeave={() => {
                  poolEnterCountRef.current = Math.max(0, poolEnterCountRef.current - 1);
                  if (poolEnterCountRef.current === 0) setPoolDropActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId = readDraggedId(event) || draggedIdRef.current;
                  clearDragState();
                  if (!fromId) return;
                  onMoveEntity?.(fromId, null);
                  lockNode(fromId, { reason: 'drop' });
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/35 px-3.5 py-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Chưa gắn / gốc khác
                  </span>
                  <span className="rounded-md border border-slate-700/80 bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    {unattachedPool.length}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2.5 custom-scrollbar">
                  {poolDropActive && (
                    <div className="mb-2 rounded-lg border border-dashed border-amber-500/45 bg-amber-950/20 px-3 py-2 text-center text-[11px] font-bold text-amber-100">
                      Thả để gỡ khỏi cha
                    </div>
                  )}
                  {unattachedPool.length > 0 ? (
                    <div className="space-y-1.5">
                      {unattachedPool.map((ent) => {
                        const id = safeString(ent?.id);
                        const name = safeString(ent?.name).trim() || 'Chưa đặt tên';
                        const isUnlocked = unlockedIds.has(id);
                        const isDragging = draggedId === id;
                        const isDropTarget = dropTargetId === id && draggedId && draggedId !== id;
                        return (
                          <div
                            key={id}
                            draggable={isUnlocked}
                            onDragStart={(event) => onDragEntityStart(event, id, name)}
                            onDragEnd={onDragEntityEnd}
                            onDragOver={(event) => onDragOverTarget(event, id)}
                            onDrop={(event) => onDropOnTarget(event, id)}
                            onMouseLeave={() => {
                              if (!isUnlocked || isDragging || draggedId) return;
                              lockNode(id, { reason: 'leave' });
                            }}
                            className={[
                              'group flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition-all duration-150',
                              isUnlocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                              isDragging ? 'scale-[0.98] opacity-40 border-dashed border-slate-600' : '',
                              isDropTarget
                                ? 'border-emerald-400/70 bg-emerald-950/35'
                                : isUnlocked
                                  ? 'border-amber-500/45 bg-amber-950/20'
                                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80',
                            ].join(' ')}
                          >
                            <button
                              type="button"
                              title={isUnlocked ? 'Đang mở khóa' : 'Đã khóa — bấm để mở khóa'}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleLock(id);
                              }}
                              className={[
                                'tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                                isUnlocked
                                  ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                                  : 'border-slate-700/80 bg-slate-950 text-slate-400 hover:text-emerald-200',
                              ].join(' ')}
                            >
                              {isUnlocked ? <LockOpen size={13} /> : <Lock size={13} />}
                            </button>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${isUnlocked ? 'text-amber-300' : 'text-slate-600'}`}>
                              <GripVertical size={14} />
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenEntity?.(ent);
                              }}
                              className="tt-kbd-focus min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left font-serif text-[13px] font-semibold text-slate-200 hover:text-cyan-100"
                            >
                              {name}
                            </button>
                            <button
                              type="button"
                              title={`Thêm con của ${name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                beginCreateUnder(ent);
                              }}
                              className="tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-950/30 hover:text-emerald-200"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 px-3 py-8 text-center">
                      <p className="font-serif text-[12px] text-slate-500">
                        Thả thẻ đã mở khóa vào đây để gỡ khỏi cha
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(createUnderId || selectedId) && (
                <form
                  onSubmit={submitCreate}
                  className="rounded-xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/30 to-slate-950/40 p-3.5"
                >
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-200">
                    <Plus size={13} /> Thêm thẻ con
                  </div>
                  <p className="mb-2.5 font-serif text-[12px] text-slate-400">
                    Cha: <span className="font-semibold text-slate-100">{createParentLabel}</span>
                    <span className="text-slate-500"> · thẻ mới tạm mở khóa để kéo xếp</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Tên thẻ mới"
                      className="tt-kbd-focus h-10 min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-emerald-500/55"
                    />
                    <button
                      type="submit"
                      disabled={!safeString(createName).trim()}
                      className="tt-kbd-focus flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-[12px] font-bold text-white shadow-lg transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Plus size={14} /> Tạo
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
