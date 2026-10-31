// ==========================================
// AppEntityStructureHub.jsx
// Purpose: unified shell when Thẻ con + Cây thư mục appear on one entity detail.
// Imported by AppCollectionSection; panels render embedded inside.
// Notes: violet = hồ sơ nhúng; emerald = thẻ thật cùng tab. Cả hai có ẩn/hiện.
// ==========================================

import React, { memo, useMemo, useState } from 'react';
import { Columns2, ChevronDown, ChevronUp, Eye, EyeOff, FolderTree, LayoutPanelTop, Users } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { AppEntityMembersPanel } from './AppEntityMembersPanel.jsx';
import { AppMapEntityTreePanel } from './AppMapEntityTreePanel.jsx';
import { readEntityMembers } from './lib/entityMembers.js';

const HUB_MODE_PREFIX = 'tt_entity_structure_hub_mode';
const MEMBERS_FEATURE_PREFIX = 'tt_entity_members_feature_on';
const HUB_OPEN_PREFIX = 'tt_entity_structure_hub_open';

function writeHubOpen(scopeKey, value) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${HUB_OPEN_PREFIX}:${scopeKey}`, value ? '1' : '0');
  } catch {
    /* best effort */
  }
}

function readHubMode(scopeKey, fallback) {
  if (!scopeKey || typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(`${HUB_MODE_PREFIX}:${scopeKey}`);
    if (saved === 'split' || saved === 'members' || saved === 'tree') return saved;
  } catch {
    /* best effort */
  }
  return fallback;
}

function writeHubMode(scopeKey, mode) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${HUB_MODE_PREFIX}:${scopeKey}`, mode);
  } catch {
    /* best effort */
  }
}

function readMembersFeatureOn(scopeKey, fallback) {
  if (!scopeKey || typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(`${MEMBERS_FEATURE_PREFIX}:${scopeKey}`);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* best effort */
  }
  return fallback;
}

function writeMembersFeatureOn(scopeKey, value) {
  if (!scopeKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${MEMBERS_FEATURE_PREFIX}:${scopeKey}`, value ? '1' : '0');
  } catch {
    /* best effort */
  }
}

function pickDefaultMode({ membersOn, treeOn }) {
  if (membersOn && treeOn) return 'split';
  if (treeOn) return 'tree';
  return 'members';
}

export const AppEntityStructureHub = memo(function AppEntityStructureHub({
  selectedEntity,
  scopeKey,
  treeFeatureOn = false,
  onEnableTree,
  membersPanelProps = {},
  treePanelProps = null,
}) {
  const memberCount = useMemo(
    () => readEntityMembers(selectedEntity).length,
    [selectedEntity]
  );
  const entityName = safeString(selectedEntity?.name).trim() || 'Thẻ đang chọn';

  const [membersFeatureOn, setMembersFeatureOn] = useState(() =>
    readMembersFeatureOn(scopeKey, true)
  );
  // Mỗi lần mở/chuyển thẻ đều bắt đầu thu gọn; người dùng chủ động mở khi cần.
  const [hubOpen, setHubOpen] = useState(false);
  const [mode, setMode] = useState(() =>
    readHubMode(
      scopeKey,
      pickDefaultMode({
        membersOn: readMembersFeatureOn(scopeKey, true),
        treeOn: treeFeatureOn,
      })
    )
  );
  const [appliedScope, setAppliedScope] = useState({ scopeKey, treeFeatureOn });
  if (appliedScope.scopeKey !== scopeKey || appliedScope.treeFeatureOn !== treeFeatureOn) {
    const openedAnotherEntity = appliedScope.scopeKey !== scopeKey;
    setAppliedScope({ scopeKey, treeFeatureOn });
    setMembersFeatureOn(readMembersFeatureOn(scopeKey, true));
    if (openedAnotherEntity) setHubOpen(false);
    setMode(
      readHubMode(
        scopeKey,
        pickDefaultMode({
          membersOn: readMembersFeatureOn(scopeKey, true),
          treeOn: treeFeatureOn,
        })
      )
    );
  }
  if (!membersFeatureOn && (mode === 'members' || mode === 'split')) {
    setMode(treeFeatureOn ? 'tree' : 'members');
  }
  if (!treeFeatureOn && (mode === 'tree' || mode === 'split')) {
    setMode('members');
  }

  const setHubMode = (next) => {
    setMode(next);
    writeHubMode(scopeKey, next);
  };

  const setStructureOpen = (open) => {
    setHubOpen(open);
    writeHubOpen(scopeKey, open);
  };

  const enableMembers = () => {
    setMembersFeatureOn(true);
    writeMembersFeatureOn(scopeKey, true);
    const next = treeFeatureOn ? 'split' : 'members';
    setHubMode(next);
  };

  const hideMembers = () => {
    setMembersFeatureOn(false);
    writeMembersFeatureOn(scopeKey, false);
    if (treeFeatureOn) setHubMode('tree');
  };

  const showMembers = membersFeatureOn && (mode === 'members' || mode === 'split');
  const showTree = treeFeatureOn && (mode === 'tree' || mode === 'split');
  const bothOff = !membersFeatureOn && !treeFeatureOn;

  const modeBtn = (id, label, icon, activeClass, disabled = false) => {
    const active = mode === id;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setHubMode(id)}
        className={`tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? activeClass
            : 'border-slate-700/80 bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/40 shadow-[inset_0_1px_0_rgba(148,163,184,0.04)]">
      <div className={`bg-gradient-to-r from-violet-950/25 via-slate-950/40 to-emerald-950/20 px-4 py-3.5 ${hubOpen ? 'border-b border-slate-800/80' : ''}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-heading font-bold text-slate-100">Cấu trúc hồ sơ</h3>
              <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {entityName}
              </span>
              {!hubOpen && (
                <span className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  Đang thu gọn
                </span>
              )}
            </div>
            {hubOpen ? (
              <>
                <p className="mt-1 max-w-2xl font-serif text-[12px] leading-relaxed text-slate-500">
                  <span className="text-violet-300/90">Thẻ con</span>
                  {' '}— hồ sơ nhúng trong thẻ này.
                  {' '}
                  <span className="text-emerald-300/90">Cây thư mục</span>
                  {' '}— thẻ thật cùng tab (cha/con). Có thể ẩn từng phần.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                  {membersFeatureOn ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-violet-700/45 bg-violet-950/35 px-2 py-0.5 text-violet-200">
                      <Users size={11} /> Thẻ con · {memberCount}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-slate-500">
                      <Users size={11} /> Thẻ con · tắt
                    </span>
                  )}
                  {treeFeatureOn ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-700/45 bg-emerald-950/35 px-2 py-0.5 text-emerald-200">
                      <FolderTree size={11} /> Cây thư mục · bật
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-slate-500">
                      <FolderTree size={11} /> Cây thư mục · tắt
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-1 truncate font-serif text-[12px] text-slate-500">
                {[
                  membersFeatureOn ? `Thẻ con ${memberCount}` : null,
                  treeFeatureOn ? 'Cây thư mục' : null,
                ].filter(Boolean).join(' · ') || 'Thẻ con & cây thư mục'}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {hubOpen && membersFeatureOn &&
              modeBtn(
                'members',
                'Thẻ con',
                <Users size={14} />,
                'border-violet-500/55 bg-violet-950/40 text-violet-100'
              )}
            {hubOpen && treeFeatureOn &&
              modeBtn(
                'tree',
                'Cây thẻ thật',
                <FolderTree size={14} />,
                'border-emerald-500/55 bg-emerald-950/40 text-emerald-100'
              )}
            {hubOpen && membersFeatureOn &&
              treeFeatureOn &&
              modeBtn(
                'split',
                'Cả hai',
                <Columns2 size={14} />,
                'border-slate-400/40 bg-slate-800/60 text-slate-100'
              )}

            {hubOpen && (membersFeatureOn ? (
              <button
                type="button"
                onClick={hideMembers}
                className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 text-[12px] font-bold text-slate-400 hover:text-violet-200"
                title="Ẩn panel thẻ con trên thẻ này"
              >
                <EyeOff size={14} /> Ẩn thẻ con
              </button>
            ) : (
              <button
                type="button"
                onClick={enableMembers}
                className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-violet-800/55 bg-violet-950/35 px-2.5 text-[12px] font-bold text-violet-100 hover:bg-violet-900/40"
              >
                <Eye size={14} /> Hiện thẻ con
              </button>
            ))}

            {hubOpen && !treeFeatureOn && typeof onEnableTree === 'function' ? (
              <button
                type="button"
                onClick={onEnableTree}
                className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-emerald-800/55 bg-emerald-950/35 px-2.5 text-[12px] font-bold text-emerald-100 hover:bg-emerald-900/40"
              >
                <Eye size={14} /> Hiện cây thư mục
              </button>
            ) : null}
            {hubOpen && treeFeatureOn && typeof treePanelProps?.onHideFeature === 'function' ? (
              <button
                type="button"
                onClick={() => {
                  treePanelProps.onHideFeature();
                  if (membersFeatureOn) setHubMode('members');
                }}
                className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-200"
                title="Ẩn cây thư mục trên tab này"
              >
                <EyeOff size={14} /> Ẩn cây
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setStructureOpen(!hubOpen)}
              aria-expanded={hubOpen}
              className="tt-kbd-focus flex h-9 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-2.5 text-[12px] font-bold text-slate-200 hover:border-slate-400 hover:text-white"
              title={hubOpen ? 'Thu gọn cả khu cấu trúc hồ sơ' : 'Hiện khu cấu trúc hồ sơ'}
            >
              {hubOpen ? (
                <><EyeOff size={14} /> Ẩn khu <ChevronUp size={13} /></>
              ) : (
                <><Eye size={14} /> Hiện khu <ChevronDown size={13} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {hubOpen && (
      <div
        className={`p-4 ${
          mode === 'split' && membersFeatureOn && treeFeatureOn
            ? 'grid gap-4 xl:grid-cols-2 xl:gap-5'
            : ''
        }`}
      >
        {bothOff && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-violet-900/45 bg-violet-950/15 px-3 py-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-violet-100">Thẻ con đang ẩn</div>
                <p className="mt-0.5 font-serif text-[11px] text-slate-500">
                  Hồ sơ nhúng trong thẻ này (đệ tử phụ, chức vị…).
                </p>
              </div>
              <button
                type="button"
                onClick={enableMembers}
                className="tt-kbd-focus flex h-8 items-center gap-1.5 rounded-lg border border-violet-800/50 bg-violet-950/40 px-2.5 text-[11px] font-bold text-violet-100"
              >
                <Eye size={13} /> Hiện thẻ con
              </button>
            </div>
            {typeof onEnableTree === 'function' && (
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-900/45 bg-emerald-950/15 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-emerald-100">Cây thư mục đang ẩn</div>
                  <p className="mt-0.5 font-serif text-[11px] text-slate-500">
                    Xếp thẻ thật cha/con trên cùng tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEnableTree}
                  className="tt-kbd-focus flex h-8 items-center gap-1.5 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-2.5 text-[11px] font-bold text-emerald-100"
                >
                  <Eye size={13} /> Hiện cây
                </button>
              </div>
            )}
          </div>
        )}

        {showMembers && (
          <div
            className={`min-w-0 ${
              mode === 'split' && treeFeatureOn
                ? 'rounded-xl border border-violet-900/40 bg-violet-950/10 p-3'
                : ''
            }`}
          >
            {mode === 'split' && treeFeatureOn && (
              <div className="mb-3 flex items-center gap-2 border-b border-violet-900/35 pb-2">
                <Users size={15} className="text-violet-300" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-200/90">
                  Thẻ con · nhúng trong thẻ
                </span>
                <span className="ml-auto text-[11px] tabular-nums text-violet-300/70">{memberCount}</span>
              </div>
            )}
            <AppEntityMembersPanel
              {...membersPanelProps}
              selectedEntity={selectedEntity}
              scopeKey={scopeKey}
              embedded
              hideCollapse
            />
          </div>
        )}

        {!membersFeatureOn && treeFeatureOn && !bothOff && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-violet-900/40 bg-violet-950/10 px-3 py-2.5">
            <p className="font-serif text-[12px] text-slate-500">
              Thẻ con đang ẩn — bật lại khi cần hồ sơ nhúng trong thẻ này.
            </p>
            <button
              type="button"
              onClick={enableMembers}
              className="tt-kbd-focus flex h-8 items-center gap-1.5 rounded-lg border border-violet-800/50 bg-violet-950/30 px-2.5 text-[11px] font-bold text-violet-100"
            >
              <Eye size={13} /> Hiện thẻ con
            </button>
          </div>
        )}

        {showTree && treePanelProps && (
          <div
            className={`min-w-0 ${
              mode === 'split'
                ? 'rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-3'
                : ''
            }`}
          >
            {mode === 'split' && (
              <div className="mb-3 flex items-center gap-2 border-b border-emerald-900/35 pb-2">
                <FolderTree size={15} className="text-emerald-300" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200/90">
                  Cây thư mục · thẻ thật
                </span>
                <LayoutPanelTop size={13} className="ml-auto text-emerald-700" />
              </div>
            )}
            <AppMapEntityTreePanel
              {...treePanelProps}
              selectedEntity={selectedEntity}
              scopeKey={`${scopeKey}:tree`}
              embedded
              hideCollapse
              compactLayout={mode === 'split'}
            />
          </div>
        )}

        {membersFeatureOn && !treeFeatureOn && typeof onEnableTree === 'function' && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/25 px-3 py-2.5">
            <p className="font-serif text-[12px] text-slate-500">
              Cần xếp tông → gia tộc (thẻ thật)? Bật cây thư mục trên tab này.
            </p>
            <button
              type="button"
              onClick={onEnableTree}
              className="tt-kbd-focus flex h-8 items-center gap-1.5 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-2.5 text-[11px] font-bold text-emerald-100"
            >
              <Eye size={13} /> Hiện cây
            </button>
          </div>
        )}
      </div>
      )}
    </section>
  );
});
