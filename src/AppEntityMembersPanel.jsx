// ==========================================
// AppEntityMembersPanel.jsx
// Purpose: manage child profiles (thẻ con) as a folder-like tree inside one entity.
// Imported by AppCollectionSection; persistence via App.jsx callbacks.
// Notes: parentId + sortOrder; unlock to drag branch / reorder; labels editable.
// ==========================================

import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Unlink,
  Users,
  X,
} from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import {
  DEFAULT_MEMBER_FIELD_LABELS,
  MEMBER_FIELD_KEYS,
  normalizeMemberFieldLabels,
  readEntityMembers,
  resolveMemberFieldLabels,
  resolveMemberPanelTitle,
} from './lib/entityMembers.js';
import {
  buildMemberForest,
  flattenMemberForest,
  getDirectMemberChildren,
  readMemberParentId,
} from './lib/entityMemberTree.js';
import {
  MEMBER_WIKI_CHIP_CLASS,
  MEMBER_WIKI_ICON_CLASS,
  MEMBER_WIKI_TEXT_CLASS,
  formatMemberRoleLine,
  resolveMemberRankStyle,
} from './lib/entityMemberRankStyle.js';
import { normalizeSearchText } from './lib/normalizeSearchText.js';

const EMPTY_MEMBER_DRAFT = {
  id: null,
  name: '',
  alias: '',
  role: '',
  status: '',
  info: '',
  parentId: null,
  sortOrder: undefined,
  wikiLinkOptOuts: [],
};

const PANEL_STORAGE_PREFIX = 'tt_entity_members_panel_open';
const DND_TYPE = 'application/x-tt-entity-member-id';

const FIELD_PLACEHOLDERS = {
  name: 'VD: tên hiển thị',
  alias: 'Tách bằng dấu phẩy / gạch chéo',
  role: 'VD: vai trò, loại, chức vị…',
  status: 'VD: trạng thái, cấp bậc…',
};

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

function toDraft(member) {
  if (!member) return { ...EMPTY_MEMBER_DRAFT };
  return {
    id: member.id || null,
    name: safeString(member.name),
    alias: safeString(member.alias),
    role: safeString(member.role),
    status: safeString(member.status),
    info: safeString(member.info),
    parentId: readMemberParentId(member),
    sortOrder: member.sortOrder,
    wikiLinkOptOuts: Array.isArray(member.wikiLinkOptOuts) ? member.wikiLinkOptOuts : [],
  };
}

function memberSearchBlob(member) {
  return [
    member?.name,
    member?.alias,
    member?.role,
    member?.status,
    member?.info,
  ].map(safeString).join(' ');
}

function MemberTreeNode({
  member,
  depth,
  members,
  activeId,
  collapsedIds,
  unlockedIds,
  draggedId,
  dropTargetId,
  onToggleCollapse,
  onToggleLock,
  onLockNode,
  onOpenMember,
  onEditMember,
  onEditMemberNotes,
  onDeleteMember,
  onCreateChild,
  onDetachMember,
  onReorderMember,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnTarget,
}) {
  const id = safeString(member?.id);
  const name = safeString(member?.name).trim() || 'Chưa đặt tên';
  const children = useMemo(() => getDirectMemberChildren(members, id), [members, id]);
  const collapsed = collapsedIds.has(id);
  const isUnlocked = unlockedIds.has(id);
  const isActive = safeString(activeId) === id;
  const isDragging = draggedId === id;
  const isDropTarget = dropTargetId === id && draggedId && draggedId !== id;
  const childCount = children.length;
  const hasParent = Boolean(readMemberParentId(member));
  const roleLine = formatMemberRoleLine(member);
  const rankStyle = resolveMemberRankStyle({
    role: member?.role,
    status: member?.status,
    depth,
  });
  const hasNotes = Boolean(safeString(member?.info).trim());

  const iconBtn =
    'tt-kbd-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800/80 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="select-none">
      <div
        draggable={isUnlocked}
        aria-level={depth + 1}
        onDragStart={(event) => {
          if (!isUnlocked) {
            event.preventDefault();
            return;
          }
          onDragStart?.(event, id, name);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOverTarget?.(event, id)}
        onDrop={(event) => onDropOnTarget?.(event, id)}
        onMouseLeave={() => {
          if (!isUnlocked || isDragging || draggedId) return;
          onLockNode?.(id);
        }}
        className={[
          'group relative grid h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-lg px-1.5 transition-colors',
          isUnlocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          isDragging ? 'opacity-35' : '',
          isDropTarget
            ? 'bg-cyan-950/40 ring-1 ring-cyan-500/50'
            : isUnlocked
              ? 'bg-amber-950/25 ring-1 ring-amber-500/35'
              : isActive
                ? 'bg-cyan-950/30 ring-1 ring-cyan-600/35'
                : 'hover:bg-slate-900/70',
        ].join(' ')}
      >
        {/* Cột điều khiển cây */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={isUnlocked ? 'Đang mở khóa — kéo hoặc ↑↓' : 'Mở khóa để kéo xếp'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock?.(id);
            }}
            className={[
              iconBtn,
              isUnlocked
                ? 'text-amber-300 opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            ].join(' ')}
            aria-pressed={!isUnlocked}
          >
            {isUnlocked ? <LockOpen size={13} /> : <Lock size={13} />}
          </button>

          <span
            className={[
              'flex h-7 w-4 items-center justify-center',
              isUnlocked ? 'text-amber-400/90' : 'text-slate-700 opacity-0 group-hover:opacity-100',
            ].join(' ')}
            title={isUnlocked ? 'Kéo để đổi cấp' : ''}
          >
            <GripVertical size={13} />
          </span>

          {childCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapse?.(id);
              }}
              className={iconBtn}
              aria-label={collapsed ? 'Mở nhánh' : 'Thu nhánh'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center text-slate-700">
              <span className="h-1 w-1 rounded-full bg-slate-600" />
            </span>
          )}
        </div>

        {/* Danh xưng wiki + meta cùng một dòng */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMember?.(member);
          }}
          title={name ? `Wiki [[${name}]] — bấm để mở hồ sơ` : 'Chưa đặt tên'}
          className="tt-kbd-focus flex min-w-0 items-center gap-2 rounded-md px-0.5 py-0.5 text-left"
        >
          <span className={`${MEMBER_WIKI_CHIP_CLASS} min-w-0`}>
            <Link2 size={12} className={MEMBER_WIKI_ICON_CLASS} />
            <span className={MEMBER_WIKI_TEXT_CLASS} title={name ? `[[${name}]]` : undefined}>
              {name || 'Chưa đặt tên'}
            </span>
          </span>
          {roleLine ? (
            <span
              className={`inline-flex max-w-[42%] shrink-0 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${rankStyle.chip}`}
              title={`${rankStyle.label}: ${roleLine}`}
            >
              {roleLine}
            </span>
          ) : (
            <span
              className={`hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70 sm:inline-flex ${rankStyle.chip}`}
              title={`Cấp nhánh (theo cây): ${rankStyle.label}`}
            >
              {rankStyle.label}
            </span>
          )}
          {childCount > 0 ? (
            <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-500">
              {childCount}
            </span>
          ) : null}
        </button>

        {/* Thanh hành động cố định — luôn cùng số nút */}
        <div className="flex items-center justify-end gap-0.5">
          {isUnlocked ? (
            <>
              <button
                type="button"
                title="Đưa lên"
                onClick={(event) => {
                  event.stopPropagation();
                  onReorderMember?.(id, 'up');
                }}
                className={iconBtn}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                title="Đưa xuống"
                onClick={(event) => {
                  event.stopPropagation();
                  onReorderMember?.(id, 'down');
                }}
                className={iconBtn}
              >
                <ArrowDown size={13} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            title={`Thêm con của ${name}`}
            onClick={(event) => {
              event.stopPropagation();
              onCreateChild?.(member);
            }}
            className={`${iconBtn} opacity-0 group-hover:opacity-100 focus-visible:opacity-100`}
          >
            <Plus size={14} />
          </button>

          <button
            type="button"
            title={hasParent ? (isUnlocked ? 'Gỡ về gốc' : 'Mở khóa để gỡ cha') : 'Đã ở gốc'}
            disabled={!hasParent || !isUnlocked}
            onClick={(event) => {
              event.stopPropagation();
              if (!hasParent || !isUnlocked) return;
              onDetachMember?.(member);
              onLockNode?.(id);
            }}
            className={`${iconBtn} ${hasParent ? 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100' : 'invisible'}`}
          >
            <Unlink size={13} />
          </button>

          <button
            type="button"
            title="Ghi chép"
            onClick={(event) => {
              event.stopPropagation();
              onEditMemberNotes?.(member);
            }}
            className={`${iconBtn} opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${
              hasNotes ? 'text-amber-300 opacity-100' : ''
            }`}
          >
            <BookOpen size={13} />
          </button>

          <button
            type="button"
            title="Sửa"
            onClick={(event) => {
              event.stopPropagation();
              onEditMember?.(member);
            }}
            className={`${iconBtn} opacity-0 group-hover:opacity-100 focus-visible:opacity-100`}
          >
            <Pencil size={13} />
          </button>

          <button
            type="button"
            title="Xóa"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteMember?.(member);
            }}
            className={`${iconBtn} text-rose-400/70 opacity-0 hover:text-rose-200 group-hover:opacity-100 focus-visible:opacity-100`}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {isDropTarget && (
          <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-cyan-400/70" />
        )}
      </div>

      {!collapsed && childCount > 0 && (
        <div className="ml-7 border-l border-slate-800/80">
          {children.map((child) => (
            <MemberTreeNode
              key={child.id}
              member={child}
              depth={depth + 1}
              members={members}
              activeId={activeId}
              collapsedIds={collapsedIds}
              unlockedIds={unlockedIds}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              onToggleCollapse={onToggleCollapse}
              onToggleLock={onToggleLock}
              onLockNode={onLockNode}
              onOpenMember={onOpenMember}
              onEditMember={onEditMember}
              onEditMemberNotes={onEditMemberNotes}
              onDeleteMember={onDeleteMember}
              onCreateChild={onCreateChild}
              onDetachMember={onDetachMember}
              onReorderMember={onReorderMember}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverTarget={onDragOverTarget}
              onDropOnTarget={onDropOnTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const AppEntityMembersPanel = memo(function AppEntityMembersPanel({
  selectedEntity,
  tabConfig = null,
  scopeKey,
  onSaveMember,
  onDeleteMember,
  onOpenMember,
  onEditMemberNotes,
  onSaveMemberFieldMeta,
  onMoveMember,
  onReorderMember,
  /** Khi nằm trong hub cấu trúc: bỏ khung ngoài + header lớn. */
  embedded = false,
  /** Ẩn nút thu panel (hub quản lý). */
  hideCollapse = false,
}) {
  const members = useMemo(() => readEntityMembers(selectedEntity), [selectedEntity]);
  const forest = useMemo(() => buildMemberForest(members), [members]);
  const resolvedLabels = useMemo(
    () => resolveMemberFieldLabels(selectedEntity, tabConfig),
    [selectedEntity, tabConfig]
  );
  const resolvedPanelTitle = useMemo(
    () => resolveMemberPanelTitle(selectedEntity, tabConfig),
    [selectedEntity, tabConfig]
  );

  const [draft, setDraft] = useState(EMPTY_MEMBER_DRAFT);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(() =>
    embedded ? true : readPanelOpen(scopeKey, members.length > 0)
  );
  const [isLabelEditorOpen, setIsLabelEditorOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState(() => ({ ...resolvedLabels }));
  const [panelTitleDraft, setPanelTitleDraft] = useState(resolvedPanelTitle);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [unlockedIds, setUnlockedIds] = useState(() => new Set());
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [rootDropActive, setRootDropActive] = useState(false);
  const [statusHint, setStatusHint] = useState('');
  const deferredQuery = useDeferredValue(query);
  const hintTimerRef = useRef(0);
  const rootEnterCountRef = useRef(0);

  useEffect(() => {
    if (!isLabelEditorOpen) {
      setLabelDraft({ ...resolvedLabels });
      setPanelTitleDraft(resolvedPanelTitle);
    }
  }, [resolvedLabels, resolvedPanelTitle, isLabelEditorOpen]);

  useEffect(() => () => {
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
  }, []);

  const showHint = useCallback((message) => {
    setStatusHint(safeString(message));
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setStatusHint(''), 2600);
  }, []);

  const searchActive = Boolean(normalizeSearchText(deferredQuery));
  const filteredFlat = useMemo(() => {
    const q = normalizeSearchText(deferredQuery);
    if (!q) return null;
    return flattenMemberForest(members).filter(({ member }) =>
      normalizeSearchText(memberSearchBlob(member)).includes(q)
    );
  }, [members, deferredQuery]);

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const closeForm = () => {
    setDraft({ ...EMPTY_MEMBER_DRAFT });
    setIsFormOpen(false);
  };
  const setPanelOpen = (open) => {
    setIsPanelOpen(open);
    writePanelOpen(scopeKey, open);
  };
  const startCreate = (parentMember = null) => {
    setDraft({
      ...EMPTY_MEMBER_DRAFT,
      parentId: parentMember?.id || null,
    });
    setIsFormOpen(true);
    setIsLabelEditorOpen(false);
  };
  const startCreateAndOpen = () => {
    setPanelOpen(true);
    startCreate(null);
  };
  const startEdit = (member) => {
    setPanelOpen(true);
    setDraft(toDraft(member));
    setIsFormOpen(true);
    setIsLabelEditorOpen(false);
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    onSaveMember?.(draft);
    closeForm();
  };

  const handleSaveLabels = (event) => {
    event?.preventDefault?.();
    const nextLabels = normalizeMemberFieldLabels(labelDraft);
    const nextTitle = safeString(panelTitleDraft).trim() || resolvedPanelTitle;
    onSaveMemberFieldMeta?.({
      memberFieldLabels: nextLabels,
      memberPanelTitle: nextTitle,
    });
    setLabelDraft(nextLabels);
    setPanelTitleDraft(nextTitle);
    setIsLabelEditorOpen(false);
  };

  const toggleCollapse = useCallback((id) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const lockNode = useCallback((id) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setUnlockedIds((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const toggleLock = useCallback((id) => {
    const nodeId = safeString(id);
    if (!nodeId) return;
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        showHint('Đã khóa — thứ tự & nhánh được giữ');
      } else {
        next.add(nodeId);
        showHint('Đã mở khóa — kéo sang cấp khác hoặc dùng ↑↓ đổi thứ tự');
      }
      return next;
    });
  }, [showHint]);

  const clearDrag = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    setRootDropActive(false);
    rootEnterCountRef.current = 0;
  }, []);

  const onDragStart = useCallback((event, id, name) => {
    event.dataTransfer.setData(DND_TYPE, id);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
    showHint(`Đang kéo «${name}» — thả lên thẻ khác để làm con, hoặc vào vùng Gốc`);
  }, [showHint]);

  const onDragOverTarget = useCallback((event, id) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== id) setDropTargetId(id);
  }, [draggedId]);

  const onDropOnTarget = useCallback((event, targetId) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = readDraggedId(event) || draggedId;
    clearDrag();
    if (!sourceId || sourceId === targetId) return;
    onMoveMember?.(sourceId, targetId);
    lockNode(sourceId);
  }, [clearDrag, draggedId, lockNode, onMoveMember]);

  const onDropToRoot = useCallback((event) => {
    event.preventDefault();
    const sourceId = readDraggedId(event) || draggedId;
    clearDrag();
    if (!sourceId) return;
    onMoveMember?.(sourceId, null);
    lockNode(sourceId);
  }, [clearDrag, draggedId, lockNode, onMoveMember]);

  const draftName = safeString(draft.name).trim();
  const isEditingExisting = Boolean(draft.id);
  const panelTitleId = `entity-members-title-${safeString(selectedEntity?.id) || 'none'}`;
  const labels = isLabelEditorOpen ? normalizeMemberFieldLabels(labelDraft) : resolvedLabels;
  const panelTitle = isLabelEditorOpen
    ? (safeString(panelTitleDraft).trim() || resolvedPanelTitle)
    : resolvedPanelTitle;
  const parentHint = draft.parentId
    ? members.find((item) => safeString(item?.id) === safeString(draft.parentId))
    : null;

  return (
    <section
      className={
        embedded
          ? 'overflow-hidden'
          : 'mb-8 overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/35 shadow-inner'
      }
    >
      {!embedded && (
      <div className={`flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between ${isPanelOpen ? 'border-b border-slate-800/90' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-700/40 bg-violet-950/30 text-violet-300">
            <Users size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={panelTitleId} className="text-base font-heading font-bold text-violet-100">{panelTitle}</h3>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {members.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 font-serif">
              {safeString(selectedEntity?.name) || 'Thẻ đang chọn'}
              {statusHint ? ` · ${statusHint}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPanelOpen && (
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Lọc ${panelTitle.toLowerCase()}...`}
                className="tt-kbd-focus h-9 w-52 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-[12px] text-slate-200 outline-none focus:border-violet-600/50"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setPanelOpen(true);
              setIsLabelEditorOpen((open) => !open);
              setIsFormOpen(false);
            }}
            title="Đổi tiêu đề panel và nhãn 4 trường"
            className={`tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold transition-colors ${
              isLabelEditorOpen
                ? 'border-violet-600/55 bg-violet-950/30 text-violet-200'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-violet-600/50 hover:text-violet-200'
            }`}
          >
            <Settings2 size={14} /> Nhãn
          </button>
          <button
            type="button"
            onClick={startCreateAndOpen}
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-violet-600/50 hover:text-violet-200"
          >
            <Plus size={14} /> Mới
          </button>
          {!hideCollapse && (
          <button
            type="button"
            onClick={() => setPanelOpen(!isPanelOpen)}
            aria-expanded={isPanelOpen}
            aria-controls="entity-members-panel-body"
            className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[12px] font-bold text-slate-300 transition-colors hover:border-violet-600/50 hover:text-violet-200"
          >
            {isPanelOpen ? <><EyeOff size={14} /> Ẩn <ChevronUp size={13} /></> : <><Eye size={14} /> Hiện <ChevronDown size={13} /></>}
          </button>
          )}
        </div>
      </div>
      )}

      {embedded && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Lọc ${panelTitle.toLowerCase()}...`}
              className="tt-kbd-focus h-9 w-full max-w-xs rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 text-[12px] text-slate-200 outline-none focus:border-violet-600/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsLabelEditorOpen((open) => !open);
                setIsFormOpen(false);
              }}
              className={`tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold ${
                isLabelEditorOpen
                  ? 'border-violet-600/55 bg-violet-950/30 text-violet-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-violet-200'
              }`}
            >
              <Settings2 size={14} /> Nhãn
            </button>
            <button
              type="button"
              onClick={startCreateAndOpen}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-violet-800/50 bg-violet-950/35 px-2.5 text-[12px] font-bold text-violet-100 hover:bg-violet-900/40"
            >
              <Plus size={14} /> Mới
            </button>
          </div>
        </div>
      )}

      {!embedded && !isPanelOpen && (
        <div className="border-t border-slate-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/25 px-3 py-2.5">
            <div className="min-w-0 text-[12px] font-serif text-slate-400">
              {members.length > 0
                ? forest.roots.slice(0, 3).map((member) => safeString(member?.name)).filter(Boolean).join(' · ')
                : 'Đang thu gọn'}
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-[11px] font-bold text-slate-300 hover:border-violet-600/50 hover:text-violet-200"
            >
              <Eye size={13} /> Mở
            </button>
          </div>
        </div>
      )}

      {(embedded || isPanelOpen) && (
        <div
          id="entity-members-panel-body"
          aria-labelledby={panelTitleId}
          className={`grid gap-4 ${embedded ? '' : 'p-4'} ${
            isFormOpen || isLabelEditorOpen
              ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]'
              : ''
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {searchActive ? 'Kết quả lọc' : 'Cây thẻ con'}
              </span>
              <span className="text-[11px] tabular-nums text-slate-500">
                {searchActive ? `${filteredFlat?.length || 0}/${members.length}` : members.length}
              </span>
            </div>

            {!searchActive && (
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  rootEnterCountRef.current += 1;
                  setRootDropActive(true);
                }}
                onDragLeave={() => {
                  rootEnterCountRef.current = Math.max(0, rootEnterCountRef.current - 1);
                  if (rootEnterCountRef.current === 0) setRootDropActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={onDropToRoot}
                className={`border-b border-dashed px-3 py-1.5 text-center text-[11px] transition-colors ${
                  rootDropActive
                    ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                    : 'border-slate-800/80 text-slate-600'
                }`}
              >
                Thả vào đây để đưa lên gốc
              </div>
            )}

            <div className={`${isFormOpen || isLabelEditorOpen ? 'max-h-[min(420px,55vh)]' : 'max-h-[480px]'} overflow-y-auto py-1 custom-scrollbar`}>
              {searchActive ? (
                filteredFlat?.length ? (
                  <div className="px-1">
                    {filteredFlat.map(({ member, depth }) => {
                      const name = safeString(member.name).trim();
                      const roleLine = [member.role, member.status].map(safeString).filter(Boolean).join(' · ');
                      return (
                        <div
                          key={member.id}
                          className="grid h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 hover:bg-slate-900/70"
                          style={{ paddingLeft: `${8 + Math.min(depth, 8) * 14}px` }}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenMember?.(member)}
                            className="tt-kbd-focus flex min-w-0 items-center gap-2 text-left"
                          >
                            <span className={`${MEMBER_WIKI_CHIP_CLASS} min-w-0`}>
                              <Link2 size={12} className={MEMBER_WIKI_ICON_CLASS} />
                              <span className={MEMBER_WIKI_TEXT_CLASS}>{name || 'Chưa đặt tên'}</span>
                            </span>
                            {roleLine ? (
                              <span
                                className={`inline-flex max-w-[40%] shrink-0 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  resolveMemberRankStyle({
                                    role: member.role,
                                    status: member.status,
                                    depth,
                                  }).chip
                                }`}
                              >
                                {roleLine}
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="tt-kbd-focus flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-cyan-200"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[100px] items-center justify-center text-sm font-serif text-slate-500">Không có kết quả.</div>
                )
              ) : forest.roots.length > 0 ? (
                <div>
                  {forest.roots.map((member) => (
                    <MemberTreeNode
                      key={member.id}
                      member={member}
                      depth={0}
                      members={members}
                      activeId={draft.id}
                      collapsedIds={collapsedIds}
                      unlockedIds={unlockedIds}
                      draggedId={draggedId}
                      dropTargetId={dropTargetId}
                      onToggleCollapse={toggleCollapse}
                      onToggleLock={toggleLock}
                      onLockNode={lockNode}
                      onOpenMember={onOpenMember}
                      onEditMember={startEdit}
                      onEditMemberNotes={onEditMemberNotes}
                      onDeleteMember={onDeleteMember}
                      onCreateChild={(parent) => {
                        setPanelOpen(true);
                        startCreate(parent);
                      }}
                      onDetachMember={(item) => onMoveMember?.(item.id, null)}
                      onReorderMember={onReorderMember}
                      onDragStart={onDragStart}
                      onDragEnd={clearDrag}
                      onDragOverTarget={onDragOverTarget}
                      onDropOnTarget={onDropOnTarget}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[116px] flex-col items-center justify-center px-4 py-6 text-center">
                  <Users size={22} className="mb-2 text-slate-600" />
                  <p className="text-sm font-serif text-slate-500">Chưa có thẻ con.</p>
                  <p className="mt-1 text-[11px] text-slate-600">VD: Tông chủ → Trưởng lão → Đệ tử</p>
                </div>
              )}
            </div>
          </div>

          {isLabelEditorOpen && (
            <form onSubmit={handleSaveLabels} className="rounded-lg border border-cyan-800/40 bg-slate-900/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-heading font-bold text-slate-100">Nhãn trường thẻ con</h4>
                  <p className="mt-1 text-[12px] font-serif text-slate-500">
                    Đổi tiêu đề panel và tên 4 trường — áp dụng cho thẻ cha đang mở.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLabelEditorOpen(false)}
                  className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-bold text-slate-300 hover:text-slate-100"
                >
                  <X size={13} /> Hủy
                </button>
              </div>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Tiêu đề panel</span>
                <input
                  value={panelTitleDraft}
                  onChange={(e) => setPanelTitleDraft(e.target.value)}
                  placeholder="VD: Thẻ con, Nhân vật, Vật phẩm…"
                  className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {MEMBER_FIELD_KEYS.map((key) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Nhãn trường «{key}»
                    </span>
                    <input
                      value={labelDraft[key] || ''}
                      onChange={(e) => setLabelDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={DEFAULT_MEMBER_FIELD_LABELS[key]}
                      className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="tt-kbd-focus flex h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-cyan-600"
                >
                  <Save size={15} /> Lưu nhãn
                </button>
              </div>
            </form>
          )}

          {isFormOpen && !isLabelEditorOpen && (
            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-800 bg-slate-900/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-heading font-bold text-slate-100">
                    {isEditingExisting ? 'Sửa hồ sơ' : `Thêm ${panelTitle.toLowerCase()}`}
                  </h4>
                  {parentHint && (
                    <p className="mt-1 text-[12px] font-serif text-slate-500">
                      Cha: <span className="text-cyan-200">{safeString(parentHint.name)}</span>
                    </p>
                  )}
                  {draftName && (
                    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-violet-700/40 bg-violet-950/25 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                      <Link2 size={11} className="shrink-0" />
                      <span className="truncate">[[{draftName}]]</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="tt-kbd-focus flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-bold text-slate-300 hover:text-slate-100"
                >
                  <X size={13} /> Hủy
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {MEMBER_FIELD_KEYS.map((key) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {labels[key]}
                    </span>
                    <input
                      value={draft[key] || ''}
                      onChange={(e) => patchDraft({ [key]: e.target.value })}
                      placeholder={FIELD_PLACEHOLDERS[key]}
                      className="tt-kbd-focus h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-600/50"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-amber-800/35 bg-amber-950/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-200">
                      <BookOpen size={13} /> Ghi chép chi tiết
                    </div>
                    <p className="mt-1 text-[12px] font-serif text-slate-400">
                      Dùng khu Ghi Chép Chi Tiết của thẻ cha. Nội dung lưu riêng vào thẻ con này.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!isEditingExisting}
                    onClick={() => onEditMemberNotes?.(draft)}
                    className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-amber-700/45 bg-amber-950/25 px-3 text-[12px] font-bold text-amber-200 transition-colors hover:bg-amber-900/35 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <BookOpen size={14} /> Mở ghi chép
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="tt-kbd-focus flex h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!draftName}
                >
                  <Save size={15} /> {isEditingExisting ? 'Lưu thay đổi' : 'Lưu thẻ con'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
});
