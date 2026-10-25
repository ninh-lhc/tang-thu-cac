/**
 * Ghép preview ghi chép thẻ Danh sách: markdown ngoài AUTO + EntityAutoView động.
 */
import React, { useMemo } from 'react';
import { splitNoteAroundCollectionAutoBlock } from './collectionListCardSync.js';
import { renderEntityNotesMarkdown } from './renderEntityNotesMarkdown.jsx';
import { EntityAutoView } from '../EntityAutoView.jsx';
import { buildEntityNameLookup } from './entityWikiLookup.js';

export function useListCardDynamicAutoPreview({
  info,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  selfEntityId,
  activeNovelData,
  listViewMode,
  collectionViewModel,
  onEntitySelect,
  wikiLinkOptOuts,
  setEntityPage = null,
}) {
  return useMemo(() => {
    const useDynamic = Boolean(collectionViewModel);
    const { before, after, hasAutoBlock } = splitNoteAroundCollectionAutoBlock(info || '');
    const wikiContext = {
      dirHandle,
      lookup: buildEntityNameLookup(entityMap),
      linkRegex,
      onNavigate,
      selfEntityId,
    };
    const previewCtx = {
      activeNovelData,
      tabsConfig: activeNovelData?.tabsConfig ?? null,
      wikiLinkOptOuts: Array.isArray(wikiLinkOptOuts) ? wikiLinkOptOuts : [],
    };

    const renderPart = (chunk, key) => {
      const t = (chunk || '').trim();
      if (!t) return null;
      return (
        <div key={key}>
          {renderEntityNotesMarkdown(
            t,
            dirHandle,
            entityMap,
            linkRegex,
            onNavigate,
            selfEntityId,
            previewCtx.wikiLinkOptOuts,
            previewCtx,
          )}
        </div>
      );
    };

    if (!useDynamic || !hasAutoBlock) {
      return {
        nodes: renderEntityNotesMarkdown(
          info || '',
          dirHandle,
          entityMap,
          linkRegex,
          onNavigate,
          selfEntityId,
          previewCtx.wikiLinkOptOuts,
          previewCtx,
        ),
        usesDynamicAuto: false,
      };
    }

    return {
      nodes: (
        <>
          {renderPart(before, 'before-auto')}
          <EntityAutoView
            viewModel={collectionViewModel}
            listViewMode={listViewMode}
            wikiContext={wikiContext}
            onEntitySelect={onEntitySelect}
            setEntityPage={setEntityPage}
          />
          {renderPart(after, 'after-auto')}
        </>
      ),
      usesDynamicAuto: true,
    };
  }, [
    info,
    dirHandle,
    entityMap,
    linkRegex,
    onNavigate,
    selfEntityId,
    activeNovelData,
    listViewMode,
    collectionViewModel,
    onEntitySelect,
    wikiLinkOptOuts,
    setEntityPage,
  ]);
}
