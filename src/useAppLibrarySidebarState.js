// ==========================================
// useAppLibrarySidebarState.js
// Purpose: own library sidebar search, filters, virtualization, and hover tooltip state.
// Imported by: App.jsx.
// Notes: keeps localStorage, scroll, and hover effects out of the main app shell.
// ==========================================

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { safeString } from './MasterUtils.jsx';

const SIDEBAR_ITEM_HEIGHT = 78;
const SIDEBAR_OVERSCAN = 8;

export function useAppLibrarySidebarState({ novelsMetadata }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const deferredLibrarySearch = useDeferredValue(searchQuery);

  const sidebarListRef = useRef(null);
  const sidebarScrollRafRef = useRef(null);
  const hoverTooltipRafRef = useRef(null);
  const librarySearchInputRef = useRef(null);

  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
  const [sidebarViewportHeight, setSidebarViewportHeight] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('tangthu_lib_search_hist');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [hoveredNovelId, setHoveredNovelId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const novelMetaById = useMemo(() => {
    const map = new Map();
    (novelsMetadata || []).forEach((novel) => map.set(novel.id, novel));
    return map;
  }, [novelsMetadata]);

  const hoveredNovelData = useMemo(
    () => (hoveredNovelId ? novelMetaById.get(hoveredNovelId) || null : null),
    [hoveredNovelId, novelMetaById]
  );

  const toggleGenre = useCallback((genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]
    );
  }, []);

  const rememberSearchQuery = useCallback((queryValue) => {
    const query = String(queryValue || '').trim();
    if (query.length < 2) return;
    try {
      const raw = localStorage.getItem('tangthu_lib_search_hist');
      let arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr = [query, ...arr.filter((item) => safeString(item).toLowerCase() !== query.toLowerCase())]
        .slice(0, 12);
      localStorage.setItem('tangthu_lib_search_hist', JSON.stringify(arr));
      setSearchHistory(arr);
    } catch {
      void 0;
    }
  }, []);

  const setSearchQueryAndRemember = useCallback((nextQuery) => {
    setSearchQuery(nextQuery);
    rememberSearchQuery(nextQuery);
  }, [rememberSearchQuery]);

  const librarySearchIndex = useMemo(
    () =>
      (novelsMetadata || []).map((novel) => {
        let genres = [];
        if (Array.isArray(novel.genres)) genres = novel.genres;
        else if (typeof novel.genres === 'string') genres = [novel.genres];
        else if (novel.genre) genres = [novel.genre];

        const titleText = safeString(novel.title).toLowerCase();
        const authorText = safeString(novel.author).toLowerCase();
        const tagText = (novel.tags || []).map((tag) => safeString(tag)).join(' ').toLowerCase();

        return {
          id: novel.id,
          text: `${titleText} ${authorText} ${tagText}`,
          titleText,
          authorText,
          tagText,
          genres,
        };
      }),
    [novelsMetadata]
  );

  const filteredNovelsList = useMemo(() => {
    const q = safeString(deferredLibrarySearch).toLowerCase().trim();
    const byId = new Map((novelsMetadata || []).map((novel) => [novel.id, novel]));
    return librarySearchIndex
      .filter((row) => {
        let matchSearch = true;
        if (q) {
          if (searchField === 'title') matchSearch = row.titleText.includes(q);
          else if (searchField === 'author') matchSearch = row.authorText.includes(q);
          else if (searchField === 'tag') matchSearch = row.tagText.includes(q);
          else matchSearch = row.text.includes(q);
        }
        const matchGenre =
          selectedGenres.length === 0 || selectedGenres.some((genre) => row.genres.includes(genre));
        return matchSearch && matchGenre;
      })
      .map((row) => byId.get(row.id))
      .filter(Boolean);
  }, [deferredLibrarySearch, librarySearchIndex, novelsMetadata, searchField, selectedGenres]);

  const totalSidebarItems = filteredNovelsList.length;
  const sidebarStartIndex = useMemo(
    () => Math.max(0, Math.floor(sidebarScrollTop / SIDEBAR_ITEM_HEIGHT) - SIDEBAR_OVERSCAN),
    [sidebarScrollTop]
  );
  const sidebarEndIndex = useMemo(() => {
    const visibleCount = Math.max(1, Math.ceil((sidebarViewportHeight || 0) / SIDEBAR_ITEM_HEIGHT));
    return Math.min(totalSidebarItems - 1, sidebarStartIndex + visibleCount + SIDEBAR_OVERSCAN * 2);
  }, [sidebarViewportHeight, totalSidebarItems, sidebarStartIndex]);
  const visibleSidebarNovels = useMemo(
    () => filteredNovelsList.slice(sidebarStartIndex, sidebarEndIndex + 1),
    [filteredNovelsList, sidebarStartIndex, sidebarEndIndex]
  );

  const handleSidebarScroll = useCallback((event) => {
    const nextTop = event.currentTarget.scrollTop || 0;
    if (sidebarScrollRafRef.current) cancelAnimationFrame(sidebarScrollRafRef.current);
    sidebarScrollRafRef.current = requestAnimationFrame(() => {
      setSidebarScrollTop(nextTop);
      sidebarScrollRafRef.current = null;
    });
  }, []);

  const handleSidebarNovelHover = useCallback((novelId, element) => {
    setHoveredNovelId(novelId);
    if (!element) return;
    if (hoverTooltipRafRef.current) cancelAnimationFrame(hoverTooltipRafRef.current);
    hoverTooltipRafRef.current = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: Math.min(rect.top, window.innerHeight - 260) });
      hoverTooltipRafRef.current = null;
    });
  }, []);

  const clearHoveredNovel = useCallback(() => {
    setHoveredNovelId(null);
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => setSearchQueryAndRemember(searchInput), 300);
    return () => clearTimeout(timerId);
  }, [searchInput, setSearchQueryAndRemember]);

  useEffect(() => {
    const element = sidebarListRef.current;
    if (!element) return undefined;

    const updateHeight = () => setSidebarViewportHeight(element.clientHeight || 0);
    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    const element = sidebarListRef.current;
    if (element) element.scrollTop = 0;
    const resetId = requestAnimationFrame(() => setSidebarScrollTop(0));
    return () => cancelAnimationFrame(resetId);
  }, [searchQuery, selectedGenres]);

  useEffect(
    () => () => {
      if (hoverTooltipRafRef.current) cancelAnimationFrame(hoverTooltipRafRef.current);
      if (sidebarScrollRafRef.current) cancelAnimationFrame(sidebarScrollRafRef.current);
    },
    []
  );

  return {
    librarySearchInputRef,
    searchInput,
    setSearchInput,
    setSearchQuery: setSearchQueryAndRemember,
    searchField,
    setSearchField,
    searchHistory,
    isGenreFilterOpen,
    setIsGenreFilterOpen,
    selectedGenres,
    setSelectedGenres,
    toggleGenre,
    filteredNovelsList,
    sidebarListRef,
    handleSidebarScroll,
    totalSidebarItems,
    sidebarItemHeight: SIDEBAR_ITEM_HEIGHT,
    visibleSidebarNovels,
    sidebarStartIndex,
    hoveredNovelData,
    tooltipPos,
    handleSidebarNovelHover,
    clearHoveredNovel,
  };
}
