// Helpers for the design reference page (docs/design/index.html): sample
// data, board geometry, tiles and the tweak panel. Coordinates follow the
// engine: (0,0) is the centre cell, rows grow downwards, the area is odd in
// both directions.

/* ------------------------------------------------------------------ data */

export const PLAYERS = [
  { id: 'ana', name: 'ANA', tone: 'rose', score: 14, ready: false },
  { id: 'bia', name: 'BIA', tone: 'sky', score: 9, ready: true },
];

// The server opens with a long word; later ones overlap and drift right.
export const CHAIN = ['VENDERIAM', 'MALA', 'LAGO', 'GOTA', 'TALHE', 'HELIO'];

/* ------------------------------------------------------------- geometry */

const odd = (n) => (n % 2 === 0 ? n + 1 : n);

/** Same rule as engine/layout.ts: at least 15 columns, pitch capped at 28.8. */
export function boardFor(width, height, { maxPitch = 28.8, minCols = 15 } = {}) {
  const pitch = Math.min(maxPitch, width / minCols);
  const cols = odd(Math.ceil(width / pitch));
  const rows = odd(Math.ceil(height / pitch));
  return { width, height, pitch, cols, rows, top: -(rows - 1) / 2, left: -(cols - 1) / 2 };
}

/* ---------------------------------------------------------------- tiles */

export const centred = (length) => -Math.floor(length / 2);

export function word(text, row, col, tone = 'stone', extra = {}) {
  return [...text].map((ch, i) => ({ r: row, c: col + i, ch, tone, ...extra }))
    .filter((t) => t.ch !== ' ');
}

/** Typed letters on solid tiles, the rest as slots; the caret sits on the next slot. */
export function field(value, row, col, length, tone, focused = true) {
  return Array.from({ length }, (_, i) => {
    const ch = value[i];
    if (ch) return { r: row, c: col + i, ch, tone };
    return { r: row, c: col + i, ch: '', tone, slot: true, caret: focused && i === value.length };
  });
}

function overlap(prev, next) {
  for (let k = Math.min(prev.length, next.length) - 1; k > 0; k--) {
    if (prev.endsWith(next.slice(0, k))) return k;
  }
  return 0;
}

/**
 * The chain as a staircase, newest at `bottom`, centred on the board. When
 * it is wider than the board the newest word keeps to the right edge and the
 * oldest are cut (same rule as scenes/game.ts).
 */
export function chain(words, bottom, maxRows, area) {
  const visible = words.slice(-maxRows);
  const offsets = [0];
  for (let i = 1; i < visible.length; i++) {
    offsets.push(offsets[i - 1] + visible[i - 1].length - overlap(visible[i - 1], visible[i]));
  }
  const width = offsets.at(-1) + visible.at(-1).length;
  const span = (area.cols - 1) / 2;
  const shift = width <= area.cols ? centred(width) : span - visible.at(-1).length - offsets.at(-1);
  const last = visible.length - 1;
  return visible.flatMap((w, i) => {
    const shared = i > 0 ? overlap(visible[i - 1], w) : 0;
    return word(w, bottom - (last - i), shift + offsets[i], i === last ? 'amber' : 'stone')
      .map((t, k) => (k < shared ? { ...t, tone: 'emerald' } : t));
  });
}

/* ------------------------------------------------------------- controls */

/**
 * A small tweak panel. `params` holds the live values; every change writes
 * the CSS custom properties and calls `onChange` so geometry can re-render.
 */
export function controls(root, storageKey, defs, onChange) {
  const defaults = Object.fromEntries(defs.map((d) => [d.key, d.value]));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}'); } catch { /* private mode */ }
  const params = { ...defaults, ...saved };

  const apply = () => {
    for (const d of defs) {
      if (d.css) document.documentElement.style.setProperty(d.css, String(params[d.key]));
      if (d.attr) document.documentElement.dataset[d.attr] = String(params[d.key]);
    }
    try { localStorage.setItem(storageKey, JSON.stringify(params)); } catch { /* private mode */ }
    onChange(params);
  };

  for (const d of defs) {
    const row = document.createElement('label');
    row.className = 'control';
    const name = document.createElement('span');
    name.textContent = d.label;
    row.append(name);
    let input;
    if (d.options) {
      input = document.createElement('select');
      for (const [value, text] of d.options) input.add(new Option(text, value));
      input.value = params[d.key];
    } else if (typeof d.value === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = params[d.key];
    } else {
      input = document.createElement('input');
      Object.assign(input, { type: 'range', min: d.min, max: d.max, step: d.step });
      input.value = params[d.key];
    }
    const out = document.createElement('output');
    const show = () => { out.textContent = input.type === 'range' ? String(params[d.key]) : ''; };
    show();
    input.addEventListener('input', () => {
      params[d.key] = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      show();
      apply();
    });
    row.append(input, out);
    root.append(row);
  }

  const actions = document.createElement('div');
  actions.className = 'control-actions';
  const copy = document.createElement('button');
  copy.textContent = 'Copiar ajustes';
  copy.addEventListener('click', async () => {
    const text = JSON.stringify({ style: storageKey, ...params }, null, 2);
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Copiado'; } catch { prompt('Ajustes', text); }
    setTimeout(() => { copy.textContent = 'Copiar ajustes'; }, 1500);
  });
  const reset = document.createElement('button');
  reset.textContent = 'Restaurar';
  reset.addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); } catch { /* private mode */ }
    location.reload();
  });
  actions.append(copy, reset);
  root.append(actions);

  apply();
  return params;
}

/* --------------------------------------------------------------- frames */

export const FRAMES = {
  phone: { width: 360, height: 780, label: 'Celular 360×780' },
  keyboard: { width: 360, height: 400, label: 'Celular com teclado 360×400' },
  desktop: { width: 1120, height: 640, label: 'Desktop 1120×640' },
};

/** Lays out the gallery: one card per screen, plus the desktop versions of `wideIds`. */
export function gallery(root, render, screens, wideIds) {
  root.replaceChildren();
  const cards = [
    ...screens.map((s) => ({ screen: s, frame: s.keyboard ? FRAMES.keyboard : FRAMES.phone })),
    ...wideIds.map((id) => ({ screen: screens.find((s) => s.id === id), frame: FRAMES.desktop, wide: true })),
  ];
  for (const { screen, frame, wide } of cards) {
    const card = document.createElement('figure');
    card.className = `card${wide ? ' wide' : ''}`;
    const area = boardFor(frame.width, frame.height);
    const view = render(screen.build(area), area, frame);
    view.classList.add('frame');
    view.style.width = `${frame.width}px`;
    view.style.height = `${frame.height}px`;
    const caption = document.createElement('figcaption');
    caption.innerHTML = `<strong>${screen.title}</strong><span>${wide ? frame.label + ' · ' : ''}${screen.note}</span>`;
    card.append(view, caption);
    root.append(card);
  }
}

/* -------------------------------------------------------------- drawing */

/** Positions `el` as a `size`-px square centred on cell (r, c) of the frame. */
export function place(el, area, r, c, size = area.pitch) {
  el.style.left = `${area.width / 2 + c * area.pitch - size / 2}px`;
  el.style.top = `${area.height / 2 + r * area.pitch - size / 2}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  return el;
}

export function div(className, parent) {
  const el = document.createElement('div');
  el.className = className;
  parent?.append(el);
  return el;
}

/** A letter tile. `index` staggers the breathing loader. */
export function tileEl(tile, area, cell, index = 0) {
  const el = place(div('tile'), area, tile.r, tile.c, cell);
  el.dataset.tone = tile.tone;
  el.textContent = tile.ch;
  el.style.fontSize = `${cell * 0.6}px`;
  el.style.setProperty('--i', String(index));
  for (const flag of ['slot', 'caret', 'action', 'shake', 'disabled']) {
    if (tile[flag]) el.classList.add(flag);
  }
  return el;
}
