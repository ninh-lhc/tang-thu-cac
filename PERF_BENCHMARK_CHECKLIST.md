# Performance Benchmark Checklist

Use this quick checklist after each optimization round.

## Test Dataset
- At least 300 novels in library metadata.
- At least 1 novel with 500+ entities and 200+ milestones.
- At least 1 collection tab with many avatar images.

## Browser Setup
- Close heavy background apps/tabs.
- Open Chrome DevTools Performance panel.
- Disable cache for repeatable runs.

## Core Metrics
- Library search input latency (typing 10 chars quickly).
- Sidebar scroll smoothness while virtualization is active.
- Time to open a novel from library list.
- Time to switch collection tabs (`list`, `gallery`, `detail`, `timeline`).
- Time to open entity detail and toggle split preview.

## React/Render Checks
- Use React DevTools Profiler.
- Record:
  - Commit count for opening entity detail.
  - Slowest commit duration.
  - Which component rerenders unexpectedly.

## Performance Mode A/B
- Repeat same flow with Performance Mode OFF and ON.
- Compare:
  - FPS during scroll.
  - Input responsiveness.
  - Visual trade-offs (blur/animation reduction).

## Pass Criteria (Suggested)
- No visible input lag while searching library/entities.
- No major scroll jank in sidebar and collection panes.
- Most interactions complete within 150-250ms perceived delay.
- No red flags in Profiler (large repeated commits without state relevance).

