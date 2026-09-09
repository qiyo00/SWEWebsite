document.addEventListener('DOMContentLoaded', () => {
  initNavDrawer();
  initRefPanel();
  initBackToTop();
  initSectionState();
  initTutorialTour();
  initHeroWave();
  initWaveTypesInteractive();
  initArfInteractive();
  initUltrafastVsConventionalInteractive();
  initTimeOfFlightInteractive();
  initValveInteractive({
    stageId: 'valveStage', dotGroupId: 'aorticDotGroup', dotId: 'aorticDot', waveId: 'aorticWavePath',
    hitAreaId: 'aorticHitArea', playBtnId: 'aorticPlayBtn', resetBtnId: 'aorticResetBtn',
    drawDuration: 2300, // path now runs well past the visible frame (clipped) - was 1100 for the shorter, pre-extension path
    morphTargets: AORTIC_MORPH_TARGETS, labelId: 'aorticLabel',
  });
  initValveInteractive({
    stageId: 'valveStage', dotGroupId: 'mitralDotGroup', dotId: 'mitralDot', waveId: 'mitralWavePath',
    hitAreaId: 'mitralHitArea', playBtnId: 'mitralPlayBtn', resetBtnId: 'mitralResetBtn',
    drawDuration: 2300,
    morphTargets: MITRAL_MORPH_TARGETS, labelId: 'mitralLabel',
  });
  initDispersionInteractive();
  initGuidedWaveInteractive();
  initAnisotropyInteractive();
  initEquationsGlossarySearch();
});

/* ---------- Equations & Glossary page: live search ----------
   Filters .eqg-item entries (both the Equations and Glossary lists)
   against each item's own NAME (.eq-name / .glossary-term) plus its
   section tag — not the full definition text. Matching the whole
   card's body copy made "wave" match nearly every entry on a page
   that's fundamentally about shear waves (almost every definition
   mentions "wave" somewhere), which buried the entry actually named
   "Shear wave" in a wall of barely-filtered results. Matching just
   the name makes the search behave like an actual glossary lookup:
   typing "wave" narrows down to the handful of entries named for it.

   Beyond filtering, three things make the "searching" state visibly
   distinct from plain browsing (rather than just a shorter version of
   the same list, which read as confusing since there was no obvious
   way back to the full list besides manually erasing the text):
     - the matched substring is wrapped in <mark> inside the visible
       name, so a hit is visually obvious at a glance;
     - a status line reports "Showing N of TOTAL for '<query>'";
     - a clear (×) button appears whenever there's text, restoring the
       full list in one click instead of requiring manual deletion.
   A .eqg-group (heading + list) is hidden entirely once none of its
   items match, and #eqgNoResults shows only when nothing on the page
   matches at all. */
function initEquationsGlossarySearch() {
  const input = document.getElementById('eqgSearchInput');
  if (!input) return;

  const clearBtn = document.getElementById('eqgSearchClear');
  const status = document.getElementById('eqgSearchStatus');
  const groups = Array.from(document.querySelectorAll('.eqg-group'));

  const entries = Array.from(document.querySelectorAll('.eqg-item')).map((item) => {
    const nameEl = item.querySelector('.eq-name, .glossary-term');
    const tagEl = item.querySelector('.tag');
    const originalName = nameEl ? nameEl.textContent : '';
    const tagText = tagEl ? tagEl.textContent : '';
    return {
      item,
      nameEl,
      originalName,
      searchText: `${originalName} ${tagText}`.toLowerCase(),
    };
  });

  const totalCount = entries.length;

  function escapeHtml(str) {
    return str.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  // Rewrites the name element's markup to wrap the first matched
  // substring in <mark>, falling back to the plain original text
  // whenever there's no active query or no match to highlight — so a
  // cleared search always leaves the name exactly as authored.
  function renderName(nameEl, original, query) {
    if (!nameEl) return;
    if (!query) {
      nameEl.textContent = original;
      return;
    }
    const idx = original.toLowerCase().indexOf(query);
    if (idx === -1) {
      nameEl.textContent = original;
      return;
    }
    const before = escapeHtml(original.slice(0, idx));
    const match = escapeHtml(original.slice(idx, idx + query.length));
    const after = escapeHtml(original.slice(idx + query.length));
    nameEl.innerHTML = `${before}<mark>${match}</mark>${after}`;
  }

  function apply() {
    const rawQuery = input.value.trim();
    const query = rawQuery.toLowerCase();
    let visibleCount = 0;

    entries.forEach(({ item, nameEl, originalName, searchText }) => {
      const matches = !query || searchText.includes(query);
      item.hidden = !matches;
      if (matches) visibleCount++;
      renderName(nameEl, originalName, matches ? query : '');
    });

    groups.forEach((group) => {
      const anyVisible = group.querySelectorAll('.eqg-item:not([hidden])').length > 0;
      group.hidden = !anyVisible;
    });

    if (clearBtn) clearBtn.hidden = rawQuery.length === 0;

    if (status) {
      status.hidden = rawQuery.length === 0;
      if (rawQuery.length > 0) {
        status.innerHTML = `Showing <strong>${visibleCount}</strong> of ${totalCount} for "${escapeHtml(rawQuery)}". Clear the box (or click ×) to bring back the full list.`;
      }
    }
  }

  input.addEventListener('input', apply);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      apply();
    });
  }

  apply();
}

/* ---------- Left navigation drawer (collapse only; always starts open) ---------- */
function initNavDrawer() {
  const drawer = document.getElementById('navDrawer');
  const toggle = document.getElementById('drawerToggle');
  const backdrop = document.getElementById('navBackdrop');
  if (!drawer || !toggle) return;

  const narrowQuery = window.matchMedia('(max-width: 900px)');

  const setOpen = (open) => {
    drawer.classList.toggle('closed', !open);
    toggle.classList.toggle('collapsed', !open);
    toggle.textContent = open ? '‹' : '›';
    if (backdrop) {
      backdrop.classList.toggle('visible', open && narrowQuery.matches);
    }
  };

  // On narrow screens the drawer is an off-canvas panel, so it starts
  // closed to avoid covering the main content. On wide screens it's an
  // inline sidebar, so it starts open.
  setOpen(!narrowQuery.matches);

  narrowQuery.addEventListener('change', (e) => setOpen(!e.matches));

  toggle.addEventListener('click', () => {
    setOpen(drawer.classList.contains('closed'));
  });

  if (backdrop) {
    backdrop.addEventListener('click', () => setOpen(false));
  }
}

/* ---------- Right reference panel (tabs + collapse) ---------- */
function initRefPanel() {
  const panel = document.getElementById('refPanel');
  const toggle = document.getElementById('refToggle');
  const backdrop = document.getElementById('refBackdrop');

  if (toggle && panel) {
    const narrowQuery = window.matchMedia('(max-width: 900px)');

    const setOpen = (open) => {
      panel.classList.toggle('closed', !open);
      toggle.classList.toggle('collapsed', !open);
      toggle.textContent = open ? '›' : '‹';
      if (backdrop) {
        backdrop.classList.toggle('visible', open && narrowQuery.matches);
      }
    };

    // On narrow screens the panel is an off-canvas drawer, so it starts
    // closed to avoid covering the main content. On wide screens it's an
    // inline sidebar, so it starts open.
    setOpen(!narrowQuery.matches);

    narrowQuery.addEventListener('change', (e) => setOpen(!e.matches));

    toggle.addEventListener('click', () => {
      setOpen(panel.classList.contains('closed'));
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => setOpen(false));
    }
  }

  const tabs = document.querySelectorAll('.ref-tab');
  const panels = document.querySelectorAll('.ref-panel-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== target;
      });
    });
  });
}

/* ---------- "Back to top" buttons ---------- */
function initBackToTop() {
  document.querySelectorAll('[data-action="back-to-top"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ---------- Page-based section state ----------
   Each module3-N.html sets <body data-section="N">. The drawer's active
   link is derived from that single value, so every section page can
   share identical drawer markup. */
function initSectionState() {
  const current = Number(document.body.dataset.section);
  if (!current) return;

  document.querySelectorAll('.drawer-nav a[data-section]').forEach((link) => {
    const n = Number(link.dataset.section);
    link.classList.toggle('active', n === current);
  });
}

/* ---------- Home page guided tour ("?" button) ----------
   Dims the page and spotlights every [data-tour] element, labeling each
   with the text from its data-tour attribute. */
function initTutorialTour() {
  const toggle = document.getElementById('tutorialToggle');
  const overlay = document.getElementById('tourOverlay');
  if (!toggle || !overlay) return;

  const setOpen = (open) => {
    document.body.classList.toggle('tour-active', open);
    overlay.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '×' : '?';
  };

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('tour-active'));
  });

  overlay.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

/* ---------- Hero illustration wave rings (mask-cutout) ----------
   The wave is not painted on top of the heart — it's a black ring
   stroke inside #heroMainMask, so wherever the band currently sits,
   main's fill is masked out (opacity 0) and whatever is behind shows
   through instead. Two rings grow once on load and are left in place
   forever as fixed "settled" slits. Every click sends a fresh pair of
   bands sweeping outward past the heart's edges, then removes them —
   a click never leaves anything behind, and there's no limit on how
   many times it can replay. */
function initHeroWave() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const maskRings = document.querySelector('.hero-illustration #waveMaskRings');
  const media = document.querySelector('.hero-media');
  if (!maskRings || !media) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const centerX = 380.817;
  const centerY = 583.968;
  const restingRadii = [264.835, 343.508]; // permanent settled slit positions
  const sweepRadius = 650; // far enough past main's edges to fully exit
  const ringStagger = 200; // ms between the two rings in a pulse
  const growDuration = 2000; // ms
  const bandWidth = 20;

  const makeMaskRing = (targetRadius, animate) => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', centerX);
    circle.setAttribute('cy', centerY);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#000');
    circle.setAttribute('stroke-miterlimit', '10');
    circle.setAttribute('stroke-width', bandWidth);

    if (!animate) {
      circle.setAttribute('r', String(targetRadius));
      maskRings.appendChild(circle);
      return circle;
    }

    circle.setAttribute('r', '0');
    circle.style.transition = `r ${growDuration}ms cubic-bezier(0.215, 0.61, 0.355, 1)`;
    maskRings.appendChild(circle);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        circle.setAttribute('r', String(targetRadius));
      });
    });

    return circle;
  };

  restingRadii.forEach((radius, i) => {
    window.setTimeout(() => makeMaskRing(radius, !reduceMotion), 450 + i * ringStagger);
  });

  if (reduceMotion) return;

  const sweepPulse = () => {
    [0, 1].forEach((i) => {
      window.setTimeout(() => {
        const circle = makeMaskRing(sweepRadius, true);
        window.setTimeout(() => circle.remove(), growDuration + 50);
      }, i * ringStagger);
    });
  };

  media.addEventListener('click', sweepPulse);
}

/* ---------- Module 3-1: Wave Types Interactive ----------
   Both waves are drawn from the exact same 5-row, evenly spaced dot
   grid — the "material" — sized and spaced identically in both
   canvases, so the only visual difference between them is the axis
   particles move along, which is the entire teaching point:
     - Compressional: each column's dots shift horizontally in place;
       columns bunch and spread, so the density pattern (not the dots
       themselves) travels right.
     - Shear: each column's dots shift vertically in place, all rows in
       that column moving together, so the whole grid undulates into a
       traveling wavy ribbon instead of drifting sideways.
   Both use the same displacement model d = A·sin(k·(x0 − v·t)) so
   the pattern visibly translates at speed v. The stiffness slider maps
   to the shear wave's v only; the compressional wave's v is fixed,
   mirroring the physics described in the section text above the
   panel. Speeds are schematic (not to scale) so both waves stay
   legible on screen. The "direction of propagation" arrow marking
   which way the pattern travels is a plain HTML row above each canvas
   (not canvas-drawn) — that keeps it legible regardless of where the
   animated dots currently are, instead of competing with them for
   contrast on the same surface. */
function initWaveTypesInteractive() {
  const compCanvas = document.getElementById('compCanvas');
  const shearCanvas = document.getElementById('shearCanvas');
  const slider = document.getElementById('stiffnessSlider');
  const stiffnessLabel = document.getElementById('stiffnessValueLabel');
  const shearSpeedReadout = document.getElementById('shearSpeedReadout');
  const playToggle = document.getElementById('wavePlayToggle');
  const resetBtn = document.getElementById('waveResetBtn');
  if (!compCanvas || !shearCanvas || !slider || !playToggle) return;

  const compCtx = compCanvas.getContext('2d');
  const shearCtx = shearCanvas.getContext('2d');

  const ROWS = 5; // same row count in both grids — the only difference is the oscillation axis
  const WAVELENGTH = 70; // px — compressional wave's visual wavelength
  const K = (2 * Math.PI) / WAVELENGTH;
  const GRID_SPACING_X = WAVELENGTH / 4; // shared column spacing — identical dot density in both grids
  // The shear wave reuses that same column spacing (so dot density matches
  // the compressional grid exactly) but traces a longer spatial wavelength.
  // At the compressional wavelength, only 4 dots fall within one cycle —
  // too coarse to read as a smooth curve once density is fixed. Spacing
  // the humps out over more columns keeps the same dots-per-area while
  // giving each cycle enough samples to actually look like a wave.
  const WAVELENGTH_SHEAR = GRID_SPACING_X * 10;
  const K_SHEAR = (2 * Math.PI) / WAVELENGTH_SHEAR;
  const AMPLITUDE_COMP = 7; // px, horizontal displacement of each column
  const AMPLITUDE_SHEAR = 20; // px, vertical displacement — fits inside the same row margin the compressional grid uses, so both canvases stay the same height
  const COMP_SPEED = 240; // px/s, fixed — visually faster than any shear speed
  const SHEAR_SPEED_MIN = 30; // px/s, at slider = 0
  const SHEAR_SPEED_MAX = 150; // px/s, at slider = 100
  const SHEAR_MS_MIN = 0.8; // m/s label at slider = 0 — pediatric myocardium range, not generic soft tissue
  const SHEAR_MS_MAX = 3.0; // m/s label at slider = 100

  // Both waves render as a single repeating *finite* wave packet rather
  // than a steady-state field, so propagation direction is actually
  // visible: ahead of the packet the medium is at rest, a leading edge
  // sweeps left→right, particles spring into motion behind it and
  // settle back to rest behind its trailing edge, and once the whole
  // packet clears the right edge it re-emerges from the left.
  const PACKET_LEN_COMP = WAVELENGTH * 2.5;
  const PACKET_LEN_SHEAR = WAVELENGTH_SHEAR * 2.5;
  // Soft-edge width, ~half a wavelength, so particles ease into and out
  // of motion at both edges instead of snapping.
  const RAMP_COMP = WAVELENGTH * 0.5;
  const RAMP_SHEAR = WAVELENGTH_SHEAR * 0.5;

  let compSize = { width: 0, height: 0 };
  let shearSize = { width: 0, height: 0 };
  // Leading-edge position (px) of each packet — also doubles as the
  // phase reference for its waveform, so the sine pattern travels with
  // the packet instead of the medium oscillating in place forever.
  let compFront = -RAMP_COMP; // px — starts off-screen left, packet at rest
  let shearFront = -RAMP_SHEAR;
  let shearSpeedPx = SHEAR_SPEED_MIN;
  let playing = true;
  let lastT = null;
  let rafId = null;

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function resize() {
    compSize = sizeCanvas(compCanvas);
    shearSize = sizeCanvas(shearCanvas);
    render();
  }

  function drawWavefront(ctx, front, width, topY, bottomY, color) {
    if (front < 0 || front > width) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(front, topY);
    ctx.lineTo(front, bottomY);
    ctx.stroke();
  }

  function drawCompressional(width, height, front) {
    compCtx.clearRect(0, 0, width, height);
    if (width <= 1) return;
    const back = front - PACKET_LEN_COMP; // trailing edge
    const marginY = height * 0.18;
    const spacingY = ROWS > 1 ? (height - marginY * 2) / (ROWS - 1) : 0;
    const cols = Math.ceil(width / GRID_SPACING_X) + 4;
    compCtx.fillStyle = 'rgba(91, 74, 175, 0.72)'; // accent-violet
    for (let r = 0; r < ROWS; r++) {
      const y = marginY + r * spacingY;
      for (let c = -2; c < cols; c++) {
        const x0 = c * GRID_SPACING_X;
        const lead = Math.min(1, Math.max(0, (front - x0) / RAMP_COMP));
        const trail = Math.min(1, Math.max(0, (x0 - back) / RAMP_COMP));
        const gate = lead * trail;
        const x = x0 + AMPLITUDE_COMP * Math.sin(K * x0 - K * front) * gate;
        if (x < -6 || x > width + 6) continue;
        compCtx.beginPath();
        compCtx.arc(x, y, 2.5, 0, Math.PI * 2);
        compCtx.fill();
      }
    }
    drawWavefront(compCtx, front, width, marginY - 10, marginY + (ROWS - 1) * spacingY + 10, 'rgba(83, 74, 183, 0.9)');
  }

  function drawShear(width, height, front) {
    shearCtx.clearRect(0, 0, width, height);
    if (width <= 1) return;
    // Same grid geometry as drawCompressional (same ROWS, same margin
    // formula, same column spacing) — only the displacement axis differs.
    const back = front - PACKET_LEN_SHEAR; // trailing edge
    const marginY = height * 0.18;
    const spacingY = ROWS > 1 ? (height - marginY * 2) / (ROWS - 1) : 0;
    const cols = Math.ceil(width / GRID_SPACING_X) + 4;
    shearCtx.fillStyle = 'rgba(12, 122, 112, 0.75)'; // accent
    for (let c = -2; c < cols; c++) {
      const x0 = c * GRID_SPACING_X;
      if (x0 < -6 || x0 > width + 6) continue;
      const lead = Math.min(1, Math.max(0, (front - x0) / RAMP_SHEAR));
      const trail = Math.min(1, Math.max(0, (x0 - back) / RAMP_SHEAR));
      const gate = lead * trail;
      const dy = AMPLITUDE_SHEAR * Math.sin(K_SHEAR * x0 - K_SHEAR * front) * gate;
      for (let r = 0; r < ROWS; r++) {
        const yRest = marginY + r * spacingY;
        shearCtx.beginPath();
        shearCtx.arc(x0, yRest + dy, 2.5, 0, Math.PI * 2);
        shearCtx.fill();
      }
    }
    drawWavefront(shearCtx, front, width, marginY - 10, marginY + (ROWS - 1) * spacingY + 10, 'rgba(15, 110, 86, 0.9)');
  }

  function render() {
    drawCompressional(compSize.width, compSize.height, compFront);
    drawShear(shearSize.width, shearSize.height, shearFront);
  }

  // Bands correspond to real pediatric myocardial shear-wave velocity
  // (see the .wave-note paragraph in module3-1.html for the source
  // values): soft 0.8-1.8 m/s, borderline 1.8-2.5 m/s, stiff >2.5 m/s.
  // The slider is 0-100 mapped linearly to SHEAR_MS_MIN-SHEAR_MS_MAX
  // (0.8-3.0 m/s), so those cut-offs become slider positions ~45 and
  // ~77. The level also drives the label's color (see
  // #stiffnessValueLabel[data-level] in style.css).
  const STIFFNESS_LABELS = { soft: 'Soft', borderline: 'Borderline', stiff: 'Stiff' };

  function stiffnessLevel(v) {
    if (v < 45) return 'soft';
    if (v < 77) return 'borderline';
    return 'stiff';
  }

  function updateFromSlider() {
    const t = Number(slider.value) / 100;
    shearSpeedPx = SHEAR_SPEED_MIN + t * (SHEAR_SPEED_MAX - SHEAR_SPEED_MIN);
    const shearMs = SHEAR_MS_MIN + t * (SHEAR_MS_MAX - SHEAR_MS_MIN);
    const level = stiffnessLevel(Number(slider.value));
    stiffnessLabel.textContent = STIFFNESS_LABELS[level];
    stiffnessLabel.dataset.level = level;
    shearSpeedReadout.textContent = `≈ ${shearMs.toFixed(1)} m/s`;
  }

  function loop(t) {
    if (lastT === null) lastT = t;
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    compFront += COMP_SPEED * dt;
    shearFront += shearSpeedPx * dt;
    // Independent resets: once a packet's trailing edge has fully
    // cleared its own canvas' right edge (plus one ramp of buffer),
    // snap its front back off-screen left so it re-emerges cleanly.
    // Both edges ramp softly and the reset only happens once the whole
    // packet is off-screen, so there's no visible jump. Compressional
    // and shear run at different speeds, so they cycle independently.
    if (compFront - PACKET_LEN_COMP > compSize.width + RAMP_COMP) {
      compFront = -RAMP_COMP;
    }
    if (shearFront - PACKET_LEN_SHEAR > shearSize.width + RAMP_SHEAR) {
      shearFront = -RAMP_SHEAR;
    }
    render();
    if (playing) rafId = requestAnimationFrame(loop);
  }

  function setPlaying(p) {
    playing = p;
    playToggle.textContent = playing ? '❙❙' : '▶';
    playToggle.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    if (playing) {
      lastT = null;
      rafId = requestAnimationFrame(loop);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
    }
  }

  function resetWaves() {
    // Restart both packets off-screen left, at rest, exactly like the
    // startup state.
    compFront = -RAMP_COMP;
    shearFront = -RAMP_SHEAR;
    lastT = null; // avoid a huge dt on the next animation frame
    render();
  }

  slider.addEventListener('input', updateFromSlider);
  playToggle.addEventListener('click', () => setPlaying(!playing));
  if (resetBtn) resetBtn.addEventListener('click', resetWaves);

  // ResizeObserver (not a window 'resize' listener) so the canvases
  // re-buffer whenever their own box size changes for any reason —
  // including the left nav-drawer or right ref-panel opening/closing,
  // which resize .module-main via a CSS transition without ever firing
  // a window resize event. Without this, the bitmap stays sized for the
  // old layout and the browser stretches it to fit, warping the dots.
  const canvasResizeObserver = new ResizeObserver(resize);
  canvasResizeObserver.observe(compCanvas);
  canvasResizeObserver.observe(shearCanvas);

  updateFromSlider();
  resize();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    // Static illustration: park each front partway across so the
    // packet and its wavefront line are visible at rest, rather than
    // showing an empty (or fully-settled) canvas.
    compFront = compSize.width * 0.55;
    shearFront = shearSize.width * 0.55;
    render();
  }
  setPlaying(!reducedMotion);
}

/* ---------- Module 3-2: ARF Push Pulse Interactive ----------
   The whole reveal sequence is one scrubbable timeline, driven by a
   single progress value (mainT, ms) that the play loop, the scrubber
   (#arfScrubber), and the keyframe markers (#arfMarks) all read and
   write — see render() below, the one function that sets every
   layer's on-screen state from mainT alone, called from every
   trigger so none of them can ever disagree about what a given mainT
   looks like. Timeline (ported from what used to be CSS @keyframes +
   animation-delay, back when this only ever autoplayed once):
     0.00–1.10s  beam clips in top-to-bottom
     1.05–1.55s  focal zone fades/scales in
     1.15–1.55s  "ARF" label fades in
     1.50–1.95s  displacement dot pops in (overshoot)
     1.55–1.95s  "Focal zone" label fades in
     1.95–4.95s  shear-wave pulse travels from the dot to the tissue
                 edge — the only part with any motion left once the
                 idle (mainT = 0) state — probe/tissue only, per
                 style.css's base (hidden) rules for the SVG layers
                 above — has been left.
   Two kinds of shear-wave pulse are drawn, both by buildArmD():
   - the MAIN pulse: position is a pure function of mainT, per above.
   - "extra" pulses, fired by clicking the tissue once the dot has
     fully appeared (mainT >= SHEAR_START): each carries its own
     real-time { start } timestamp, exactly like the original
     click-to-replay design — additive ripples layered on top of
     whatever the main pulse is currently showing, not tied to the
     scrubber (there's no one "position" to scrub to when several may
     be in flight at once).
   Every render, both kinds are threaded into ONE line per arm in
   position order (older pulses further along, since they all move at
   the same rate), each joined by a flat segment — drawing each pulse
   as its own separate dot-to-edge subpath (an earlier version of
   this) meant a newer pulse's flat trailing segment cut straight
   across an older pulse's still-visible hump, and the two overlapping
   strokes read as a closed lens shape between them. One thread, one
   line, no matter how many pulses are in flight. */
function initArfInteractive() {
  const svg = document.getElementById('arfSvg');
  const beamRect = document.getElementById('arfBeamRevealRect');
  const focalZone = document.getElementById('focalZone');
  const dotEl = document.getElementById('dot');
  const hitArea = document.getElementById('arfHitArea');
  const playBtn = document.getElementById('arfPlayBtn');
  const resetBtn = document.getElementById('arfResetBtn');
  const scrubber = document.getElementById('arfScrubber');
  const thumbEl = document.getElementById('arfThumb');
  const marksEl = document.getElementById('arfMarks');
  const mark5 = document.getElementById('arfMark5');
  const labelBeam = svg ? svg.querySelector('.arf-label-group.arf-label-beam') : null;
  const labelFocal = svg ? svg.querySelector('.arf-label-group.arf-label-focal') : null;
  const labelShear = svg ? svg.querySelector('.arf-label-group.arf-label-shear') : null;
  const leftPath = svg ? svg.querySelector('.shear-arm-path[data-arm="left"]') : null;
  const rightPath = svg ? svg.querySelector('.shear-arm-path[data-arm="right"]') : null;
  if (!svg || !beamRect || !focalZone || !dotEl || !hitArea || !playBtn || !resetBtn || !scrubber || !thumbEl ||
      !marksEl || !mark5 || !labelBeam || !labelFocal || !labelShear || !leftPath || !rightPath) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Geometry lifted from the source SVG's original (static) hump, so the
  // animated hump matches its authored size exactly — only its position
  // along the path now varies.
  const DOT_X = 1276.319;
  const BASE_Y = 1135.362;
  const HALF_WIDTH = 89.043;
  const DIP = 60;
  const CTRL = 44.521;
  const BEAM_FULL_HEIGHT = 1080.83;

  // Timeline constants — see the header comment above for the
  // sequence these came from. Marker left-offsets in the HTML
  // (#arfMarks) are precomputed from these against TOTAL_DURATION.
  const BEAM_START = 0, BEAM_DUR = 1100;
  const FOCAL_START = 1050, FOCAL_DUR = 500;
  const BEAM_LABEL_START = 1150, BEAM_LABEL_DUR = 400;
  const DOT_START = 1500, DOT_DUR = 450;
  const FOCAL_LABEL_START = 1550, FOCAL_LABEL_DUR = 400;
  const SHEAR_START = DOT_START + DOT_DUR; // 1950
  const SHEAR_DUR = 3000;
  const TOTAL_DURATION = SHEAR_START + SHEAR_DUR; // 4950 — the scrubber's max
  // Reduced motion: one illustrative "wave underway" frame rather
  // than the fully-traveled end (which the #shearWave clip-path would
  // hide entirely, since travelX is deliberately past the tissue edge).
  const REDUCED_MOTION_T = SHEAR_START + SHEAR_DUR * 0.5;

  // travelX only needs to clear the tissue edge by enough that the whole
  // hump (not just its center) is past it before cleanup — the
  // #shearWave clip-path (matching the tissue rect) does the actual
  // hiding, so there's no need to travel all the way off the canvas.
  const arms = [
    { dir: -1, edgeX: 556.814, travelX: 250, path: leftPath, extraPulses: [] },
    { dir: 1, edgeX: 1995.824, travelX: 2300, path: rightPath, extraPulses: [] },
  ];

  let mainT = 0;        // scrubbable progress, ms, 0..TOTAL_DURATION
  let playing = false;
  let loopRunning = false;
  let lastFrameTs = null;

  // Standard Newton-Raphson cubic-bezier solver (the same math
  // browsers use internally for animation-timing-function), so the
  // JS-driven layers below move exactly like they used to as CSS
  // @keyframes with these same bezier values.
  function cubicBezier(x1, y1, x2, y2) {
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
    const B = (a1, a2) => 3 * a2 - 6 * a1;
    const C = (a1) => 3 * a1;
    const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const s = slope(t, x1, x2);
        if (s === 0) break;
        t -= (calc(t, x1, x2) - x) / s;
      }
      return calc(t, y1, y2);
    };
  }
  const EASE_STANDARD = cubicBezier(0.4, 0, 0.2, 1); // was the beam's cubic-bezier(0.4,0,0.2,1)
  const EASE_OUT = cubicBezier(0, 0, 0.58, 1);        // CSS's "ease-out"
  const EASE_POP = cubicBezier(0.34, 1.56, 0.64, 1);  // the dot's overshoot bounce

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function segment(t, start, dur) { return clamp01((t - start) / dur); }
  function lerp(a, b, p) { return a + (b - a) * p; }

  // One hump's worth of path commands (no leading M, no trailing flat
  // segment) — the piece buildArmD() threads together, in position order,
  // to keep the whole arm a single connected line.
  function humpSegment(enterX, dir) {
    const exitX = enterX + dir * HALF_WIDTH * 2;
    const midX = enterX + dir * HALF_WIDTH;
    const midY = BASE_Y + DIP;
    const c1x = enterX + dir * CTRL;
    const c3x = midX + dir * CTRL;
    return {
      exitX,
      d: `C${c1x},${BASE_Y} ${c1x},${midY} ${midX},${midY}` +
         `C${c3x},${midY} ${c3x},${BASE_Y} ${exitX},${BASE_Y}`,
    };
  }

  function buildArmD(arm, humpCenters) {
    let d = `M${DOT_X},${BASE_Y}`;
    let cursorX = DOT_X;
    humpCenters.forEach((hc) => {
      let enterX = hc - arm.dir * HALF_WIDTH;
      // Guard against near-simultaneous pulses producing near-identical
      // positions: never let a hump start behind where the line already is.
      if ((enterX - cursorX) * arm.dir < 0) enterX = cursorX;
      if (enterX !== cursorX) d += `L${enterX},${BASE_Y}`;
      const seg = humpSegment(enterX, arm.dir);
      d += seg.d;
      cursorX = seg.exitX;
    });
    d += `L${arm.travelX},${BASE_Y}`;
    return d;
  }

  function humpCenterForProgress(arm, p) {
    const hcStart = DOT_X + arm.dir * HALF_WIDTH;
    const hcEnd = arm.travelX - arm.dir * HALF_WIDTH;
    return hcStart + p * (hcEnd - hcStart);
  }

  function anyExtraPulsesActive() {
    return arms.some((arm) => arm.extraPulses.length > 0);
  }

  // The one function that sets every layer's on-screen state from
  // mainT (t) — called from the play loop, the scrubber's input
  // handler, marker clicks, reset, and click-fired extra pulses
  // alike. instant=true skips the shear label's fade transition
  // (used while dragging/seeking, where an animated transition would
  // just lag behind the pointer); the fade is reserved for the play
  // loop's own per-frame crossing of the threshold.
  function render(t, now, instant) {
    const beamP = EASE_STANDARD(segment(t, BEAM_START, BEAM_DUR));
    beamRect.style.height = `${beamP * BEAM_FULL_HEIGHT}px`;

    const focalP = EASE_OUT(segment(t, FOCAL_START, FOCAL_DUR));
    focalZone.style.opacity = String(focalP);
    focalZone.style.transform = `scale(${lerp(0.55, 1, focalP)})`;

    labelBeam.style.opacity = String(EASE_OUT(segment(t, BEAM_LABEL_START, BEAM_LABEL_DUR)));
    labelFocal.style.opacity = String(EASE_OUT(segment(t, FOCAL_LABEL_START, FOCAL_LABEL_DUR)));

    // Dot pop: a two-segment keyframe (0% -> 70% overshoot -> 100%
    // settle), same as the removed arfDotPop @keyframes block.
    let dotOpacity = 0, dotScale = 0;
    if (t >= DOT_START) {
      const local = segment(t, DOT_START, DOT_DUR);
      if (local < 0.7) {
        const p = EASE_POP(local / 0.7);
        dotOpacity = p;
        dotScale = lerp(0, 1.25, p);
      } else {
        const p = EASE_POP((local - 0.7) / 0.3);
        dotOpacity = 1;
        dotScale = lerp(1.25, 1, p);
      }
    }
    dotEl.style.opacity = String(dotOpacity);
    dotEl.style.transform = `scale(${dotScale})`;

    labelShear.style.transition = instant ? '' : 'opacity 0.4s ease-out';
    labelShear.style.opacity = t >= SHEAR_START ? '1' : '0';

    const shearP = clamp01((t - SHEAR_START) / SHEAR_DUR);
    arms.forEach((arm) => {
      arm.extraPulses = arm.extraPulses.filter((p) => (now - p.start) / SHEAR_DUR < 1);
      const centers = [];
      if (shearP > 0) centers.push(humpCenterForProgress(arm, Math.min(shearP, 1)));
      arm.extraPulses.forEach((p) => {
        centers.push(humpCenterForProgress(arm, Math.min((now - p.start) / SHEAR_DUR, 1)));
      });
      centers.sort((a, b) => (a - DOT_X) * arm.dir - (b - DOT_X) * arm.dir);
      arm.path.setAttribute('d', centers.length ? buildArmD(arm, centers) : '');
    });
  }

  function bounceDot() {
    if (dotEl.animate) {
      dotEl.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }, { transform: 'scale(1)' }],
        { duration: 450, easing: 'ease-out' }
      );
    }
  }

  // Keeps the native <input> (an invisible hit-layer now — see the
  // style.css comment above .arf-track-line for why) and the custom
  // visual thumb (#arfThumb, purely decorative, pointer-events:none)
  // in sync with mainT — the one thing that actually moves visibly,
  // since the real thumb is hidden.
  function syncScrubber(t) {
    scrubber.value = String(Math.round(t));
    thumbEl.style.left = `${(t / TOTAL_DURATION) * 100}%`;
  }

  function ensureLoop() {
    if (loopRunning) return;
    loopRunning = true;
    lastFrameTs = null;
    requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (lastFrameTs === null) lastFrameTs = ts;
    const dt = ts - lastFrameTs;
    lastFrameTs = ts;
    if (playing) {
      mainT = Math.min(mainT + dt, TOTAL_DURATION);
      syncScrubber(mainT);
      if (mainT >= TOTAL_DURATION) setPlaying(false);
    }
    render(mainT, performance.now(), false);
    if (playing || anyExtraPulsesActive()) {
      requestAnimationFrame(loop);
    } else {
      loopRunning = false;
    }
  }

  function setPlaying(p) {
    playing = p;
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    playBtn.setAttribute('aria-pressed', String(playing));
    if (playing) ensureLoop();
  }

  // Play button toggles: pause if already playing; otherwise start —
  // resuming mid-way if paused there, or replaying from the top if it
  // had already finished. (Missing this toggle — always trying to
  // "start" regardless of current state — was why the button couldn't
  // pause a running animation.)
  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (mainT >= TOTAL_DURATION) mainT = 0; // replay from the start
    if (reduceMotion) {
      mainT = REDUCED_MOTION_T;
      syncScrubber(mainT);
      render(mainT, performance.now(), true);
      return;
    }
    setPlaying(true);
  }

  function seekTo(t) {
    setPlaying(false); // seeking pauses, same convention as the other sliders
    mainT = t;
    syncScrubber(mainT);
    render(mainT, performance.now(), true);
  }

  function resetSequence() {
    setPlaying(false);
    mainT = 0;
    syncScrubber(0);
    arms.forEach((arm) => { arm.extraPulses = []; });
    mark5.hidden = true;
    render(0, performance.now(), true);
  }

  hitArea.addEventListener('click', () => {
    if (reduceMotion || mainT < SHEAR_START) return; // nothing to poke yet
    const now = performance.now();
    arms.forEach((arm) => arm.extraPulses.push({ start: now }));
    bounceDot();
    mark5.hidden = false;
    render(mainT, now, false);
    ensureLoop(); // keeps this extra pulse animating even if not "playing"
  });

  playBtn.addEventListener('click', togglePlay);
  resetBtn.addEventListener('click', resetSequence);
  scrubber.addEventListener('input', () => seekTo(Number(scrubber.value)));
  marksEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.arf-mark');
    if (btn && !btn.hidden) seekTo(Number(btn.dataset.t));
  });

  // Idle on load: probe/tissue only (see style.css), scrubber at 0,
  // no pulse fired yet — no autoplay.
  syncScrubber(0);
  render(0, performance.now(), true);
}

/* ---------- Module 3-2 path-morph engine (valve-closure phase transition) ----------
   The two hearts in the valve interactive are two cardiac-cycle phases of
   the SAME drawing (images/3-2-21.svg = diastole, left heart; 3-2-22.svg =
   systole, right heart) — see script.js's initValveInteractive below for
   how each heart's Play button uses this. This section only builds the
   generic "tween a path's d from state A to state B" machinery; it knows
   nothing about valves specifically.

   Every pair it animates has the exact same sequence of path commands in
   both states (after normalizing S-shorthand curves to explicit C, which
   is a lossless rewrite — same curve, just spelled out), so each
   anchor/control point tweens straight to its counterpart with no
   resampling. That holds for the blood pools too because they take their
   geometry from the wall's own cavity outlines — see the note above
   AORTIC_MORPH_TARGETS. A resampling dependency (flubber) was carried
   here while the pools still used the artwork's own mismatched fill
   shapes; deriving them from the wall removed the need for it. */

// Parses the restricted-but-sufficient path grammar this artwork uses
// (M, L, C, S, Z — either case, with implicit command repetition) into a
// normalized, ABSOLUTE-coordinate segment list. 'S' (smooth curveto) is
// expanded into an equivalent explicit 'C' via the standard reflection
// rule as it's parsed, so two paths that are the same curve but
// serialized differently (one author's export using S shorthand, the
// other spelling out C) normalize to the identical segment shape and can
// be tweened point-for-point.
function parsePathAbsolute(d) {
  const tokens = d.match(/[MLCSZmlcsz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0, cur = [0, 0], startOfSubpath = [0, 0];
  let prevCtrl = null; // reflection anchor for S -> C; null once a non-curve segment breaks the chain
  let lastCmd = null;
  const segs = [];
  const argCounts = { M: 2, m: 2, L: 2, l: 2, C: 6, c: 6, S: 4, s: 4, Z: 0, z: 0 };
  const isCmd = (t) => /^[MLCSZmlcsz]$/.test(t);
  function readNums(n) {
    const out = [];
    for (let k = 0; k < n && i < tokens.length; k++) { out.push(parseFloat(tokens[i])); i++; }
    return out;
  }
  while (i < tokens.length) {
    let t;
    if (isCmd(tokens[i])) { t = tokens[i]; i++; }
    else { t = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd; }
    lastCmd = t;
    const rel = t === t.toLowerCase() && t !== 'z';
    const nums = readNums(argCounts[t] || 0);

    if (t === 'M' || t === 'm') {
      const p = rel ? [cur[0] + nums[0], cur[1] + nums[1]] : [nums[0], nums[1]];
      cur = p; startOfSubpath = p; prevCtrl = null;
      segs.push({ cmd: 'M', p: p.slice() });
    } else if (t === 'L' || t === 'l') {
      const p = rel ? [cur[0] + nums[0], cur[1] + nums[1]] : [nums[0], nums[1]];
      cur = p; prevCtrl = null;
      segs.push({ cmd: 'L', p: p.slice() });
    } else if (t === 'C' || t === 'c') {
      const c1 = rel ? [cur[0] + nums[0], cur[1] + nums[1]] : [nums[0], nums[1]];
      const c2 = rel ? [cur[0] + nums[2], cur[1] + nums[3]] : [nums[2], nums[3]];
      const end = rel ? [cur[0] + nums[4], cur[1] + nums[5]] : [nums[4], nums[5]];
      segs.push({ cmd: 'C', p: [c1, c2, end] });
      prevCtrl = c2; cur = end;
    } else if (t === 'S' || t === 's') {
      const c1 = prevCtrl ? [2 * cur[0] - prevCtrl[0], 2 * cur[1] - prevCtrl[1]] : cur.slice();
      const c2 = rel ? [cur[0] + nums[0], cur[1] + nums[1]] : [nums[0], nums[1]];
      const end = rel ? [cur[0] + nums[2], cur[1] + nums[3]] : [nums[2], nums[3]];
      segs.push({ cmd: 'C', p: [c1, c2, end] });
      prevCtrl = c2; cur = end;
    } else if (t === 'Z' || t === 'z') {
      segs.push({ cmd: 'Z', p: null });
      cur = startOfSubpath; prevCtrl = null;
    }
  }
  return segs;
}

function serializePathAbsolute(segs) {
  const fmt = (n) => String(Math.round(n * 1000) / 1000);
  let out = '';
  for (const s of segs) {
    if (s.cmd === 'M') out += `M${fmt(s.p[0])},${fmt(s.p[1])}`;
    else if (s.cmd === 'L') out += `L${fmt(s.p[0])},${fmt(s.p[1])}`;
    else if (s.cmd === 'C') out += `C${s.p.map((pt) => `${fmt(pt[0])},${fmt(pt[1])}`).join(' ')}`;
    else if (s.cmd === 'Z') out += 'Z';
  }
  return out;
}

function lerpSegments(segsA, segsB, t) {
  return segsA.map((a, i) => {
    const b = segsB[i];
    if (a.cmd !== b.cmd) {
      throw new Error(`path structure mismatch at segment ${i}: ${a.cmd} vs ${b.cmd}`);
    }
    if (a.cmd === 'Z') return { cmd: 'Z', p: null };
    if (a.cmd === 'C') {
      return { cmd: 'C', p: [0, 1, 2].map((k) => [
        a.p[k][0] + (b.p[k][0] - a.p[k][0]) * t,
        a.p[k][1] + (b.p[k][1] - a.p[k][1]) * t,
      ]) };
    }
    return { cmd: a.cmd, p: [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t] };
  });
}

// Builds a fast t => d function for two structurally-identical paths.
// Parses both once; every later call is just a lerp + serialize.
function makeDirectTween(dA, dB) {
  const segsA = parsePathAbsolute(dA);
  const segsB = parsePathAbsolute(dB);
  if (segsA.length !== segsB.length) {
    throw new Error(`makeDirectTween: segment count mismatch (${segsA.length} vs ${segsB.length}) — the two states must share a command structure`);
  }
  return (t) => serializePathAbsolute(lerpSegments(segsA, segsB, t));
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* Per-heart list of {id, closedD} for every path that carries the phase
   transition (ventricle wall + leaflet + the blood pools + the backing
   layer). Direction: the shape authored on the element in the HTML is the
   OPEN valve — that's the resting state you see before pressing Play, and
   it's read live at init so the artwork on the page is always the source
   of truth for it. 'closedD' is where that path animates TO: the same
   structure, offset-corrected into this heart's on-page position (see the
   module-3-2 pairing report: dx=-34.220,dy=+74.224 for a same-side
   placement, and +-1078.473 in x on top of that to borrow the other
   file's heart onto this one's spot).

   Both blood pools (FillR = the blue chamber, FillBig = the pink chamber)
   take their geometry from crossSection's OWN inner cavity subpaths in
   both states, not from the artwork's separate fill shapes. In the
   systole drawing those separate fills were authored as coarse
   simplifications (38 numbers where the cavity wall has 182) that don't
   follow the wall at all, which is what tore open mid-morph. Lining each
   pool with the exact points of the wall it sits against makes the two
   move as one — no seam can open between them by construction, so no
   clip-path or per-pool backing shape is needed. Costs <=3.7px of drift
   from the artist's original fill at the ends, which is invisible at any
   render size this diagram is used at.

   valveShearWave is intentionally not listed here — its geometry is
   handled separately, once the wave trigger itself is wired up. */
const AORTIC_MORPH_TARGETS = [
  { id: 'aorticBacking', closedD: 'M926.413,861.824C896.483,787.714 849.203,760.644 849.203,760.644C850.823,744.274 852.566,712.671 825.757,668.628C804.361,633.478 752.508,618.029 698.608,617.945C644.708,617.861 592.906,650.054 571.806,679.679L584.36,689.782C572.506,678.648 559.586,671.82 537.948,669.011C513.944,665.895 499.076,674.564 499.076,674.564C474.182,704.053 458.842,752.654 458.842,752.654C446.702,762.294 436.018,811.997 428.182,804.274C409.459,785.82 364.993,768.735 335.162,773.204C314.863,776.245 288.437,804.969 282.693,844.416C275.167,896.097 269.292,1056.204 533.042,1168.035C796.802,1279.865 900.375,1251.457 936.158,1230.842C972.054,1210.161 992.66,1180.822 994.852,1121.315C998.097,1033.225 956.352,935.945 926.412,861.825Z' },
  { id: 'aorticCrossSection', closedD: 'M926.413,861.824C896.483,787.714 849.203,760.644 849.203,760.644C850.823,744.274 852.566,712.671 825.757,668.628C804.361,633.478 752.508,618.029 698.608,617.945C644.708,617.861 592.906,650.054 571.806,679.679L584.36,689.782C572.506,678.648 559.586,671.82 537.948,669.011C513.944,665.895 499.076,674.564 499.076,674.564C474.182,704.053 458.842,752.654 458.842,752.654C446.702,762.294 436.018,811.997 428.182,804.274C409.459,785.82 364.993,768.735 335.162,773.204C314.863,776.245 288.437,804.969 282.693,844.416C275.167,896.097 269.292,1056.204 533.042,1168.035C796.802,1279.865 900.375,1251.457 936.158,1230.842C972.054,1210.161 992.66,1180.822 994.852,1121.315C998.097,1033.225 956.352,935.945 926.412,861.825ZM659.673,1182.324C492.183,1146.584 410.355,1075.609 390.273,1031.694C373.46,994.926 418.854,1005.495 444.131,1017.176C466.52,1027.523 483.574,1048.915 486.056,1047.202C489.548,1044.792 458.609,1006.67 407.444,997.663C353.748,988.211 371.237,1009.685 348.567,1006.414C325.897,1003.134 293.418,940.159 295.716,875.818C297.019,839.33 304.908,804.585 335.546,790.031C354.63,780.965 398.163,796.542 415.894,811.822C435.992,829.142 440.951,852.417 445.074,875.802C452.482,917.818 461.673,949.222 480.134,978.322C493.193,998.906 514.956,1014.777 517.078,1011.967C519.55,1008.693 494.61,999.265 478.269,964.031C463.81,932.854 459.794,909.902 455.684,874.673C451.584,839.433 449.784,788.073 467.914,768.183C467.914,768.183 486.312,785.436 503.929,779.18C519.003,773.828 522.767,742.217 519.386,745.958C516.386,749.277 513.123,771.134 501.376,772.669C487.206,774.52 471.312,764.946 472.142,749.563C473.55,723.454 492.185,695.244 504.44,680.691C504.44,680.691 523.366,668.454 553.078,678.585C585.198,689.536 588.887,707.117 588.887,707.117C588.887,707.117 568.865,772.7 560.565,781.623C551.674,791.18 533.419,801.393 523.717,786.712C514.764,773.165 532.56,752.954 530.044,751.244C526.853,749.074 513.289,770.902 515.61,784.053C517.358,793.96 525.95,800.776 537.121,802.287C546.699,803.582 553.735,799.883 556.375,796.013C556.375,796.013 548.225,937.483 621.695,1015.603C695.165,1093.733 800.598,1161.03 822.315,1171.093C871.908,1194.074 827.165,1218.063 659.675,1182.323ZM925.906,1137.777C911.98,1150.55 895.459,1146.394 860.417,1125.713C750.864,1053.761 703.601,1004.311 639.63,951.458C620.579,935.718 593.582,914.052 581.417,880.415C566.803,840.008 570.213,786.753 570.213,786.753C582.025,756.682 599.413,705.563 599.413,705.563C599.413,705.563 594.055,697.159 584.361,689.781C641.761,635.771 679.715,636.201 704.098,636.521C728.481,636.841 775.256,644.345 796.032,662.757C827.289,690.457 844.523,758.628 817.14,755.947C809.079,755.158 800.314,773.909 796.651,783.138C786.308,809.192 786.838,836.548 790.983,861.891C794.576,883.857 800.733,900.596 803.023,899.313C805.651,897.84 797.991,882.712 794.928,851.5C793.394,835.877 795.502,820.479 800.481,806.309C811.169,775.888 824.909,779.607 829.778,820.196C835.141,864.905 852.404,886.06 874.779,937.288C896.609,987.267 919.514,1027.143 930.502,1067.118C941.063,1105.535 938.081,1126.61 925.906,1137.778Z' },
  { id: 'aorticLeaflet', closedD: 'M576.311,896.884C600.074,907.368 615.143,901.886 621.375,891.522C632.737,872.628 599.035,854.756 601.353,852.356C604.164,849.446 622.25,862.619 627.886,874.415C633.375,885.904 629.872,896.622 619.333,904.287C610.907,910.415 597.759,912.713 580.113,906.798C551.78,897.301 505.424,867.074 470.354,830.436C414.694,772.287 404.482,718.498 398.163,659.903C398.163,659.903 416.737,633.649 439.525,625.044C462.831,616.242 480.695,616.16 501.819,621.862C501.819,621.862 496.398,652.926 543.887,725.309C570.365,765.667 629.736,802.744 661.592,824.118C661.592,824.118 674.194,817.766 690.759,827.948C711.631,840.778 727.975,852.7 747.089,886.796C754.174,899.434 759.749,914.662 756.823,915.267C753.121,916.033 746.866,879.441 707.802,851.31C666.568,821.615 665.93,845.693 665.93,845.693C665.93,845.693 666.709,856.855 656.356,865.863C651.171,870.375 635.42,878.501 617.339,858.594C608.956,849.364 608.151,844.76 609.824,844.097C611.675,843.363 617.235,851.429 624.601,857.82C636.186,867.873 647.771,864.809 654.069,857.338C657.458,853.317 663.325,843.627 644.867,825.139C626.409,806.651 590.454,789.555 569.165,766.288C524.05,716.983 513.633,690.458 502.91,666.714C496.635,652.82 495.1,628.465 494.161,628.226C481.335,624.969 464.53,623.606 441.807,632.415C421.117,640.435 408.187,661.991 408.187,661.991C408.187,661.991 413.49,761.871 475.464,821.31C522.959,866.863 550.273,885.395 576.315,896.884Z' },
  { id: 'aorticFillSmall', closedD: 'M401.417,662.692C409.752,649.555 434.162,629.947 445.077,626.501C455.992,623.054 485.534,621.706 492.183,624.203L502.028,630.764L569.868,755.628L591.566,817.224L562.268,850.543L453.694,795.394C453.694,795.394 442.207,789.119 435.696,778.129C429.185,767.139 401.417,662.692 401.417,662.692Z' },
  { id: 'aorticFillBig', closedD: 'M925.906,1137.777C911.98,1150.55 895.459,1146.394 860.417,1125.713C750.864,1053.761 703.601,1004.311 639.63,951.458C620.579,935.718 593.582,914.052 581.417,880.415C566.803,840.008 570.213,786.753 570.213,786.753C582.025,756.682 599.413,705.563 599.413,705.563C599.413,705.563 594.055,697.159 584.361,689.781C641.761,635.771 679.715,636.201 704.098,636.521C728.481,636.841 775.256,644.345 796.032,662.757C827.289,690.457 844.523,758.628 817.14,755.947C809.079,755.158 800.314,773.909 796.651,783.138C786.308,809.192 786.838,836.548 790.983,861.891C794.576,883.857 800.733,900.596 803.023,899.313C805.651,897.84 797.991,882.712 794.928,851.5C793.394,835.877 795.502,820.479 800.481,806.309C811.169,775.888 824.909,779.607 829.778,820.196C835.141,864.905 852.404,886.06 874.779,937.288C896.609,987.267 919.514,1027.143 930.502,1067.118C941.063,1105.535 938.081,1126.61 925.906,1137.778Z' },
  { id: 'aorticFillR', closedD: 'M659.673,1182.324C492.183,1146.584 410.355,1075.609 390.273,1031.694C373.46,994.926 418.854,1005.495 444.131,1017.176C466.52,1027.523 483.574,1048.915 486.056,1047.202C489.548,1044.792 458.609,1006.67 407.444,997.663C353.748,988.211 371.237,1009.685 348.567,1006.414C325.897,1003.134 293.418,940.159 295.716,875.818C297.019,839.33 304.908,804.585 335.546,790.031C354.63,780.965 398.163,796.542 415.894,811.822C435.992,829.142 440.951,852.417 445.074,875.802C452.482,917.818 461.673,949.222 480.134,978.322C493.193,998.906 514.956,1014.777 517.078,1011.967C519.55,1008.693 494.61,999.265 478.269,964.031C463.81,932.854 459.794,909.902 455.684,874.673C451.584,839.433 449.784,788.073 467.914,768.183C467.914,768.183 486.312,785.436 503.929,779.18C519.003,773.828 522.767,742.217 519.386,745.958C516.386,749.277 513.123,771.134 501.376,772.669C487.206,774.52 471.312,764.946 472.142,749.563C473.55,723.454 492.185,695.244 504.44,680.691C504.44,680.691 523.366,668.454 553.078,678.585C585.198,689.536 588.887,707.117 588.887,707.117C588.887,707.117 568.865,772.7 560.565,781.623C551.674,791.18 533.419,801.393 523.717,786.712C514.764,773.165 532.56,752.954 530.044,751.244C526.853,749.074 513.289,770.902 515.61,784.053C517.358,793.96 525.95,800.776 537.121,802.287C546.699,803.582 553.735,799.883 556.375,796.013C556.375,796.013 548.225,937.483 621.695,1015.603C695.165,1093.733 800.598,1161.03 822.315,1171.093C871.908,1194.074 827.165,1218.063 659.675,1182.323Z' },
];
const MITRAL_MORPH_TARGETS = [
  { id: 'mitralBacking', closedD: 'M1983.021,870.277C1974.595,802.368 1927.676,760.644 1927.676,760.644C1929.296,744.274 1931.039,712.671 1904.23,668.628C1882.834,633.478 1830.981,618.029 1777.081,617.945C1723.181,617.861 1671.379,650.054 1650.279,679.679L1662.833,689.782C1650.979,678.648 1638.059,671.82 1616.421,669.011C1592.417,665.895 1577.549,674.564 1577.549,674.564C1552.655,704.053 1537.315,752.654 1537.315,752.654C1525.175,762.294 1514.491,811.997 1506.655,804.274C1487.932,785.82 1443.466,768.735 1413.635,773.204C1393.336,776.245 1366.91,804.969 1361.166,844.416C1353.64,896.097 1334.832,1072.242 1607.795,1159.199C1874.682,1244.22 1978.849,1251.457 2014.632,1230.841C2050.528,1210.16 2089.83,1178.529 2073.326,1121.314C2047.909,1033.199 1995.041,967.156 1983.021,870.277Z' },
  { id: 'mitralCrossSection', closedD: 'M1983.021,870.277C1974.595,802.368 1927.676,760.644 1927.676,760.644C1929.296,744.274 1931.039,712.671 1904.23,668.628C1882.834,633.478 1830.981,618.029 1777.081,617.945C1723.181,617.861 1671.379,650.054 1650.279,679.679L1662.833,689.782C1650.979,678.648 1638.059,671.82 1616.421,669.011C1592.417,665.895 1577.549,674.564 1577.549,674.564C1552.655,704.053 1537.315,752.654 1537.315,752.654C1525.175,762.294 1514.491,811.997 1506.655,804.274C1487.932,785.82 1443.466,768.735 1413.635,773.204C1393.336,776.245 1366.91,804.969 1361.166,844.416C1353.64,896.097 1334.832,1072.242 1607.795,1159.199C1874.682,1244.22 1978.849,1251.457 2014.632,1230.841C2050.528,1210.16 2089.83,1178.529 2073.326,1121.314C2047.909,1033.199 1995.041,967.156 1983.021,870.277ZM1739.994,1165.326C1572.504,1129.586 1488.828,1075.609 1468.746,1031.694C1451.933,994.926 1497.67,994.789 1524.998,1000.135C1555.016,1006.007 1581.64,1026.614 1584.122,1024.901C1587.614,1022.491 1549.593,993.478 1498.495,987.88C1444.297,981.942 1449.71,1009.686 1427.04,1006.416C1404.37,1003.136 1371.891,940.161 1374.189,875.82C1375.492,839.332 1383.381,804.587 1414.019,790.033C1433.103,780.967 1476.636,796.544 1494.367,811.824C1514.465,829.144 1519.424,852.419 1523.547,875.804C1530.955,917.82 1529.151,956.035 1547.612,985.135C1560.671,1005.719 1584.938,1020.753 1587.059,1017.944C1589.531,1014.67 1567.08,1009.582 1550.74,974.348C1536.281,943.171 1538.267,909.904 1534.157,874.674C1530.057,839.434 1528.257,788.074 1546.387,768.184C1546.387,768.184 1562.74,784.326 1580.357,778.071C1595.431,772.719 1596.76,737.564 1593.378,741.305C1590.378,744.624 1588.785,768.621 1577.038,770.156C1562.868,772.007 1549.785,764.947 1550.615,749.564C1552.023,723.455 1570.658,695.245 1582.913,680.692C1582.913,680.692 1601.839,668.455 1631.551,678.586C1663.671,689.537 1667.36,707.118 1667.36,707.118C1667.36,707.118 1647.338,772.701 1639.038,781.624C1630.147,791.181 1615.847,801.433 1606.145,786.752C1597.192,773.205 1621.033,752.956 1618.518,751.245C1615.327,749.075 1595.144,769.771 1597.465,782.922C1599.213,792.829 1604.425,800.777 1615.595,802.288C1625.173,803.583 1632.209,799.884 1634.849,796.014C1634.849,796.014 1626.699,937.484 1700.169,1015.604C1773.639,1093.734 1879.072,1161.031 1900.789,1171.094C1950.382,1194.075 1907.487,1201.066 1739.997,1165.326ZM2004.379,1137.777C1990.453,1150.55 1973.932,1146.394 1938.89,1125.713C1829.337,1053.761 1782.074,1004.311 1718.103,951.458C1699.052,935.718 1672.055,914.052 1659.89,880.415C1645.276,840.008 1648.686,786.753 1648.686,786.753C1660.498,756.682 1677.886,705.563 1677.886,705.563C1677.886,705.563 1672.528,697.159 1662.834,689.781C1720.234,635.771 1758.188,636.201 1782.571,636.521C1806.954,636.841 1853.729,644.345 1874.505,662.757C1905.762,690.457 1922.996,758.628 1895.613,755.947C1887.552,755.158 1873.248,774.073 1868.164,782.602C1853.225,807.662 1842.407,826.13 1844.866,862.198C1846.38,884.404 1855.214,907.141 1857.504,905.858C1860.132,904.385 1851.404,893.178 1851.404,861.815C1851.404,838.07 1859.654,811.423 1869.695,799.07C1887.751,776.857 1903.381,779.606 1908.25,820.195C1913.613,864.904 1934.22,914.793 1956.595,966.02C1978.425,1015.999 1996.925,1032.514 2007.914,1072.488C2018.475,1110.905 2016.554,1126.608 2004.378,1137.776Z' },
  { id: 'mitralLeaflet', closedD: 'M1654.784,896.884C1678.547,907.368 1688.379,903.967 1694.611,893.603C1705.973,874.709 1673.655,865.109 1675.973,862.709C1678.784,859.799 1695.358,865.466 1700.994,877.262C1706.483,888.751 1704.64,897.937 1694.1,905.602C1685.674,911.73 1676.23,912.712 1658.584,906.798C1630.251,897.301 1583.895,867.074 1548.825,830.436C1493.165,772.287 1482.953,718.498 1476.634,659.903C1476.634,659.903 1495.208,633.649 1517.996,625.044C1541.302,616.242 1559.166,616.16 1580.29,621.862C1580.29,621.862 1574.869,652.926 1622.358,725.309C1648.836,765.667 1708.207,802.744 1740.063,824.118C1740.063,824.118 1752.322,819.708 1770.824,825.688C1796.101,833.858 1816.526,845.603 1840.876,879.753C1849.288,891.55 1853.536,907.619 1850.61,908.224C1846.908,908.99 1845.888,881.139 1806.825,853.007C1765.591,823.312 1744.402,845.692 1744.402,845.692C1744.402,845.692 1745.181,856.854 1734.828,865.862C1729.643,870.374 1716.523,878.786 1698.443,858.879C1690.06,849.649 1690.961,840.681 1692.634,840.017C1694.485,839.283 1697.46,850.444 1704.825,856.836C1716.41,866.889 1726.242,864.808 1732.54,857.337C1735.929,853.316 1741.796,843.626 1723.338,825.138C1704.88,806.65 1668.925,789.554 1647.636,766.287C1602.521,716.982 1592.104,690.457 1581.381,666.713C1575.106,652.819 1573.571,628.464 1572.632,628.225C1559.806,624.968 1543.001,623.605 1520.278,632.414C1499.588,640.434 1486.658,661.99 1486.658,661.99C1486.658,661.99 1491.961,761.87 1553.935,821.309C1601.43,866.862 1628.744,885.394 1654.786,896.883Z' },
  { id: 'mitralFillSmall', closedD: 'M1479.89,662.692C1488.225,649.555 1512.635,629.947 1523.55,626.501C1534.465,623.054 1564.007,621.706 1570.656,624.203L1580.501,630.764L1648.341,755.628L1670.039,817.224L1640.741,850.543L1532.167,795.394C1532.167,795.394 1520.68,789.119 1514.169,778.129C1507.658,767.139 1479.89,662.692 1479.89,662.692Z' },
  { id: 'mitralFillBig', closedD: 'M2004.379,1137.777C1990.453,1150.55 1973.932,1146.394 1938.89,1125.713C1829.337,1053.761 1782.074,1004.311 1718.103,951.458C1699.052,935.718 1672.055,914.052 1659.89,880.415C1645.276,840.008 1648.686,786.753 1648.686,786.753C1660.498,756.682 1677.886,705.563 1677.886,705.563C1677.886,705.563 1672.528,697.159 1662.834,689.781C1720.234,635.771 1758.188,636.201 1782.571,636.521C1806.954,636.841 1853.729,644.345 1874.505,662.757C1905.762,690.457 1922.996,758.628 1895.613,755.947C1887.552,755.158 1873.248,774.073 1868.164,782.602C1853.225,807.662 1842.407,826.13 1844.866,862.198C1846.38,884.404 1855.214,907.141 1857.504,905.858C1860.132,904.385 1851.404,893.178 1851.404,861.815C1851.404,838.07 1859.654,811.423 1869.695,799.07C1887.751,776.857 1903.381,779.606 1908.25,820.195C1913.613,864.904 1934.22,914.793 1956.595,966.02C1978.425,1015.999 1996.925,1032.514 2007.914,1072.488C2018.475,1110.905 2016.554,1126.608 2004.378,1137.776Z' },
  { id: 'mitralFillR', closedD: 'M1739.994,1165.326C1572.504,1129.586 1488.828,1075.609 1468.746,1031.694C1451.933,994.926 1497.67,994.789 1524.998,1000.135C1555.016,1006.007 1581.64,1026.614 1584.122,1024.901C1587.614,1022.491 1549.593,993.478 1498.495,987.88C1444.297,981.942 1449.71,1009.686 1427.04,1006.416C1404.37,1003.136 1371.891,940.161 1374.189,875.82C1375.492,839.332 1383.381,804.587 1414.019,790.033C1433.103,780.967 1476.636,796.544 1494.367,811.824C1514.465,829.144 1519.424,852.419 1523.547,875.804C1530.955,917.82 1529.151,956.035 1547.612,985.135C1560.671,1005.719 1584.938,1020.753 1587.059,1017.944C1589.531,1014.67 1567.08,1009.582 1550.74,974.348C1536.281,943.171 1538.267,909.904 1534.157,874.674C1530.057,839.434 1528.257,788.074 1546.387,768.184C1546.387,768.184 1562.74,784.326 1580.357,778.071C1595.431,772.719 1596.76,737.564 1593.378,741.305C1590.378,744.624 1588.785,768.621 1577.038,770.156C1562.868,772.007 1549.785,764.947 1550.615,749.564C1552.023,723.455 1570.658,695.245 1582.913,680.692C1582.913,680.692 1601.839,668.455 1631.551,678.586C1663.671,689.537 1667.36,707.118 1667.36,707.118C1667.36,707.118 1647.338,772.701 1639.038,781.624C1630.147,791.181 1615.847,801.433 1606.145,786.752C1597.192,773.205 1621.033,752.956 1618.518,751.245C1615.327,749.075 1595.144,769.771 1597.465,782.922C1599.213,792.829 1604.425,800.777 1615.595,802.288C1625.173,803.583 1632.209,799.884 1634.849,796.014C1634.849,796.014 1626.699,937.484 1700.169,1015.604C1773.639,1093.734 1879.072,1161.031 1900.789,1171.094C1950.382,1194.075 1907.487,1201.066 1739.997,1165.326Z' },
];

/* ---------- Module 3-2: Natural Shear Waves (valve closure) Interactive ----------
   Both valves are drawn in one combined SVG (with baked-in static labels —
   nothing to fade in here). Each valve's wave path (#aorticWavePath /
   #mitralWavePath) is authored with a small squiggle purely as a
   geometry template: at init we read its start point and its overall
   start->end direction, then discard the authored shape and drive the
   path exactly like #shearWave's shear-arm-path does for the ARF
   beam — 'd' is rewritten every frame to trace one concave-down hump
   (the transverse displacement) translating along that direction, so
   what's on screen is a single wave actually traveling outward from the
   valve annulus, not a static shape being revealed. The per-heart clip
   (#aorticClip / #mitralClip) still decides where it disappears at the
   myocardial wall — see the HTML comment above #valveShearWave. The
   "playing"/"no-motion" state toggles on the valve's OWN small
   dot-group element (dotGroupId), not the shared stage, so firing one
   valve's animation never touches the other valve's dot in the same
   SVG. Same replay-on-click interaction as the ARF panel. One instance
   per valve (aortic/mitral), configured by element id so the same
   logic drives both.

   Nothing moves until the user asks. On load each heart is put into its
   idle frame — valve open, no dot, no wave, no label, no tween running —
   and stays there. A Play press then runs one sequence:

     0ms ....... closure morph begins from the open shape
     900ms ..... closure lands; the dot pops and the label fades in
     ~1350ms ... dot pop ends, which triggers the traveling wave

   Reset returns to that same idle frame, so a reset heart and a
   freshly-loaded heart are indistinguishable. */
function initValveInteractive(cfg) {
  const stage = document.getElementById(cfg.stageId);
  const dotGroup = document.getElementById(cfg.dotGroupId);
  const dotEl = document.getElementById(cfg.dotId);
  const waveEl = document.getElementById(cfg.waveId);
  const hitArea = document.getElementById(cfg.hitAreaId);
  const playBtn = document.getElementById(cfg.playBtnId);
  const resetBtn = document.getElementById(cfg.resetBtnId);
  const labelEl = cfg.labelId ? document.getElementById(cfg.labelId) : null;
  if (!stage || !dotGroup || !dotEl || !waveEl || !hitArea || !playBtn || !resetBtn) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PULSE_DURATION = cfg.drawDuration || 2300;
  const MORPH_DURATION = 900;

  // Debug aid for inspecting the closure morph itself (not shipped-on by
  // default): add ?morphDebug to the URL to play it at 0.25x speed, or
  // drive it by hand from the console — window.valveMorphDebug[dotGroupId]
  // exposes { setProgress(0..1), targets } against THIS valve's live
  // elements, e.g. valveMorphDebug.aorticDotGroup.setProgress(0.4).
  const morphDebugSlow = /[?&]morphDebug\b/.test(location.search);
  const morphDurationActive = morphDebugSlow ? MORPH_DURATION / 0.25 : MORPH_DURATION;

  // Build one tween per closure-morph target: parse this element's own
  // authored 'd' (the OPEN valve — the resting state, read live so the
  // page's artwork stays the source of truth) and the closed shape it
  // animates to, once at init, so every animation frame afterward is
  // just evaluating a cached function, not re-parsing path strings.
  const morphTargets = (cfg.morphTargets || []).map((m) => {
    const el = document.getElementById(m.id);
    if (!el) return null;
    const openD = el.getAttribute('d');
    return { el, openD, tween: makeDirectTween(openD, m.closedD) };
  }).filter(Boolean);

  function applyMorph(progress) {
    morphTargets.forEach(({ el, tween }) => el.setAttribute('d', tween(progress)));
  }
  // Back to rest = back to the valve-open shape the HTML authored.
  // Restores the exact authored string rather than tween(0) so repeated
  // play/reset cycles can't accumulate serialization drift.
  function resetMorph() {
    morphTargets.forEach(({ el, openD }) => el.setAttribute('d', openD));
  }

  window.valveMorphDebug = window.valveMorphDebug || {};
  window.valveMorphDebug[cfg.dotGroupId] = { setProgress: applyMorph, reset: resetMorph, targets: morphTargets };

  function showLabel() { if (labelEl) labelEl.classList.add('revealed'); }
  function hideLabel() { if (labelEl) labelEl.classList.remove('revealed'); }

  let morphStart = null;
  let morphLoopRunning = false;
  let onMorphDone = null;
  function morphTick(now) {
    if (morphStart == null) { morphLoopRunning = false; return; }
    const p = Math.min((now - morphStart) / morphDurationActive, 1);
    applyMorph(easeOutCubic(p));
    if (p < 1) {
      requestAnimationFrame(morphTick);
    } else {
      morphStart = null;
      morphLoopRunning = false;
      const done = onMorphDone;
      onMorphDone = null;
      if (done) done();
    }
  }
  // done() fires on the frame the valve finishes closing — that's what
  // starts the dot/wave, so the wave can only ever leave a shut valve.
  function runMorph(done) {
    if (!morphTargets.length) { if (done) done(); return; }
    onMorphDone = done || null;
    morphStart = performance.now();
    if (!morphLoopRunning) {
      morphLoopRunning = true;
      requestAnimationFrame(morphTick);
    }
  }
  function cancelMorph() {
    morphStart = null;
    onMorphDone = null;
  }

  // Read the authored path's start point and overall direction ONCE,
  // before its 'd' ever gets overwritten — everything after this uses
  // that route, not the authored squiggle itself.
  const startPt = waveEl.getPointAtLength(0);
  const totalLen = waveEl.getTotalLength();
  const endPt = waveEl.getPointAtLength(totalLen);
  const routeLen = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y) || 1;
  const dirX = (endPt.x - startPt.x) / routeLen;
  const dirY = (endPt.y - startPt.y) / routeLen;
  // Perpendicular to the route — the axis the hump's dip travels along.
  const normX = -dirY;
  const normY = dirX;

  // Geometry of one hump, in local (u = distance along route, v =
  // perpendicular displacement) coordinates — same shape/proportions as
  // the ARF beam's hump, mapped onto this valve's own route direction.
  const HALF_WIDTH = 70;
  const DIP = 23;
  const CTRL = 35;

  // The authored path runs well past the heart wall purely so its
  // clip (#aorticClip / #mitralClip — see the #valveShearWave comment)
  // has somewhere to cut it off, so totalLen is NOT how far the hump
  // needs to travel to visibly cross the wall — it's much farther.
  // Walk the straight route we actually animate along and ask the
  // valve's own clip shape where it exits, so the hump spends its
  // whole travel time inside the visible tissue instead of vanishing
  // early and coasting the rest of the animation as a bare flat line.
  function findClipExitDistance() {
    const clipUrl = waveEl.getAttribute('clip-path');
    const match = clipUrl && clipUrl.match(/#([\w-]+)/);
    const clipShape = match && document.querySelector(`#${match[1]} path`);
    if (!clipShape || typeof clipShape.isPointInFill !== 'function') return totalLen;
    const STEP = 8;
    let wasInside = true;
    for (let u = 0; u <= totalLen; u += STEP) {
      const pt = new DOMPoint(startPt.x + dirX * u, startPt.y + dirY * u);
      const inside = clipShape.isPointInFill(pt);
      if (wasInside && !inside) return u;
      wasInside = inside;
    }
    return totalLen;
  }

  // A little margin past the exit point so the hump fully clears the
  // wall (rather than being clipped mid-shape) before disappearing.
  const travelLen = Math.min(findClipExitDistance() + HALF_WIDTH * 2, totalLen);

  function toGlobal(u, v) {
    return `${startPt.x + dirX * u + normX * v},${startPt.y + dirY * u + normY * v}`;
  }

  function buildWaveD(humpCenter) {
    const enterU = Math.max(humpCenter - HALF_WIDTH, 0);
    const midU = enterU + HALF_WIDTH;
    const exitU = enterU + HALF_WIDTH * 2;
    const c1u = enterU + CTRL;
    const c3u = midU + CTRL;
    let d = `M${toGlobal(0, 0)}`;
    if (enterU > 0) d += `L${toGlobal(enterU, 0)}`;
    d += `C${toGlobal(c1u, 0)} ${toGlobal(c1u, DIP)} ${toGlobal(midU, DIP)}`;
    d += `C${toGlobal(c3u, DIP)} ${toGlobal(c3u, 0)} ${toGlobal(exitU, 0)}`;
    d += `L${toGlobal(travelLen, 0)}`;
    return d;
  }

  const hcStart = HALF_WIDTH; // hump's leading edge starts right at the dot
  const hcEnd = travelLen - HALF_WIDTH; // hump's trailing edge ends right at the route's far end

  let pulseStart = null;
  let loopRunning = false;

  function tick(now) {
    if (pulseStart == null) {
      loopRunning = false;
      return;
    }
    const p = Math.min((now - pulseStart) / PULSE_DURATION, 1);
    waveEl.setAttribute('d', buildWaveD(hcStart + p * (hcEnd - hcStart)));
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      pulseStart = null;
      waveEl.setAttribute('d', '');
      loopRunning = false;
    }
  }

  function runPulse() {
    pulseStart = performance.now();
    if (!loopRunning) {
      loopRunning = true;
      requestAnimationFrame(tick);
    }
  }

  function clearPulse() {
    pulseStart = null;
    loopRunning = false;
    waveEl.setAttribute('d', '');
  }

  // The resting frame: valve open, nothing animating, nothing revealed.
  // Page load lands here and stays; Reset returns here.
  function showIdle() {
    dotGroup.classList.remove('playing', 'no-motion');
    cancelMorph();
    clearPulse();
    resetMorph();
    hideLabel();
  }

  function playSequence() {
    showIdle();
    void stage.offsetWidth; // force reflow so restarted animations replay

    if (reduceMotion) {
      // No tweening: land on the finished state outright.
      applyMorph(1);
      showLabel();
      dotGroup.classList.add('playing', 'no-motion');
      // Illustrative frame: hump parked right at the dot, showing the
      // wave's shape without animating it across the route.
      waveEl.setAttribute('d', buildWaveD(hcStart));
      return;
    }

    runMorph(() => {
      // Valve is now shut — pop the dot at the annulus and bring the
      // label in. The dot's animationend then launches the wave.
      showLabel();
      dotGroup.classList.add('playing');
    });
  }

  dotEl.addEventListener('animationend', (e) => {
    if (e.animationName !== 'valveDotPop') return;
    runPulse();
  });

  hitArea.addEventListener('click', playSequence);
  playBtn.addEventListener('click', playSequence);
  resetBtn.addEventListener('click', showIdle);

  showIdle();
}

/* ---------- Module 3-3: Ultrafast vs. Conventional Imaging Interactive ----------
   Two independently-configurable panels (conventional line-by-line scanning
   vs. ultrafast plane-wave) share one play/pause/reset toolbar. Each panel's
   frame-acquisition time is derived from real physics — round-trip time x
   scan-line count for conventional, 1/frame-rate for ultrafast — and
   compared against how long the wave takes to cross a fixed region of
   interest. Real crossing times are a few to several tens of milliseconds,
   too fast to watch, so playback is uniformly time-scaled so a full crossing
   plays out over TARGET_CROSSING_S wall-clock seconds; because both the
   frame duration and the crossing time get the same scale factor, the RATIO
   between them — which is what actually determines how many samples get
   captured — is preserved exactly.

   Per-sample position noise models the genuine ambiguity of a "frame": a
   scan sweep smears its acquisition across the whole frame duration, so the
   wave could genuinely have been anywhere within the distance it traveled
   during that frame. That noise is large for conventional (frame duration
   is comparable to the crossing time) and negligible for ultrafast (frame
   duration is a tiny fraction of it) — it's what makes the conventional
   velocity estimate unreliable even with a mathematically exact line fit
   through two points. -------------------------------------------------- */
function initUltrafastVsConventionalInteractive() {
  if (!document.querySelector('.uvc-interactive')) return;

  const SOUND_SPEED = 1540; // m/s in tissue
  const NUM_SCAN_LINES = 100; // typical 2D frame line count
  const ROI_WIDTH_M = 0.04; // 4 cm — fixed so both panels are directly comparable
  const LINE_SPACING_M = ROI_WIDTH_M / NUM_SCAN_LINES; // spacing between conventional scan lines, in meters
  const TARGET_CROSSING_S = 6; // wall-clock seconds for one full wave crossing, any velocity
  const JITTER_FACTOR = 0.25; // position uncertainty, as a fraction of distance traveled per frame
  const HOLD_S = 1.5; // wall-clock seconds to hold the finished pass on screen before looping

  const CONV_ACCENT = 'rgb(91, 74, 175)'; // --accent-violet
  const ULTRA_ACCENT = 'rgb(12, 122, 112)'; // --accent
  const TEXT_1 = 'rgb(15, 31, 30)';
  const TEXT_2 = 'rgb(80, 82, 82)';
  const BORDER = 'rgb(200, 216, 215)';
  const BORDER_HOVER = 'rgba(160, 191, 189, 0.9)';

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function linearRegression(points) {
    const n = points.length;
    let sumT = 0, sumP = 0, sumTT = 0, sumTP = 0;
    for (const p of points) {
      sumT += p.t; sumP += p.pos; sumTT += p.t * p.t; sumTP += p.t * p.pos;
    }
    const denom = n * sumTT - sumT * sumT;
    if (denom === 0) return null;
    const slope = (n * sumTP - sumT * sumP) / denom;
    const intercept = (sumP - slope * sumT) / n;
    return { slope, intercept };
  }

  function makePanel(kind, ids) {
    const velocitySlider = document.getElementById(ids.velocitySlider);
    const velocityLabel = document.getElementById(ids.velocityLabel);
    const secondarySlider = document.getElementById(ids.secondarySlider);
    const secondaryLabel = document.getElementById(ids.secondaryLabel);
    const stageCanvas = document.getElementById(ids.stageCanvas);
    // Conventional-only: displays the frame rate (fps). The ultrafast panel has no
    // equivalent readout (its rate is already shown on the fps slider above), so
    // ids.frameStatReadout is left unset there and this resolves to null.
    const frameStatReadout = document.getElementById(ids.frameStatReadout);
    const sampleCountReadout = document.getElementById(ids.sampleCountReadout);
    const plotCanvas = document.getElementById(ids.plotCanvas);
    const estReadout = document.getElementById(ids.estReadout);
    const trueReadout = document.getElementById(ids.trueReadout);
    const playBtn = document.getElementById(ids.playBtn);
    const resetBtn = document.getElementById(ids.resetBtn);
    if (!velocitySlider || !secondarySlider || !stageCanvas || !plotCanvas || !playBtn || !resetBtn) return;

    const stageCtx = stageCanvas.getContext('2d');
    const plotCtx = plotCanvas.getContext('2d');
    const accent = kind === 'conventional' ? CONV_ACCENT : ULTRA_ACCENT;
    let stageSize = { width: 0, height: 0 };
    let plotSize = { width: 0, height: 0 };

    let velocity = 2, frameDurationS = 0.01, crossingS = 0.02, simSecPerWallSec = 1;
    let roundTripS = 0.0001; // conventional only: single source of truth shared by rendering AND crossing detection
    let simTime = 0, samples = [], done = false, holdElapsed = 0;
    let playing = false, lastTs = null, rafId = null;

    function computeDerived() {
      velocity = Number(velocitySlider.value);
      if (kind === 'conventional') {
        const depthCm = Number(secondarySlider.value);
        roundTripS = 2 * (depthCm / 100) / SOUND_SPEED;
        frameDurationS = NUM_SCAN_LINES * roundTripS;
      } else {
        const fps = Number(secondarySlider.value);
        frameDurationS = 1 / fps;
      }
      crossingS = ROI_WIDTH_M / velocity;
      simSecPerWallSec = crossingS / TARGET_CROSSING_S;
    }

    function reset() {
      simTime = 0;
      samples = [];
      done = false;
      holdElapsed = 0;
    }

    function update(dtWall) {
      if (done) {
        // Hold the finished pass on screen long enough to read the
        // estimate, then loop back to t=0 automatically — a single
        // pass that immediately vanishes doesn't give an intuitive
        // side-by-side comparison of how the sample counts differ.
        holdElapsed += dtWall;
        if (holdElapsed >= HOLD_S) reset();
        return;
      }
      const prevSim = simTime;
      let nextSim = simTime + dtWall * simSecPerWallSec;
      let willFinish = false;
      if (nextSim >= crossingS) { nextSim = crossingS; willFinish = true; }
      simTime = nextSim;

      if (kind === 'conventional') recordConventionalCrossings(prevSim, simTime, willFinish);
      else recordUltrafastFrames(prevSim, simTime);

      if (willFinish) done = true;
    }

    // Each scan line n sits at a FIXED x-position (lineX, the same
    // value drawStageConventional draws it at) and fires once, at a
    // specific instant within its frame (frameStart + n*roundTripS).
    // The wave's position at THAT instant is velocity * (that instant)
    // — so "how well did line n capture the wave" is just the gap
    // between lineX and the wave's position at line n's own firing
    // time. As n runs 0..99 within one frame, both lineX and the
    // wave's position-at-firing-time are linear in n, so that gap is
    // linear in n too: it has at most one zero and is minimized at
    // exactly one line, found in closed form rather than by scanning
    // all 100. Recording the single best-matching line per frame
    // (instead of requiring an exact zero-gap "containment" window)
    // avoids two opposite failure modes: a strict containment test
    // misses real encounters when the wave moves less per dwell than
    // the line spacing (common when the scan is much faster than the
    // wave), while checking every line independently floods the
    // result with near-duplicate samples when the scan speed and wave
    // velocity are close enough that the wave stays within one line's
    // width of the sweep for many consecutive lines in a row.
    //
    // A frame's best line can only be judged once the frame (or, for
    // the last partial frame before the wave exits, the portion of it
    // that actually happened) is fully known — evaluating it from a
    // partial slice mid-frame would use an incomplete frameEndAbs and
    // give a wrong answer. So frames are only processed once finished
    // (f < curFrameIdx), except the current one on the final tick.
    function recordConventionalCrossings(prevSim, curSim, isFinalTick) {
      const prevFrameIdx = Math.floor(prevSim / frameDurationS);
      const curFrameIdx = Math.floor(curSim / frameDurationS);
      const lastFrameToProcess = isFinalTick ? curFrameIdx : curFrameIdx - 1;
      for (let f = prevFrameIdx; f <= lastFrameToProcess; f++) {
        const frameStartAbs = f * frameDurationS;
        const frameEndAbs = (isFinalTick && f === curFrameIdx) ? curSim : frameStartAbs + frameDurationS;
        if (frameEndAbs - frameStartAbs < 1e-12) continue;

        // How many lines actually got to fire before this frame ended
        // (full 100 normally; fewer if the wave exited mid-frame).
        const maxLineIdx = Math.min(NUM_SCAN_LINES - 1, Math.floor((frameEndAbs - frameStartAbs) / roundTripS));
        if (maxLineIdx < 0) continue;

        // gap(i) = lineX(i) - waveXAtLineFireTime(i), linear in i；
        // solve gap(i) = 0 for the closest-matching (possibly
        // fractional) line index, then round to a real one.
        const slope = LINE_SPACING_M - velocity * roundTripS;
        let bestLineIdx = 0;
        if (Math.abs(slope) > 1e-15) {
          const iStar = (velocity * frameStartAbs - 0.5 * LINE_SPACING_M) / slope;
          bestLineIdx = Math.round(iStar);
        }
        bestLineIdx = Math.min(maxLineIdx, Math.max(0, bestLineIdx));

        const lineX = (bestLineIdx + 0.5) * LINE_SPACING_M;
        const lineFireTimeAbs = frameStartAbs + bestLineIdx * roundTripS;
        const gap = Math.abs(lineX - velocity * lineFireTimeAbs);
        // Only count it as a genuine capture if the best available
        // line actually came within about one line-width of the wave
        // — otherwise the scan simply never got close this frame (the
        // "closest of 100 bad options" is not a real detection).
        if (gap <= LINE_SPACING_M) {
          samples.push({ t: lineFireTimeAbs, pos: lineX });
        }
      }
    }

    // Ultrafast illuminates the whole ROI in one flash per frame
    // rather than sweeping across it, so there's no "current scan
    // position" to coincide with — position is read directly off the
    // wavefront once per frame, with position noise scaled to how far
    // the wave can move during that (very short) frame.
    function recordUltrafastFrames(prevSim, curSim) {
      const prevFrameIdx = Math.floor(prevSim / frameDurationS);
      const curFrameIdx = Math.floor(curSim / frameDurationS);
      for (let k = prevFrameIdx + 1; k <= curFrameIdx; k++) {
        const frameEndT = k * frameDurationS;
        if (frameEndT > curSim + 1e-12) break;
        const truePos = velocity * frameEndT;
        if (truePos > ROI_WIDTH_M + 1e-9) continue;
        const jitterSpan = velocity * frameDurationS * JITTER_FACTOR;
        const measured = Math.min(Math.max(truePos + (Math.random() * 2 - 1) * jitterSpan, 0), ROI_WIDTH_M);
        samples.push({ t: frameEndT, pos: measured });
      }
    }

    function wavePosM() {
      return Math.min(velocity * simTime, ROI_WIDTH_M);
    }

    function drawStageConventional(w, h) {
      stageCtx.clearRect(0, 0, w, h);
      const xScale = w / ROI_WIDTH_M;
      const midY = h / 2;
      const lineTop = h * 0.15, lineBottom = h * 0.85;
      const lineSpacing = w / NUM_SCAN_LINES;
      const frameElapsed = simTime - Math.floor(simTime / frameDurationS) * frameDurationS;
      // roundTripS (set in computeDerived, shared with
      // recordConventionalCrossings below) gives each scan line an
      // equal slice of the frame, letting the current line grow
      // top-to-bottom as its own echo return plays out, instead of
      // snapping to full height instantly. This is what makes the
      // imaging-depth slider's effect on frame rate visible in the
      // animation itself, not just in the fps readout: a deeper ROI
      // means a longer round trip, so each line visibly takes longer
      // to fill and the whole frame takes longer to scan.
      const lineIdx = Math.min(NUM_SCAN_LINES - 1, Math.floor(frameElapsed / roundTripS));
      const lineElapsed = frameElapsed - lineIdx * roundTripS;
      const lineFrac = Math.min(1, Math.max(0, lineElapsed / roundTripS));

      stageCtx.strokeStyle = BORDER_HOVER;
      stageCtx.lineWidth = 1;
      for (let i = 0; i < lineIdx; i++) {
        const x = i * lineSpacing + lineSpacing / 2;
        stageCtx.beginPath();
        stageCtx.moveTo(x, lineTop);
        stageCtx.lineTo(x, lineBottom);
        stageCtx.stroke();
      }
      stageCtx.strokeStyle = TEXT_1;
      stageCtx.lineWidth = 2;
      const xCur = lineIdx * lineSpacing + lineSpacing / 2;
      stageCtx.beginPath();
      stageCtx.moveTo(xCur, lineTop);
      stageCtx.lineTo(xCur, lineTop + lineFrac * (lineBottom - lineTop));
      stageCtx.stroke();

      stageCtx.fillStyle = accent;
      samples.forEach((s) => {
        stageCtx.beginPath();
        stageCtx.arc(s.pos * xScale, midY, 4, 0, Math.PI * 2);
        stageCtx.fill();
      });

      stageCtx.strokeStyle = accent;
      stageCtx.lineWidth = 2.5;
      stageCtx.beginPath();
      stageCtx.arc(Math.min(Math.max(wavePosM() * xScale, 6), w - 6), midY, 6, 0, Math.PI * 2);
      stageCtx.stroke();
    }

    function drawStageUltrafast(w, h) {
      stageCtx.clearRect(0, 0, w, h);
      const xScale = w / ROI_WIDTH_M;
      const midY = h / 2;
      const framePhase = (simTime - Math.floor(simTime / frameDurationS) * frameDurationS) / frameDurationS;
      const alpha = 0.15 + 0.5 * (1 - framePhase);
      const cols = 48;
      const rowYs = [h * 0.32, h * 0.68];
      stageCtx.fillStyle = `rgba(51, 78, 77, ${alpha.toFixed(3)})`; // --text-3
      rowYs.forEach((y) => {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * (w / cols);
          stageCtx.beginPath();
          stageCtx.arc(x, y, 1.6, 0, Math.PI * 2);
          stageCtx.fill();
        }
      });

      stageCtx.fillStyle = accent;
      samples.forEach((s) => {
        stageCtx.beginPath();
        stageCtx.arc(s.pos * xScale, midY, 2.2, 0, Math.PI * 2);
        stageCtx.fill();
      });

      stageCtx.strokeStyle = accent;
      stageCtx.lineWidth = 2.5;
      stageCtx.beginPath();
      stageCtx.arc(Math.min(Math.max(wavePosM() * xScale, 6), w - 6), midY, 6, 0, Math.PI * 2);
      stageCtx.stroke();
    }

    function drawPlot(w, h) {
      plotCtx.clearRect(0, 0, w, h);
      const marginL = 30, marginR = 8, marginT = 8, marginB = 16;
      const plotW = Math.max(w - marginL - marginR, 1);
      const plotH = Math.max(h - marginT - marginB, 1);
      const xScale = plotW / crossingS;
      const yScale = plotH / ROI_WIDTH_M;
      const X = (t) => marginL + t * xScale;
      const Y = (pos) => marginT + plotH - pos * yScale;

      plotCtx.strokeStyle = BORDER;
      plotCtx.lineWidth = 1;
      plotCtx.beginPath();
      plotCtx.moveTo(marginL, marginT);
      plotCtx.lineTo(marginL, marginT + plotH);
      plotCtx.lineTo(marginL + plotW, marginT + plotH);
      plotCtx.stroke();

      plotCtx.save();
      plotCtx.setLineDash([4, 3]);
      plotCtx.strokeStyle = BORDER_HOVER;
      plotCtx.lineWidth = 1.5;
      plotCtx.beginPath();
      plotCtx.moveTo(X(0), Y(0));
      plotCtx.lineTo(X(crossingS), Y(ROI_WIDTH_M));
      plotCtx.stroke();
      plotCtx.restore();

      plotCtx.fillStyle = accent;
      samples.forEach((s) => {
        plotCtx.beginPath();
        plotCtx.arc(X(s.t), Y(s.pos), 2.4, 0, Math.PI * 2);
        plotCtx.fill();
      });

      if (samples.length >= 2) {
        const reg = linearRegression(samples);
        if (reg) {
          const ts = samples.map((s) => s.t);
          const tMin = Math.min(...ts), tMax = Math.max(...ts);
          plotCtx.strokeStyle = accent;
          plotCtx.lineWidth = 2;
          plotCtx.beginPath();
          plotCtx.moveTo(X(tMin), Y(reg.slope * tMin + reg.intercept));
          plotCtx.lineTo(X(tMax), Y(reg.slope * tMax + reg.intercept));
          plotCtx.stroke();
        }
      }

      plotCtx.fillStyle = TEXT_2;
      plotCtx.font = '9px Inter, sans-serif';
      plotCtx.textBaseline = 'top';
      plotCtx.textAlign = 'left';
      plotCtx.fillText('0', marginL - 2, marginT + plotH + 3);
      plotCtx.textAlign = 'right';
      plotCtx.fillText(`${Math.round(crossingS * 1000)} ms`, marginL + plotW, marginT + plotH + 3);
      plotCtx.textAlign = 'right';
      plotCtx.fillText(`${(ROI_WIDTH_M * 100).toFixed(0)} cm`, marginL - 2, marginT - 1);
    }

    function refreshReadouts() {
      if (velocityLabel) velocityLabel.textContent = `${velocity.toFixed(1)} m/s`;
      if (kind === 'conventional') {
        if (secondaryLabel) secondaryLabel.textContent = `${Number(secondarySlider.value)} cm`;
        if (frameStatReadout) frameStatReadout.textContent = `≈ ${Math.round(1 / frameDurationS)} fps`;
      } else {
        if (secondaryLabel) secondaryLabel.textContent = `${Number(secondarySlider.value).toLocaleString()} fps`;
      }
      if (sampleCountReadout) sampleCountReadout.textContent = String(samples.length);
      if (trueReadout) trueReadout.textContent = `${velocity.toFixed(1)} m/s`;

      if (!estReadout) return;
      estReadout.classList.remove('uvc-est-good', 'uvc-est-warn', 'uvc-est-bad');
      if (samples.length < 2) {
        estReadout.textContent = samples.length === 0 ? 'no samples yet' : 'insufficient samples';
        return;
      }
      const reg = linearRegression(samples);
      if (!reg) {
        estReadout.textContent = 'insufficient samples';
        return;
      }
      const est = reg.slope;
      estReadout.textContent = `${est.toFixed(2)} m/s`;
      const relError = Math.abs(est - velocity) / velocity;
      estReadout.classList.add(relError < 0.1 ? 'uvc-est-good' : relError < 0.3 ? 'uvc-est-warn' : 'uvc-est-bad');
    }

    function render() {
      if (kind === 'conventional') drawStageConventional(stageSize.width, stageSize.height);
      else drawStageUltrafast(stageSize.width, stageSize.height);
      drawPlot(plotSize.width, plotSize.height);
      refreshReadouts();
    }

    function resize() {
      stageSize = sizeCanvas(stageCanvas);
      plotSize = sizeCanvas(plotCanvas);
      render();
    }

    const stageResizeObserver = new ResizeObserver(resize);
    stageResizeObserver.observe(stageCanvas);
    const plotResizeObserver = new ResizeObserver(resize);
    plotResizeObserver.observe(plotCanvas);

    // Play/pause/reset are wired per panel rather than shared, so
    // either system can be started, paused, or restarted on its own
    // without affecting the other.
    function setPlaying(p) {
      playing = p;
      playBtn.textContent = playing ? '❚❚' : '▶';
      playBtn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${kind} panel animation`);
      playBtn.setAttribute('aria-pressed', String(playing));
      if (playing) {
        lastTs = null;
        rafId = requestAnimationFrame(loop);
      } else if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }

    function loop(ts) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      update(dt);
      render();
      if (playing) rafId = requestAnimationFrame(loop);
    }

    function handleSliderChange() {
      setPlaying(false);
      computeDerived();
      reset();
      render();
    }

    playBtn.addEventListener('click', () => setPlaying(!playing));
    resetBtn.addEventListener('click', () => {
      setPlaying(false);
      reset();
      render();
    });
    velocitySlider.addEventListener('input', handleSliderChange);
    secondarySlider.addEventListener('input', handleSliderChange);

    computeDerived();
    reset();
    resize();
  }

  makePanel('conventional', {
    velocitySlider: 'convVelocitySlider', velocityLabel: 'convVelocityLabel',
    secondarySlider: 'convDepthSlider', secondaryLabel: 'convDepthLabel',
    stageCanvas: 'convStageCanvas', frameStatReadout: 'convFrameRateReadout',
    sampleCountReadout: 'convSampleCountReadout', plotCanvas: 'convPlotCanvas',
    estReadout: 'convEstReadout', trueReadout: 'convTrueReadout',
    playBtn: 'convPlayToggle', resetBtn: 'convResetBtn',
  });
  makePanel('ultrafast', {
    velocitySlider: 'ultraVelocitySlider', velocityLabel: 'ultraVelocityLabel',
    secondarySlider: 'ultraFpsSlider', secondaryLabel: 'ultraFpsLabel',
    stageCanvas: 'ultraStageCanvas',
    sampleCountReadout: 'ultraSampleCountReadout', plotCanvas: 'ultraPlotCanvas',
    estReadout: 'ultraEstReadout', trueReadout: 'ultraTrueReadout',
    playBtn: 'ultraPlayToggle', resetBtn: 'ultraResetBtn',
  });
}

/* --------------------------------------------------------------
   Time-of-Flight Velocity Interactive (module 3-3)
   A single wave-speed slider drives everything at once: the wave
   front's position over time is sampled at a fixed number of evenly
   spaced instants and plotted, its least-squares slope is by
   construction the slider's own velocity (no noise is modeled here —
   that limitation is already the subject of the panel above), and
   that velocity feeds directly into mu = rho*c^2 and E ~= 3*mu.
   Dragging the slider (without pressing play) recomputes the full
   sample set and shows it immediately, parked at simTime = 0, so the
   fit line's slope tracking the slider is visible without needing to
   run the animation. Pressing play clears that preview and re-reveals
   the same points progressively as the wave front sweeps across the
   stage, holding briefly at the end before looping. -------------- */
function initTimeOfFlightInteractive() {
  if (!document.querySelector('.tofv-interactive')) return;

  const RHO = 1000; // kg/m^3, soft tissue density
  const ROI_TRAVEL_M = 0.05; // distance represented by the plot's position axis
  const NUM_SAMPLES = 6;
  const V_MIN = 1; // must match the slider's min= attribute
  // The x-axis range is fixed (not rescaled to each velocity's own
  // crossing time), calibrated so the slowest slider speed's line
  // spans the full chart width. Faster speeds then cross sooner and
  // draw a visibly shorter, steeper line instead of the axes quietly
  // rescaling to make every speed look like the same diagonal.
  const T_MAX_S = ROI_TRAVEL_M / V_MIN;

  const ACCENT = 'rgb(12, 122, 112)'; // --accent, the wave-speed / c color
  const TEXT_2 = 'rgb(80, 82, 82)';
  const BORDER = 'rgb(200, 216, 215)';

  const velocitySlider = document.getElementById('tofvVelocitySlider');
  const velocityLabel = document.getElementById('tofvVelocityLabel');
  const plotCanvas = document.getElementById('tofvPlotCanvas');
  const readoutsEl = document.querySelector('.tofv-readouts');
  const dataRowEl = document.querySelector('.tofv-data-row');
  const velocityReadout = document.getElementById('tofvVelocityReadout');
  const shearReadout = document.getElementById('tofvShearReadout');
  const youngReadout = document.getElementById('tofvYoungReadout');
  const formulaMu = document.getElementById('tofvFormulaMu');
  const formulaC = document.getElementById('tofvFormulaC');
  const formulaE = document.getElementById('tofvFormulaE');
  const formulaMu2 = document.getElementById('tofvFormulaMu2');
  if (!velocitySlider || !plotCanvas) return;

  const plotCtx = plotCanvas.getContext('2d');
  let plotSize = { width: 0, height: 0 };

  let velocity = 2, crossingS = 0.025, samples = [];

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function linearRegression(points) {
    const n = points.length;
    let sumT = 0, sumP = 0, sumTT = 0, sumTP = 0;
    for (const p of points) {
      sumT += p.t; sumP += p.pos; sumTT += p.t * p.t; sumTP += p.t * p.pos;
    }
    const denom = n * sumTT - sumT * sumT;
    if (denom === 0) return null;
    const slope = (n * sumTP - sumT * sumP) / denom;
    const intercept = (sumP - slope * sumT) / n;
    return { slope, intercept };
  }

  function computeSamples() {
    const pts = [];
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = crossingS * i / (NUM_SAMPLES - 1);
      pts.push({ t, pos: velocity * t });
    }
    return pts;
  }

  function computeDerived() {
    velocity = Number(velocitySlider.value);
    crossingS = ROI_TRAVEL_M / velocity;
    samples = computeSamples();
  }

  function drawPlot(w, h) {
    plotCtx.clearRect(0, 0, w, h);
    const marginL = 42, marginR = 8, marginT = 8, marginB = 28;
    const plotW = Math.max(w - marginL - marginR, 1);
    const plotH = Math.max(h - marginT - marginB, 1);
    // Both axes use a FIXED range (T_MAX_S, ROI_TRAVEL_M) rather than
    // rescaling to the current velocity's own crossing time — see the
    // T_MAX_S comment above for why that fixed range is what makes
    // the line's on-screen slope actually change with wave speed.
    const xScale = plotW / T_MAX_S;
    const yScale = plotH / ROI_TRAVEL_M;
    const X = (t) => marginL + t * xScale;
    const Y = (pos) => marginT + plotH - pos * yScale;

    plotCtx.strokeStyle = BORDER;
    plotCtx.lineWidth = 1;
    plotCtx.beginPath();
    plotCtx.moveTo(marginL, marginT);
    plotCtx.lineTo(marginL, marginT + plotH);
    plotCtx.lineTo(marginL + plotW, marginT + plotH);
    plotCtx.stroke();

    plotCtx.fillStyle = ACCENT;
    samples.forEach((s) => {
      plotCtx.beginPath();
      plotCtx.arc(X(s.t), Y(s.pos), 3, 0, Math.PI * 2);
      plotCtx.fill();
    });

    if (samples.length >= 2) {
      const reg = linearRegression(samples);
      if (reg) {
        const ts = samples.map((s) => s.t);
        const tMin = Math.min(...ts), tMax = Math.max(...ts);
        plotCtx.strokeStyle = ACCENT;
        plotCtx.lineWidth = 2;
        plotCtx.beginPath();
        plotCtx.moveTo(X(tMin), Y(reg.slope * tMin + reg.intercept));
        plotCtx.lineTo(X(tMax), Y(reg.slope * tMax + reg.intercept));
        plotCtx.stroke();
      }
    }

    plotCtx.fillStyle = TEXT_2;
    plotCtx.font = '9px Inter, sans-serif';
    plotCtx.textBaseline = 'top';
    plotCtx.textAlign = 'left';
    plotCtx.fillText('0', marginL - 2, marginT + plotH + 3);
    plotCtx.textAlign = 'right';
    plotCtx.fillText(`${Math.round(T_MAX_S * 1000)} ms`, marginL + plotW, marginT + plotH + 3);
    plotCtx.textAlign = 'right';
    plotCtx.fillText(`${(ROI_TRAVEL_M * 100).toFixed(1)} cm`, marginL - 2, marginT - 1);

    // Axis titles, in addition to the numeric ticks above, so each
    // axis reads as "Time" / "Position" rather than bare numbers.
    plotCtx.fillStyle = TEXT_2;
    plotCtx.font = '600 9px Inter, sans-serif';
    plotCtx.textBaseline = 'bottom';
    plotCtx.textAlign = 'center';
    plotCtx.fillText('Time', marginL + plotW / 2, h - 1);

    plotCtx.save();
    plotCtx.translate(9, marginT + plotH / 2);
    plotCtx.rotate(-Math.PI / 2);
    plotCtx.textAlign = 'center';
    plotCtx.textBaseline = 'top';
    plotCtx.fillText('Position', 0, 0);
    plotCtx.restore();
  }

  function refreshReadouts() {
    const muKpa = (RHO * velocity * velocity) / 1000;
    const eKpa = 3 * muKpa;
    const vText = `${velocity.toFixed(1)} m/s`;
    const muText = `${muKpa.toFixed(1)} kPa`;
    const eText = `${eKpa.toFixed(1)} kPa`;

    if (velocityLabel) velocityLabel.textContent = vText;
    if (velocityReadout) velocityReadout.textContent = vText;
    if (shearReadout) shearReadout.textContent = muText;
    if (youngReadout) youngReadout.textContent = eText;
    // Mid-chain substitutions drop the unit (matching "1000 x 2.0^2",
    // not "1000 kg/m^3 x 2.0 m/s^2") — only the final result of each
    // chain keeps its unit.
    if (formulaC) formulaC.textContent = velocity.toFixed(1);
    if (formulaMu2) formulaMu2.textContent = muKpa.toFixed(1);
    if (formulaMu) formulaMu.textContent = muText;
    if (formulaE) formulaE.textContent = eText;
  }

  function render() {
    drawPlot(plotSize.width, plotSize.height);
    refreshReadouts();
  }

  // Below the panel's narrow-screen breakpoint, .tofv-data-row stacks
  // the chart above the readouts instead of placing them side by
  // side, so matching the canvas's height to the readout stack's
  // height only makes sense in the wide, row layout.
  function isRowLayout() {
    if (!dataRowEl) return true;
    return getComputedStyle(dataRowEl).flexDirection !== 'column';
  }

  function syncCanvasHeightToReadouts() {
    if (!readoutsEl) return;
    if (isRowLayout()) {
      const h = Math.round(readoutsEl.getBoundingClientRect().height);
      const target = h > 0 ? `${h}px` : '';
      if (target && plotCanvas.style.height !== target) plotCanvas.style.height = target;
    } else if (plotCanvas.style.height) {
      plotCanvas.style.height = '';
    }
  }

  function resize() {
    syncCanvasHeightToReadouts();
    plotSize = sizeCanvas(plotCanvas);
    render();
  }

  const plotResizeObserver = new ResizeObserver(resize);
  plotResizeObserver.observe(plotCanvas);
  if (readoutsEl) {
    const readoutsResizeObserver = new ResizeObserver(resize);
    readoutsResizeObserver.observe(readoutsEl);
  }

  velocitySlider.addEventListener('input', () => {
    computeDerived();
    render();
  });

  computeDerived();
  resize();
}

/* ---------- Module 3-4: Viscoelastic Dispersion Interactive ----------
   One Voigt-model velocity function, voigtVelocity(freq, mu2), drives
   both halves of this panel so they can never disagree with each
   other: the wave-propagation animation moves each frequency
   component of each waveform at its own voigtVelocity, and the
   chart plots that same function as the dispersion curve and as the
   two ARF/natural point markers. At mu2 = 0 (viscoelasticity: none)
   voigtVelocity is frequency-independent, so the two waveforms stay
   perfectly aligned/undistorted and the two chart points coincide —
   that identity is the whole teaching point, not a special case
   handled separately. */
function initDispersionInteractive() {
  if (!document.querySelector('.disp-interactive')) return;

  const RHO = 1000; // kg/m^3, soft tissue density (matches other modules)
  const MU1 = 5000; // Pa, elastic (storage) shear modulus — 5 kPa
  const C0 = Math.sqrt(MU1 / RHO); // non-dispersive reference speed, ~2.24 m/s

  // Four discrete viscosity (mu2, Pa*s) levels the slider steps through.
  const LEVELS = [
    { key: 'none', label: 'None', mu2: 0 },
    { key: 'mild', label: 'Mild', mu2: 1.2 },
    { key: 'moderate', label: 'Moderate', mu2: 3 },
    { key: 'strong', label: 'Strong', mu2: 7 },
  ];

  // Representative center frequencies for the two wave-generation
  // mechanisms (Module 3-2): natural valve-closure waves sit in the
  // low hundreds of Hz; the shorter ARF push pulse carries broader,
  // higher-frequency content. Illustrative only, per the panel note.
  const NATURAL_FREQ = 250;
  const NATURAL_BW = 70;
  const ARF_FREQ = 650;
  const ARF_BW = 220;
  const N_COMPONENTS = 7;

  function voigtVelocity(freqHz, mu2) {
    const omega = 2 * Math.PI * freqHz;
    const omegaMu2 = omega * mu2;
    const mag = Math.sqrt(MU1 * MU1 + omegaMu2 * omegaMu2);
    return Math.sqrt((2 * (MU1 * MU1 + omegaMu2 * omegaMu2)) / (RHO * (MU1 + mag)));
  }

  // A small bundle of frequency components spanning [center-bw, center+bw],
  // Hann-weighted so that when all components share one position they sum
  // to a single clean packet — bandwidth stays fixed; only each
  // component's own voigtVelocity (recomputed per frame) changes with mu2.
  function buildComponents(centerFreq, bandwidth, n) {
    const comps = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
      const weight = 0.5 + 0.5 * Math.cos(Math.PI * t);
      comps.push({ freq: centerFreq + t * bandwidth, weight });
    }
    const sum = comps.reduce((s, c) => s + c.weight, 0);
    comps.forEach((c) => { c.weight /= sum; });
    return comps;
  }

  const NATURAL_COMPONENTS = buildComponents(NATURAL_FREQ, NATURAL_BW, N_COMPONENTS);
  const ARF_COMPONENTS = buildComponents(ARF_FREQ, ARF_BW, N_COMPONENTS);

  const ACCENT_BLUE = 'rgb(29, 111, 164)'; // --accent-blue — ARF-induced wave
  const TEXT_2 = 'rgb(80, 82, 82)'; // --text-2 — natural / valve-closure wave (deliberately left uncolored; matches body-text gray)
  const TEXT_3 = 'rgb(51, 78, 77)';
  const BORDER = 'rgb(200, 216, 215)';

  const slider = document.getElementById('dispViscositySlider');
  const levelLabel = document.getElementById('dispLevelLabel');
  const playBtn = document.getElementById('dispPlayBtn');
  const resetBtn = document.getElementById('dispResetBtn');
  const arfCanvas = document.getElementById('dispWaveCanvasArf');
  const naturalCanvas = document.getElementById('dispWaveCanvasNatural');
  const chartCanvas = document.getElementById('dispChartCanvas');
  if (!slider || !playBtn || !resetBtn || !arfCanvas || !naturalCanvas || !chartCanvas) return;

  const arfCtx = arfCanvas.getContext('2d');
  const naturalCtx = naturalCanvas.getContext('2d');
  const chartCtx = chartCanvas.getContext('2d');
  let arfSize = { width: 0, height: 0 };
  let naturalSize = { width: 0, height: 0 };
  let chartSize = { width: 0, height: 0 };

  const ANIM_DURATION_S = 6; // time for a component at C0 to cross the stage
  const WAVE_MARGIN_X = 14;

  let playing = false;
  let startTs = null;
  let elapsedS = 0;
  let rafId = null;

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function currentMu2() {
    return LEVELS[Number(slider.value)].mu2;
  }

  function updateLevelLabel() {
    const level = LEVELS[Number(slider.value)];
    levelLabel.textContent = level.label;
    levelLabel.dataset.level = level.key;
  }

  // Sum of Hann-windowed, Gaussian-enveloped cosine components, each
  // translated by ITS OWN voigtVelocity. When every component shares
  // the same velocity (mu2 = 0) they stay stacked and the sum stays a
  // clean single packet; once velocities diverge, the sum both drifts
  // (net envelope motion) and spreads/ripples (components misaligning
  // internally) — the same mechanism producing both effects at once.
  function packetDisplacement(x, components, sigma, startX, speedScale, mu2, elapsed) {
    let sum = 0;
    for (const c of components) {
      const v = voigtVelocity(c.freq, mu2);
      const centerX = startX + v * speedScale * elapsed;
      const dx = x - centerX;
      if (Math.abs(dx) > sigma * 4) continue;
      const lambda = 5500 / c.freq;
      const k = (2 * Math.PI) / lambda;
      sum += c.weight * Math.exp(-(dx * dx) / (2 * sigma * sigma)) * Math.cos(k * dx);
    }
    return sum;
  }

  // Each wave gets its own canvas/baseline (see .disp-wave-row in
  // style.css) rather than sharing one, so the two colored traces never
  // sit on top of each other — they were unreadable once dispersion
  // pulled them apart and each one distorted internally.
  function drawWaveOnCanvas(ctx, size, components, sigma, color) {
    const w = size.width, h = size.height;
    ctx.clearRect(0, 0, w, h);
    if (w <= 1) return;

    const baselineY = h / 2;
    const startX = WAVE_MARGIN_X;
    const endX = w - WAVE_MARGIN_X;
    const speedScale = (endX - startX) / ANIM_DURATION_S / C0; // px per second per (m/s)
    const mu2 = currentMu2();
    const ampScale = h * 0.3;

    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(w, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    const step = 2;
    for (let x = 0; x <= w; x += step) {
      const y = baselineY - ampScale * packetDisplacement(x, components, sigma, startX, speedScale, mu2, elapsedS);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawWaveFrame() {
    drawWaveOnCanvas(arfCtx, arfSize, ARF_COMPONENTS, 16, ACCENT_BLUE);
    drawWaveOnCanvas(naturalCtx, naturalSize, NATURAL_COMPONENTS, 34, TEXT_2);
  }

  function drawChart() {
    const w = chartSize.width, h = chartSize.height;
    chartCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;

    const FREQ_MAX = 800, VEL_MAX = 9;
    const marginL = 48, marginR = 12, marginT = 26, marginB = 46;
    const plotW = Math.max(w - marginL - marginR, 1);
    const plotH = Math.max(h - marginT - marginB, 1);
    const X = (f) => marginL + (f / FREQ_MAX) * plotW;
    const Y = (v) => marginT + plotH - (Math.min(v, VEL_MAX) / VEL_MAX) * plotH;
    const mu2 = currentMu2();

    // Y-axis title — sits in the reserved top margin, left-aligned above the
    // axis, rather than rotated along the axis height: a rotated title would
    // occupy the same x range as the point velocity labels below, and those
    // can land anywhere along the full plot height depending on mu2 (see
    // drawGuidesAndDot), so a fixed rotated position could not avoid
    // colliding with one of them. This position is fixed above the plot
    // area instead, so it never collides with anything drawn below it.
    chartCtx.fillStyle = TEXT_3;
    chartCtx.font = '600 9px Inter, sans-serif';
    chartCtx.textAlign = 'left';
    chartCtx.textBaseline = 'top';
    chartCtx.fillText('Velocity (m/s)', marginL, 2);

    chartCtx.strokeStyle = BORDER;
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(marginL, marginT);
    chartCtx.lineTo(marginL, marginT + plotH);
    chartCtx.lineTo(marginL + plotW, marginT + plotH);
    chartCtx.stroke();

    // Non-dispersive elastic reference — fixed, never moves with the slider.
    chartCtx.setLineDash([5, 4]);
    chartCtx.strokeStyle = TEXT_2;
    chartCtx.lineWidth = 1.5;
    chartCtx.beginPath();
    chartCtx.moveTo(marginL, Y(C0));
    chartCtx.lineTo(marginL + plotW, Y(C0));
    chartCtx.stroke();
    chartCtx.setLineDash([]);

    // Live Voigt dispersion curve for the current viscoelasticity level —
    // kept neutral (not amber, which is reserved for shear modulus
    // elsewhere on the site) since this curve isn't tied to either
    // wave's legend color.
    chartCtx.strokeStyle = TEXT_3;
    chartCtx.lineWidth = 2.25;
    chartCtx.beginPath();
    const STEPS = 120;
    for (let i = 0; i <= STEPS; i++) {
      const f = (i / STEPS) * FREQ_MAX;
      const px = X(f), py = Y(voigtVelocity(f, mu2));
      if (i === 0) chartCtx.moveTo(px, py); else chartCtx.lineTo(px, py);
    }
    chartCtx.stroke();

    // Inline labels for the two lines, anchored to values that are always
    // extremal rather than to a fixed screen position: the curve is
    // monotonically increasing in frequency and both data points are
    // themselves samples of this same curve (see pointFor below), so the
    // curve's value at FREQ_MAX is always the highest thing drawn on the
    // chart, and the reference's fixed height (C0) is always the lowest —
    // in every case, including mu2 = 0, where curve and reference coincide
    // exactly. A label offset up from the curve's right end, and one offset
    // down from the reference line, therefore can never be crossed by the
    // curve, either data point, or their guides, at any viscoelasticity
    // level or canvas width.
    chartCtx.font = '600 9px Inter, sans-serif';
    const labelMaxWidth = plotW - 4; // keep a long label from spilling past the y-axis
    function fitLabel(full, short) {
      return chartCtx.measureText(full).width <= labelMaxWidth ? full : short;
    }
    const labelX = marginL + plotW - 2;
    chartCtx.textAlign = 'right';

    chartCtx.fillStyle = TEXT_3;
    chartCtx.textBaseline = 'bottom';
    const curveLabelY = Math.max(Y(voigtVelocity(FREQ_MAX, mu2)) - 6, marginT + 12);
    chartCtx.fillText(fitLabel('Dispersion curve', 'Dispersion'), labelX, curveLabelY);

    chartCtx.fillStyle = TEXT_2;
    chartCtx.textBaseline = 'top';
    const refLabelY = Math.min(Y(C0) + 8, marginT + plotH - 12);
    chartCtx.fillText(fitLabel('Reference (viscoelasticity: none)', 'Reference'), labelX, refLabelY);

    function pointFor(freq) {
      const v = voigtVelocity(freq, mu2);
      return { freq, v, px: X(freq), py: Y(v) };
    }
    const natural = pointFor(NATURAL_FREQ);
    const arf = pointFor(ARF_FREQ);

    function drawGuidesAndDot(pt, color) {
      chartCtx.setLineDash([3, 3]);
      chartCtx.strokeStyle = color;
      chartCtx.lineWidth = 1;
      chartCtx.globalAlpha = 0.75;
      chartCtx.beginPath();
      chartCtx.moveTo(pt.px, pt.py);
      chartCtx.lineTo(pt.px, marginT + plotH);
      chartCtx.stroke();
      chartCtx.beginPath();
      chartCtx.moveTo(marginL, pt.py);
      chartCtx.lineTo(pt.px, pt.py);
      chartCtx.stroke();
      chartCtx.globalAlpha = 1;
      chartCtx.setLineDash([]);

      chartCtx.fillStyle = color;
      chartCtx.beginPath();
      chartCtx.arc(pt.px, pt.py, 3.5, 0, Math.PI * 2);
      chartCtx.fill();
    }
    drawGuidesAndDot(natural, TEXT_2);
    drawGuidesAndDot(arf, ACCENT_BLUE);

    // x-axis frequency labels, always well separated (250 Hz vs 650 Hz).
    chartCtx.font = '9px Inter, sans-serif';
    chartCtx.textBaseline = 'top';
    chartCtx.textAlign = 'center';
    chartCtx.fillStyle = TEXT_2;
    chartCtx.fillText(`${natural.freq} Hz`, natural.px, marginT + plotH + 4);
    chartCtx.fillStyle = ACCENT_BLUE;
    chartCtx.fillText(`${arf.freq} Hz`, arf.px, marginT + plotH + 4);

    // y-axis velocity labels — nudged apart if the two points sit near
    // the same height (as they do at viscoelasticity: none), so the
    // text stays legible without misrepresenting the underlying data.
    let naturalLabelY = natural.py, arfLabelY = arf.py;
    if (Math.abs(naturalLabelY - arfLabelY) < 14) {
      const mid = (naturalLabelY + arfLabelY) / 2;
      if (naturalLabelY <= arfLabelY) { naturalLabelY = mid - 7; arfLabelY = mid + 7; }
      else { naturalLabelY = mid + 7; arfLabelY = mid - 7; }
    }
    chartCtx.textAlign = 'right';
    chartCtx.textBaseline = 'middle';
    chartCtx.fillStyle = TEXT_2;
    chartCtx.fillText(`${natural.v.toFixed(1)} m/s`, marginL - 5, naturalLabelY);
    chartCtx.fillStyle = ACCENT_BLUE;
    chartCtx.fillText(`${arf.v.toFixed(1)} m/s`, marginL - 5, arfLabelY);

    // Origin tick, shared by both axes.
    chartCtx.fillStyle = TEXT_2;
    chartCtx.textAlign = 'left';
    chartCtx.textBaseline = 'top';
    chartCtx.fillText('0', marginL - 2, marginT + plotH + 22);

    // X-axis title only — a rotated y-axis title was dropped because it
    // sits at the same x range (near the axis) as the point velocity
    // labels above, and those labels can land anywhere along the full
    // plot height depending on mu2, so a fixed title position could
    // not avoid colliding with one of them. The velocity labels already
    // carry the "m/s" unit, so the axis meaning isn't lost.
    chartCtx.fillStyle = TEXT_3;
    chartCtx.font = '600 9px Inter, sans-serif';
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'bottom';
    chartCtx.fillText('Frequency (Hz)', marginL + plotW / 2, h - 1);
  }

  function setPlayBtnPlaying(p) {
    playing = p;
    playBtn.setAttribute('aria-label', playing ? 'Replay wave propagation animation' : 'Play wave propagation animation');
  }

  function loop(now) {
    if (startTs === null) startTs = now;
    elapsedS = (now - startTs) / 1000;
    if (elapsedS >= ANIM_DURATION_S) {
      elapsedS = ANIM_DURATION_S;
      drawWaveFrame();
      setPlayBtnPlaying(false);
      rafId = null;
      return;
    }
    drawWaveFrame();
    rafId = requestAnimationFrame(loop);
  }

  playBtn.addEventListener('click', () => {
    if (rafId) cancelAnimationFrame(rafId);
    startTs = null;
    elapsedS = 0;
    setPlayBtnPlaying(true);
    rafId = requestAnimationFrame(loop);
  });

  resetBtn.addEventListener('click', () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    startTs = null;
    elapsedS = 0;
    setPlayBtnPlaying(false);
    drawWaveFrame();
  });

  slider.addEventListener('input', () => {
    updateLevelLabel();
    drawChart();
    if (!playing) drawWaveFrame();
  });

  function resize() {
    arfSize = sizeCanvas(arfCanvas);
    naturalSize = sizeCanvas(naturalCanvas);
    chartSize = sizeCanvas(chartCanvas);
    drawWaveFrame();
    drawChart();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(arfCanvas);
  resizeObserver.observe(naturalCanvas);
  resizeObserver.observe(chartCanvas);

  updateLevelLabel();
  resize();
}

/* ---------- Module 3-4: Guided Wave / Wall Thickness Interactive ----------
   Not a full Rayleigh-Lamb solution (the panel note says so) — just a
   monotonic saturating function of thickness/wavelength, tanh-shaped,
   that is low at small ratios and rises toward the true bulk shear
   velocity as the ratio grows. One function, apparentVelocity(), drives
   the wall cross-section's bouncing ray, the chart curve, the current
   point, and the deviation readout, so all four stay in agreement.

   The wall cross-section shows a single ball tracing a smooth wave —
   simple-harmonic motion between the endocardial/epicardial boundaries —
   as it crosses left to right (the actual mechanism behind guided-wave
   dispersion: reflections at the boundaries interfere with the outgoing
   wave; a real transverse wave's displacement eases smoothly through its
   turning points rather than bouncing off them at a sharp corner, which
   is why this is SHM and not a zig-zag). Horizontally it advances at a
   constant rate — apparentVelocity(), its net rightward progress.
   Vertically it oscillates at an angular frequency derived from how much
   of the true bulk shear velocity ISN'T going into that rightward
   progress: thin walls (small apparent/true ratio) oscillate fast and
   tight, so the ball visibly takes longer to cross while completing many
   cycles; thick walls oscillate slowly, so the path flattens toward one
   long, gentle arc.
   Two earlier versions are worth knowing not to regress to. (1) A whole
   zig-zag texture scrolled across the canvas — its period varied ~65x
   across the slider range while the crossing speed varied only ~2x, so
   what read to the eye was "the pattern is being stretched," not "it's
   moving faster or slower." (2) A single ball with sharp corner
   reflections instead of SHM — the speed fix, but not wave-shaped.
   A single tracked point with a measurable crossing time avoids the
   first problem; smooth vertical easing avoids the second. */
function initGuidedWaveInteractive() {
  if (!document.querySelector('.gw-interactive')) return;

  const RHO = 1000; // kg/m^3
  const MU1 = 5000; // Pa — same baseline used by the dispersion panel above
  const V_TRUE = Math.sqrt(MU1 / RHO); // true bulk shear velocity, ~2.24 m/s

  const WAVELENGTH_MM = 5; // fixed, not adjustable
  const F_MIN = 0.32; // apparent-velocity fraction as ratio -> 0 (thin wall)
  const R0 = 1.4; // controls how quickly the curve saturates

  function apparentFraction(ratio) {
    return F_MIN + (1 - F_MIN) * Math.tanh(ratio / R0);
  }
  function apparentVelocityFromRatio(ratio) {
    return V_TRUE * apparentFraction(ratio);
  }
  function apparentVelocity(thicknessMm) {
    return apparentVelocityFromRatio(thicknessMm / WAVELENGTH_MM);
  }

  const ACCENT = 'rgb(12, 122, 112)'; // --accent — apparent velocity (the one tracked quantity)
  const TEXT_2 = 'rgb(80, 82, 82)';
  const TEXT_3 = 'rgb(51, 78, 77)';
  const BORDER = 'rgb(200, 216, 215)';

  const slider = document.getElementById('gwThicknessSlider');
  const thicknessLabel = document.getElementById('gwThicknessLabel');
  const wallCanvas = document.getElementById('gwWallCanvas');
  const chartCanvas = document.getElementById('gwChartCanvas');
  const deviationValueEl = document.getElementById('gwDeviationValue');
  if (!slider || !thicknessLabel || !wallCanvas || !chartCanvas || !deviationValueEl) return;

  const wallCtx = wallCanvas.getContext('2d');
  const chartCtx = chartCanvas.getContext('2d');
  let wallSize = { width: 0, height: 0 };
  let chartSize = { width: 0, height: 0 };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WALL_ANIM_DURATION_S = 2.5; // s to cross the canvas at V_TRUE if it never bounced (thick-wall limit)
  const TRAIL_DURATION_S = 0.6; // how much of the ball's recent path stays visible, fading out
  function wallSpeedScale() {
    return wallSize.width > 1 ? wallSize.width / WALL_ANIM_DURATION_S / V_TRUE : 0; // px/s per (m/s)
  }
  // vxPxPerSec: constant horizontal rate = apparentVelocity(), scaled to px/s.
  // omegaY: angular frequency (rad/s) of the vertical SHM, derived from a
  // reference "how fast would this gap get crossed at constant vBounce"
  // time — same relationship the old zig-zag used, just feeding a smooth
  // oscillator's frequency instead of a corner-reflecting ball's speed.
  function motionParams(thicknessMm, thicknessPx) {
    const vApparent = apparentVelocity(thicknessMm); // m/s, net rightward
    const vBounceRef = Math.sqrt(Math.max(V_TRUE * V_TRUE - vApparent * vApparent, 0)); // m/s, reference vertical rate
    const scale = wallSpeedScale();
    const vxPxPerSec = vApparent * scale;
    const vBounceRefPxPerSec = vBounceRef * scale;
    const halfPeriodS = vBounceRefPxPerSec > 1e-6 ? thicknessPx / vBounceRefPxPerSec : Infinity;
    const omegaY = isFinite(halfPeriodS) ? Math.PI / halfPeriodS : 0;
    return { vxPxPerSec, omegaY };
  }

  // Ball state, driven live off the slider each frame — no restart
  // needed when the slider moves mid-flight.
  let ballX = 0;
  let yPhase = 0; // radians; y = midY - amplitude*cos(yPhase), so phase 0 starts at the top boundary
  let trail = []; // recent {x, y, t} points, oldest first, for the fading tail
  let gwLastTs = null;

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function wallGeometry() {
    const h = wallSize.height;
    const TOP_MARGIN = 28, BOTTOM_MARGIN = 34;
    const usableH = Math.max(h - TOP_MARGIN - BOTTOM_MARGIN, 1);
    const thicknessMm = Number(slider.value);
    const maxMm = Number(slider.max);
    const pxPerMmY = usableH / maxMm;
    const thicknessPx = thicknessMm * pxPerMmY;
    const baselineY = TOP_MARGIN + usableH / 2;
    return { thicknessMm, thicknessPx, topY: baselineY - thicknessPx / 2, bottomY: baselineY + thicknessPx / 2 };
  }

  function drawBoundaries(topY, bottomY) {
    const w = wallSize.width;
    wallCtx.strokeStyle = TEXT_3;
    wallCtx.lineWidth = 1.75;
    wallCtx.beginPath();
    wallCtx.moveTo(0, topY);
    wallCtx.lineTo(w, topY);
    wallCtx.moveTo(0, bottomY);
    wallCtx.lineTo(w, bottomY);
    wallCtx.stroke();
  }

  // prefers-reduced-motion fallback: a static illustrative sine curve
  // drawn across the full width. Static viewing doesn't have the
  // animated version's "period vs. speed" confound (see module header
  // comment), so this is a fine way to still show oscillation density
  // at a glance.
  function drawWallStatic() {
    const w = wallSize.width, h = wallSize.height;
    wallCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;
    const { thicknessMm, thicknessPx, topY, bottomY } = wallGeometry();
    drawBoundaries(topY, bottomY);

    const { vxPxPerSec, omegaY } = motionParams(thicknessMm, thicknessPx);
    const omegaX = vxPxPerSec > 1e-6 ? omegaY / vxPxPerSec : 0; // rad per px
    const midY = (topY + bottomY) / 2, amp = thicknessPx / 2;

    wallCtx.strokeStyle = ACCENT;
    wallCtx.lineWidth = 2.25;
    wallCtx.beginPath();
    const step = 2;
    for (let x = 0; x <= w; x += step) {
      const y = midY - amp * Math.cos(omegaX * x);
      if (x === 0) wallCtx.moveTo(x, y); else wallCtx.lineTo(x, y);
    }
    wallCtx.stroke();
  }

  // Animated frame: boundaries, the ball's short fading trail, and the
  // ball itself. `now` is the rAF timestamp (or performance.now() for a
  // one-off paint before the loop has started).
  function drawWallAnimated(topY, bottomY, ballY, now) {
    const w = wallSize.width, h = wallSize.height;
    wallCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;
    drawBoundaries(topY, bottomY);

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const age = (now - b.t) / 1000;
      const alpha = Math.max(0, 1 - age / TRAIL_DURATION_S);
      if (alpha <= 0) continue;
      wallCtx.strokeStyle = ACCENT;
      wallCtx.globalAlpha = alpha * 0.85;
      wallCtx.lineWidth = 2.25;
      wallCtx.beginPath();
      wallCtx.moveTo(a.x, a.y);
      wallCtx.lineTo(b.x, b.y);
      wallCtx.stroke();
    }
    wallCtx.globalAlpha = 1;

    wallCtx.fillStyle = ACCENT;
    wallCtx.beginPath();
    wallCtx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    wallCtx.fill();
  }

  function currentBallY(topY, bottomY) {
    const midY = (topY + bottomY) / 2, amp = (bottomY - topY) / 2;
    return midY - amp * Math.cos(yPhase);
  }

  function drawWall() {
    if (reduceMotion) { drawWallStatic(); return; }
    const { topY, bottomY } = wallGeometry();
    drawWallAnimated(topY, bottomY, currentBallY(topY, bottomY), performance.now());
  }

  function drawChart() {
    const w = chartSize.width, h = chartSize.height;
    chartCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;

    const R_MAX = 3.2, V_MAX = V_TRUE * 1.15;
    const marginL = 48, marginR = 12, marginT = 14, marginB = 40;
    const plotW = Math.max(w - marginL - marginR, 1);
    const plotH = Math.max(h - marginT - marginB, 1);
    const X = (r) => marginL + (Math.min(r, R_MAX) / R_MAX) * plotW;
    const Y = (v) => marginT + plotH - (Math.min(v, V_MAX) / V_MAX) * plotH;

    chartCtx.strokeStyle = BORDER;
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(marginL, marginT);
    chartCtx.lineTo(marginL, marginT + plotH);
    chartCtx.lineTo(marginL + plotW, marginT + plotH);
    chartCtx.stroke();

    // True bulk shear velocity — fixed, never moves with the slider.
    chartCtx.setLineDash([5, 4]);
    chartCtx.strokeStyle = TEXT_2;
    chartCtx.lineWidth = 1.5;
    chartCtx.beginPath();
    chartCtx.moveTo(marginL, Y(V_TRUE));
    chartCtx.lineTo(marginL + plotW, Y(V_TRUE));
    chartCtx.stroke();
    chartCtx.setLineDash([]);
    chartCtx.fillStyle = TEXT_2;
    chartCtx.font = '9px Inter, sans-serif';
    chartCtx.textAlign = 'left';
    chartCtx.textBaseline = 'bottom';
    chartCtx.fillText('true bulk shear velocity', marginL + 6, Y(V_TRUE) - 3);

    // Live apparent-velocity curve.
    chartCtx.strokeStyle = ACCENT;
    chartCtx.lineWidth = 2.25;
    chartCtx.beginPath();
    const STEPS = 120;
    for (let i = 0; i <= STEPS; i++) {
      const r = (i / STEPS) * R_MAX;
      const px = X(r), py = Y(apparentVelocityFromRatio(r));
      if (i === 0) chartCtx.moveTo(px, py); else chartCtx.lineTo(px, py);
    }
    chartCtx.stroke();

    // Current point + guides to both axes.
    const thicknessMm = Number(slider.value);
    const rCur = thicknessMm / WAVELENGTH_MM;
    const vCur = apparentVelocityFromRatio(rCur);
    const px = X(rCur), py = Y(vCur);

    chartCtx.setLineDash([3, 3]);
    chartCtx.strokeStyle = ACCENT;
    chartCtx.lineWidth = 1;
    chartCtx.globalAlpha = 0.75;
    chartCtx.beginPath();
    chartCtx.moveTo(px, py);
    chartCtx.lineTo(px, marginT + plotH);
    chartCtx.stroke();
    chartCtx.beginPath();
    chartCtx.moveTo(marginL, py);
    chartCtx.lineTo(px, py);
    chartCtx.stroke();
    chartCtx.globalAlpha = 1;
    chartCtx.setLineDash([]);

    chartCtx.fillStyle = ACCENT;
    chartCtx.beginPath();
    chartCtx.arc(px, py, 3.5, 0, Math.PI * 2);
    chartCtx.fill();

    chartCtx.font = '9px Inter, sans-serif';
    chartCtx.fillStyle = ACCENT;
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'top';
    chartCtx.fillText(rCur.toFixed(2), px, marginT + plotH + 4);
    chartCtx.textAlign = 'right';
    chartCtx.textBaseline = 'middle';
    chartCtx.fillText(`${vCur.toFixed(1)} m/s`, marginL - 5, py);

    chartCtx.fillStyle = TEXT_2;
    chartCtx.textAlign = 'left';
    chartCtx.textBaseline = 'top';
    chartCtx.fillText('0', marginL - 2, marginT + plotH + 22);

    chartCtx.fillStyle = TEXT_3;
    chartCtx.font = '600 9px Inter, sans-serif';
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'bottom';
    chartCtx.fillText('Wall thickness / wavelength', marginL + plotW / 2, h - 1);
  }

  function updateThicknessLabel() {
    thicknessLabel.textContent = `${Number(slider.value).toFixed(1)} mm`;
  }

  function updateDeviation() {
    const v = apparentVelocity(Number(slider.value));
    const pct = (1 - v / V_TRUE) * 100;
    deviationValueEl.textContent = `${pct.toFixed(1)}%`;
  }

  function render() {
    drawWall();
    drawChart();
    updateDeviation();
  }

  slider.addEventListener('input', () => {
    updateThicknessLabel();
    render();
  });

  function resize() {
    wallSize = sizeCanvas(wallCanvas);
    chartSize = sizeCanvas(chartCanvas);
    render();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(wallCanvas);
  resizeObserver.observe(chartCanvas);

  // Advances the ball, read live off the slider each frame — no restart
  // needed when the slider moves mid-flight. Skipped under reduced-
  // motion; drawWall()'s static frame covers that case instead.
  function gwStep(now) {
    const { thicknessMm, thicknessPx, topY, bottomY } = wallGeometry();
    if (gwLastTs !== null) {
      const dt = Math.min((now - gwLastTs) / 1000, 0.1); // clamp so a backgrounded tab doesn't jump the ball
      const { vxPxPerSec, omegaY } = motionParams(thicknessMm, thicknessPx);
      ballX += vxPxPerSec * dt;
      yPhase += omegaY * dt;
      const ballY = currentBallY(topY, bottomY);
      trail.push({ x: ballX, y: ballY, t: now });
      while (trail.length && (now - trail[0].t) / 1000 > TRAIL_DURATION_S) trail.shift();
      if (ballX > wallSize.width) { // completed a crossing — start the next lap clean
        ballX = 0;
        yPhase = 0;
        trail = [];
      }
    }
    gwLastTs = now;
    drawWallAnimated(topY, bottomY, currentBallY(topY, bottomY), now);
    requestAnimationFrame(gwStep);
  }
  if (!reduceMotion) requestAnimationFrame(gwStep);

  updateThicknessLabel();
  resize();
}

/* ---------- Module 3-4: Anisotropic Wave Speed Interactive ----------
   Two side-by-side panels (isotropic circles vs. anisotropic ellipses)
   sharing one set of controls below them. The anisotropic wavefront is
   modeled as an ellipse — semi-axis a along the fibers, b across them —
   and every drawn ring, the measurement line endpoint, and the
   displayed speed number all read from the SAME ellipseRadiusNormalized()
   call at the same angle, so the drawing and the readout can never
   drift apart. See constants below for the anisotropy ratio and the
   placeholder fiber angles. */
function initAnisotropyInteractive() {
  if (!document.querySelector('.aniso-interactive')) return;

  // ---- Constants — edit here ----
  const ANISOTROPY_RATIO = 1.5; // a/b: ellipse semi-axis along fibers vs. across them. Illustrative, not measured.
  // Placeholders — to be set later from a citation. Deliberately never printed in the UI (only used to
  // interpolate the fiber angle driven by the transmural-depth slider).
  const FIBER_ANGLE_ENDO_DEG = 150;
  const FIBER_ANGLE_EPI_DEG = 30;

  const FIBER_COLOR = 'rgb(155, 100, 0)'; // --accent-amber — fiber direction, consistent across panel + thumbnail
  const WAVE_COLOR_SOFT = 'rgba(12, 122, 112, 0.4)'; // --accent, for wavefront rings
  const TEXT_1 = 'rgb(15, 31, 30)';
  const TEXT_2 = 'rgb(80, 82, 82)';
  const BORDER = 'rgb(200, 216, 215)';
  const BG_MID = 'rgb(245, 250, 250)';
  const CARD = 'rgb(255, 255, 255)';

  const RING_FRACTIONS = [0.42, 0.68, 0.94]; // wavefront ring radii, as a fraction of the base radius

  // Polar equation of an ellipse (semi-axis a along the 0deg/major axis, b across it), evaluated at the
  // angle between the propagation direction and the fiber axis. Normalized so across-fiber (alpha=90) = 1.
  function ellipseRadiusNormalized(alphaDeg) {
    const a = ANISOTROPY_RATIO, b = 1;
    const rad = (alphaDeg * Math.PI) / 180;
    return (a * b) / Math.sqrt((b * Math.cos(rad)) ** 2 + (a * Math.sin(rad)) ** 2);
  }

  function fiberAngleForDepth(depthFrac) {
    return FIBER_ANGLE_ENDO_DEG + (FIBER_ANGLE_EPI_DEG - FIBER_ANGLE_ENDO_DEG) * depthFrac;
  }

  // 0deg = right, 90deg = up, increasing counterclockwise — used identically for the propagation angle,
  // the fiber angle, and the thumbnail's wall-position marker so every angle on screen means the same thing.
  function unitVec(deg) {
    const rad = (deg * Math.PI) / 180;
    return { dx: Math.cos(rad), dy: -Math.sin(rad) };
  }

  const angleSlider = document.getElementById('anisoAngleSlider');
  const angleLabel = document.getElementById('anisoAngleLabel');
  const depthSlider = document.getElementById('anisoDepthSlider');
  const depthLabel = document.getElementById('anisoDepthLabel');
  const isoCanvas = document.getElementById('isoCanvas');
  const anisoCanvas = document.getElementById('anisoCanvas');
  const thumbCanvas = document.getElementById('anisoThumbCanvas');
  const isoSpeedValue = document.getElementById('isoSpeedValue');
  const anisoSpeedValue = document.getElementById('anisoSpeedValue');
  if (!angleSlider || !angleLabel || !depthSlider || !depthLabel || !isoCanvas || !anisoCanvas || !thumbCanvas ||
    !isoSpeedValue || !anisoSpeedValue) return;

  const isoCtx = isoCanvas.getContext('2d');
  const anisoCtx = anisoCanvas.getContext('2d');
  const thumbCtx = thumbCanvas.getContext('2d');
  let isoSize = { width: 0, height: 0 };
  let anisoSize = { width: 0, height: 0 };
  let thumbSize = { width: 0, height: 0 };

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function drawBlock(ctx, w, h) {
    const margin = 10;
    ctx.fillStyle = BG_MID;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.fillRect(margin, margin, w - margin * 2, h - margin * 2);
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    return { left: margin, top: margin, right: w - margin, bottom: h - margin };
  }

  function drawSource(ctx, cx, cy) {
    ctx.fillStyle = TEXT_1;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dashed 0deg reference + a short arc sweeping to the current propagation angle, so the angle reads
  // visually rather than only through the slider's own numeric label.
  function drawAngleGuide(ctx, cx, cy, refLen, thetaDeg) {
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = TEXT_2;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + refLen, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, -(thetaDeg * Math.PI) / 180, true);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  function drawMeasurementLine(ctx, cx, cy, endX, endY) {
    ctx.strokeStyle = TEXT_1;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = TEXT_1;
    ctx.fill();
  }

  function drawFiberArrow(ctx, bounds, phiDeg) {
    const anchorX = bounds.left + 26;
    const anchorY = bounds.top + 20;
    const v = unitVec(phiDeg);
    const half = 15;
    const x1 = anchorX - v.dx * half, y1 = anchorY - v.dy * half;
    const x2 = anchorX + v.dx * half, y2 = anchorY + v.dy * half;

    ctx.strokeStyle = FIBER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const headLen = 5.5;
    const lineAngle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(lineAngle - Math.PI / 6), y2 - headLen * Math.sin(lineAngle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(lineAngle + Math.PI / 6), y2 - headLen * Math.sin(lineAngle + Math.PI / 6));
    ctx.stroke();

    ctx.fillStyle = FIBER_COLOR;
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('fiber axis', anchorX + 20, anchorY - 10);
  }

  function renderIso() {
    const w = isoSize.width, h = isoSize.height;
    isoCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;
    const bounds = drawBlock(isoCtx, w, h);
    const cx = (bounds.left + bounds.right) / 2;
    const cy = (bounds.top + bounds.bottom) / 2;
    const baseR = Math.min(cx - bounds.left, cy - bounds.top) - 6;

    isoCtx.strokeStyle = WAVE_COLOR_SOFT;
    isoCtx.lineWidth = 1.5;
    RING_FRACTIONS.forEach((f) => {
      isoCtx.beginPath();
      isoCtx.arc(cx, cy, baseR * f, 0, Math.PI * 2);
      isoCtx.stroke();
    });

    const thetaDeg = Number(angleSlider.value);
    const outerR = baseR * RING_FRACTIONS[RING_FRACTIONS.length - 1];
    drawAngleGuide(isoCtx, cx, cy, outerR, thetaDeg);
    const v = unitVec(thetaDeg);
    drawMeasurementLine(isoCtx, cx, cy, cx + v.dx * outerR, cy + v.dy * outerR);
    drawSource(isoCtx, cx, cy);
  }

  function renderAniso() {
    const w = anisoSize.width, h = anisoSize.height;
    anisoCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;
    const bounds = drawBlock(anisoCtx, w, h);
    const cx = (bounds.left + bounds.right) / 2;
    const cy = (bounds.top + bounds.bottom) / 2;
    // Divided by the anisotropy ratio so the along-fiber extent (up to ratio x baseR) never overflows the block.
    const baseR = (Math.min(cx - bounds.left, cy - bounds.top) - 6) / ANISOTROPY_RATIO;

    const depthFrac = Number(depthSlider.value) / 100;
    const phiDeg = fiberAngleForDepth(depthFrac);

    anisoCtx.save();
    anisoCtx.beginPath();
    anisoCtx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    anisoCtx.clip();
    const dir = unitVec(phiDeg);
    const perpX = -dir.dy, perpY = dir.dx;
    const spacing = 11;
    const diag = Math.hypot(w, h);
    anisoCtx.strokeStyle = FIBER_COLOR;
    anisoCtx.globalAlpha = 0.4;
    anisoCtx.lineWidth = 1;
    for (let o = -diag; o <= diag; o += spacing) {
      const ox = cx + perpX * o, oy = cy + perpY * o;
      anisoCtx.beginPath();
      anisoCtx.moveTo(ox - dir.dx * diag, oy - dir.dy * diag);
      anisoCtx.lineTo(ox + dir.dx * diag, oy + dir.dy * diag);
      anisoCtx.stroke();
    }
    anisoCtx.globalAlpha = 1;
    anisoCtx.restore();

    // Concentric wavefront ellipses. Each point is r(theta) = baseR * ring fraction *
    // ellipseRadiusNormalized(theta - phi) along the GLOBAL angle theta — the exact same expression used
    // below for the measurement line and the displayed number, so drawing and readout can't disagree.
    anisoCtx.strokeStyle = WAVE_COLOR_SOFT;
    anisoCtx.lineWidth = 1.5;
    RING_FRACTIONS.forEach((f) => {
      anisoCtx.beginPath();
      const STEPS = 120;
      for (let i = 0; i <= STEPS; i++) {
        const thetaI = (i / STEPS) * 360;
        const r = baseR * f * ellipseRadiusNormalized(thetaI - phiDeg);
        const v = unitVec(thetaI);
        const px = cx + v.dx * r, py = cy + v.dy * r;
        if (i === 0) anisoCtx.moveTo(px, py); else anisoCtx.lineTo(px, py);
      }
      anisoCtx.closePath();
      anisoCtx.stroke();
    });

    drawFiberArrow(anisoCtx, bounds, phiDeg);

    const thetaDeg = Number(angleSlider.value);
    const speed = ellipseRadiusNormalized(thetaDeg - phiDeg);
    const outerFrac = RING_FRACTIONS[RING_FRACTIONS.length - 1];
    const outerR = baseR * outerFrac * speed;
    drawAngleGuide(anisoCtx, cx, cy, baseR * outerFrac, thetaDeg);
    const v = unitVec(thetaDeg);
    drawMeasurementLine(anisoCtx, cx, cy, cx + v.dx * outerR, cy + v.dy * outerR);
    drawSource(anisoCtx, cx, cy);

    anisoSpeedValue.textContent = speed.toFixed(2);
  }

  function renderThumb() {
    const w = thumbSize.width, h = thumbSize.height;
    thumbCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;
    const cx = w / 2, cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 4;
    const innerR = outerR * 0.55;

    thumbCtx.beginPath();
    thumbCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
    thumbCtx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    thumbCtx.closePath();
    thumbCtx.fillStyle = BG_MID;
    thumbCtx.fill();
    thumbCtx.strokeStyle = BORDER;
    thumbCtx.lineWidth = 1;
    thumbCtx.beginPath();
    thumbCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
    thumbCtx.stroke();

    thumbCtx.beginPath();
    thumbCtx.arc(cx, cy, innerR, 0, Math.PI * 2);
    thumbCtx.fillStyle = CARD;
    thumbCtx.fill();
    thumbCtx.strokeStyle = BORDER;
    thumbCtx.stroke();

    const depthFrac = Number(depthSlider.value) / 100;
    const markerR = innerR + (outerR - innerR) * depthFrac;
    const v = unitVec(90); // straight up — a fixed reference radius, purely to display wall position
    thumbCtx.setLineDash([2, 2]);
    thumbCtx.strokeStyle = BORDER;
    thumbCtx.lineWidth = 1;
    thumbCtx.beginPath();
    thumbCtx.moveTo(cx + v.dx * innerR, cy + v.dy * innerR);
    thumbCtx.lineTo(cx + v.dx * outerR, cy + v.dy * outerR);
    thumbCtx.stroke();
    thumbCtx.setLineDash([]);

    thumbCtx.beginPath();
    thumbCtx.arc(cx + v.dx * markerR, cy + v.dy * markerR, 3.5, 0, Math.PI * 2);
    thumbCtx.fillStyle = FIBER_COLOR;
    thumbCtx.fill();
    thumbCtx.strokeStyle = CARD;
    thumbCtx.lineWidth = 1;
    thumbCtx.stroke();
  }

  function updateAngleLabel() {
    angleLabel.textContent = `${angleSlider.value}°`;
  }

  function updateDepthLabel() {
    const v = Number(depthSlider.value);
    let word;
    if (v <= 15) word = 'Endocardium';
    else if (v >= 85) word = 'Epicardium';
    else if (Math.abs(v - 50) <= 10) word = 'Mid-wall';
    else word = v < 50 ? 'Sub-endocardial' : 'Sub-epicardial';
    depthLabel.textContent = word;
  }

  function pulse(el) {
    el.classList.remove('aniso-pulse');
    void el.offsetWidth; // restart the animation on repeated triggers
    el.classList.add('aniso-pulse');
  }

  function render() {
    renderIso();
    renderAniso();
    renderThumb();
  }

  angleSlider.addEventListener('input', () => {
    updateAngleLabel();
    render();
    pulse(anisoSpeedValue);
  });
  depthSlider.addEventListener('input', () => {
    updateDepthLabel();
    render();
    pulse(anisoSpeedValue);
  });

  function resize() {
    isoSize = sizeCanvas(isoCanvas);
    anisoSize = sizeCanvas(anisoCanvas);
    thumbSize = sizeCanvas(thumbCanvas);
    render();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(isoCanvas);
  resizeObserver.observe(anisoCanvas);
  resizeObserver.observe(thumbCanvas);

  updateAngleLabel();
  updateDepthLabel();
  resize();
}
