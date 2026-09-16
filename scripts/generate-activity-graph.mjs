#!/usr/bin/env node
// Fetches the public GitHub contribution calendar for USERNAME and renders it
// as a static line/area SVG chart at OUTPUT. No auth, no third-party image
// service — the data comes straight from github.com's own public profile
// markup (the same source the green-square calendar on a profile page uses).

const USERNAME = process.env.GH_USERNAME || 'Gathiira';
const OUTPUT = new URL('../images/activity-graph.svg', import.meta.url);
const ACCENT_LIGHT = '#2563EB';
const ACCENT_DARK = '#5B93FF';

async function fetchContributions(username) {
  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: { 'User-Agent': 'activity-graph-generator' },
  });
  if (!res.ok) {
    throw new Error(`GitHub contributions fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function parseDayCounts(html) {
  const days = new Map(); // id -> { date }
  const dayTagRe = /<td\b[^>]*>/g;
  let m;
  while ((m = dayTagRe.exec(html))) {
    const tag = m[0];
    const idMatch = tag.match(/\bid="([^"]+)"/);
    const dateMatch = tag.match(/\bdata-date="([^"]+)"/);
    if (idMatch && dateMatch) {
      days.set(idMatch[1], { date: dateMatch[1] });
    }
  }

  const tooltipRe = /<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  while ((m = tooltipRe.exec(html))) {
    const [, id, text] = m;
    const day = days.get(id);
    if (!day) continue;
    const countMatch = text.match(/^(\d+)\s+contribution/);
    day.count = countMatch ? parseInt(countMatch[1], 10) : 0;
  }

  return Array.from(days.values())
    .filter((d) => typeof d.count === 'number')
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function smooth(values, windowSize = 3) {
  const half = Math.floor(windowSize / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function toWeeklyTotals(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    weeks.push(chunk.reduce((sum, d) => sum + d.count, 0));
  }
  return weeks;
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function buildSmoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = round((x0 + x1) / 2);
    d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

function renderSvg(days) {
  const width = 1200;
  const height = 220;
  const padX = 4;
  const padTop = 18;
  const padBottom = 4;

  const weekly = toWeeklyTotals(days);
  const counts = smooth(weekly, 3);
  const max = Math.max(1, ...counts);
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const points = counts.map((c, i) => {
    const x = padX + (i / (counts.length - 1)) * innerW;
    const y = padTop + innerH - (c / max) * innerH;
    return [round(x), round(y)];
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1][0]},${height - padBottom} L ${points[0][0]},${height - padBottom} Z`;

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const first = days[0]?.date ?? '';
  const last = days[days.length - 1]?.date ?? '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${total} GitHub contributions from ${first} to ${last}">
  <title>${total} GitHub contributions (${first} to ${last})</title>
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" class="ag-stop-top"/>
      <stop offset="100%" class="ag-stop-bottom"/>
    </linearGradient>
    <style>
      .ag-stop-top { stop-color: ${ACCENT_LIGHT}; stop-opacity: 0.28; }
      .ag-stop-bottom { stop-color: ${ACCENT_LIGHT}; stop-opacity: 0; }
      .ag-line { stroke: ${ACCENT_LIGHT}; }
      @media (prefers-color-scheme: dark) {
        .ag-stop-top { stop-color: ${ACCENT_DARK}; }
        .ag-stop-bottom { stop-color: ${ACCENT_DARK}; }
        .ag-line { stroke: ${ACCENT_DARK}; }
      }
    </style>
  </defs>
  <path d="${areaPath}" fill="url(#fade)" stroke="none"/>
  <path class="ag-line" d="${linePath}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

async function main() {
  const html = await fetchContributions(USERNAME);
  const days = parseDayCounts(html);
  if (days.length === 0) {
    throw new Error('No contribution data parsed — GitHub markup may have changed.');
  }
  const svg = renderSvg(days);
  const fs = await import('node:fs/promises');
  await fs.writeFile(OUTPUT, svg, 'utf8');
  console.log(`Wrote ${days.length} days (${days.reduce((s, d) => s + d.count, 0)} contributions) to ${OUTPUT.pathname}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
