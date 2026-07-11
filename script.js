document.addEventListener('DOMContentLoaded', () => {
  initNavDrawer();
  initRefPanel();
  initBackToTop();
  initSectionState();
  initTutorialTour();
  initHeroWave();
  initWaveTypesInteractive();
});

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
   Both use the same displacement model — d = A·sin(k·(x0 − v·t)) — so
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
  const SHEAR_MS_MIN = 1; // m/s label at slider = 0
  const SHEAR_MS_MAX = 10; // m/s label at slider = 100

  let compSize = { width: 0, height: 0 };
  let shearSize = { width: 0, height: 0 };
  let compPhase = 0;
  let shearPhase = 0;
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

  function drawCompressional(width, height, phase) {
    compCtx.clearRect(0, 0, width, height);
    if (width <= 1) return;
    const marginY = height * 0.18;
    const spacingY = ROWS > 1 ? (height - marginY * 2) / (ROWS - 1) : 0;
    const cols = Math.ceil(width / GRID_SPACING_X) + 4;
    compCtx.fillStyle = 'rgba(91, 74, 175, 0.72)'; // accent-violet
    for (let r = 0; r < ROWS; r++) {
      const y = marginY + r * spacingY;
      for (let c = -2; c < cols; c++) {
        const x0 = c * GRID_SPACING_X;
        const x = x0 + AMPLITUDE_COMP * Math.sin(K * x0 - phase);
        if (x < -6 || x > width + 6) continue;
        compCtx.beginPath();
        compCtx.arc(x, y, 2.5, 0, Math.PI * 2);
        compCtx.fill();
      }
    }
  }

  function drawShear(width, height, phase) {
    shearCtx.clearRect(0, 0, width, height);
    if (width <= 1) return;
    // Same grid geometry as drawCompressional (same ROWS, same margin
    // formula, same column spacing) — only the displacement axis differs.
    const marginY = height * 0.18;
    const spacingY = ROWS > 1 ? (height - marginY * 2) / (ROWS - 1) : 0;
    const cols = Math.ceil(width / GRID_SPACING_X) + 4;
    shearCtx.fillStyle = 'rgba(12, 122, 112, 0.75)'; // accent
    for (let c = -2; c < cols; c++) {
      const x0 = c * GRID_SPACING_X;
      if (x0 < -6 || x0 > width + 6) continue;
      const dy = AMPLITUDE_SHEAR * Math.sin(K_SHEAR * x0 - phase);
      for (let r = 0; r < ROWS; r++) {
        const yRest = marginY + r * spacingY;
        shearCtx.beginPath();
        shearCtx.arc(x0, yRest + dy, 2.5, 0, Math.PI * 2);
        shearCtx.fill();
      }
    }
  }

  function render() {
    drawCompressional(compSize.width, compSize.height, compPhase);
    drawShear(shearSize.width, shearSize.height, shearPhase);
  }

  // Deliberately plain material-stiffness language, not clinical
  // terms like "healthy" or "fibrosis" — this panel's only job is
  // stiffer material → faster shear wave. Pathology is covered
  // elsewhere in the module. The level also drives the label's color
  // (see #stiffnessValueLabel[data-level] in style.css).
  const STIFFNESS_LABELS = { soft: 'Soft', medium: 'Medium', stiff: 'Stiff' };

  function stiffnessLevel(v) {
    if (v < 33) return 'soft';
    if (v < 67) return 'medium';
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
    compPhase += COMP_SPEED * dt * K;
    shearPhase += shearSpeedPx * dt * K_SHEAR;
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

  slider.addEventListener('input', updateFromSlider);
  playToggle.addEventListener('click', () => setPlaying(!playing));

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
  setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
