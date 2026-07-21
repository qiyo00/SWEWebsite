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
  });
  initValveInteractive({
    stageId: 'valveStage', dotGroupId: 'mitralDotGroup', dotId: 'mitralDot', waveId: 'mitralWavePath',
    hitAreaId: 'mitralHitArea', playBtnId: 'mitralPlayBtn', resetBtnId: 'mitralResetBtn',
    drawDuration: 2300,
  });
  initDispersionInteractive();
  initGuidedWaveInteractive();
  initAnisotropyInteractive();
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

/* ---------- Module 3-2: ARF Push Pulse Interactive ----------
   Sequenced reveal (see matching keyframes/delays in style.css):
   beam clips in top-to-bottom -> focal zone fades/scales in -> the
   displacement dot pops -> a shear-wave pulse fires.
   Each arm (left/right) is exactly one persistent <path>, never
   cloned or replaced — see .shear-arm-path in the SVG markup, clipped
   to the tissue rect so a hump disappears as it crosses the tissue
   edge rather than traveling on visibly past the medium. Every pulse
   just pushes a { start } timestamp onto that arm's own list; one
   shared rAF loop rebuilds each arm's 'd' attribute every frame by
   concatenating one hump-shaped subpath per still-active pulse on
   that arm (SVG allows multiple "M...C...C..." subpaths in one 'd').
   So several clicks in flight show as multiple humps traveling
   together on the SAME line, not as separate lines stacking up. The
   same routine fires once automatically after the intro sequence and
   again on every click ("poke"). */
function initArfInteractive() {
  const stage = document.getElementById('arfStage');
  const svg = document.getElementById('arfSvg');
  const dotEl = document.getElementById('dot');
  const hitArea = document.getElementById('arfHitArea');
  const playBtn = document.getElementById('arfPlayBtn');
  const resetBtn = document.getElementById('arfResetBtn');
  const labelShear = svg ? svg.querySelector('.arf-label-shear') : null;
  const leftPath = svg ? svg.querySelector('.shear-arm-path[data-arm="left"]') : null;
  const rightPath = svg ? svg.querySelector('.shear-arm-path[data-arm="right"]') : null;
  if (!stage || !svg || !dotEl || !hitArea || !playBtn || !resetBtn || !labelShear || !leftPath || !rightPath) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Geometry lifted from the source SVG's original (static) hump, so the
  // animated hump matches its authored size exactly — only its position
  // along the path now varies.
  const DOT_X = 1276.319;
  const BASE_Y = 1135.362;
  const HALF_WIDTH = 89.043;
  const DIP = 60;
  const CTRL = 44.521;
  const PULSE_DURATION = 3000; // ms, dot -> travelX

  // travelX only needs to clear the tissue edge by enough that the whole
  // hump (not just its center) is past it before cleanup — the
  // #shearWave clip-path (matching the tissue rect) does the actual
  // hiding, so there's no need to travel all the way off the canvas.
  const arms = [
    { dir: -1, edgeX: 556.814, travelX: 250, path: leftPath, pulses: [] },
    { dir: 1, edgeX: 1995.824, travelX: 2300, path: rightPath, pulses: [] },
  ];

  let canPulse = false;
  let loopRunning = false;

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

  // Builds ONE connected line per arm — every currently-active pulse on
  // that arm is a hump threaded into the same path in position order
  // (older pulses always further along, since they all move at the same
  // rate — see runPulse), each joined to the next by a single flat
  // segment. This is deliberate: drawing each pulse as its own separate
  // dot-to-edge subpath (an earlier version of this) meant a newer
  // pulse's flat trailing segment cut straight across an older pulse's
  // still-visible hump, and the two overlapping strokes read as a closed
  // lens shape between them. One thread, one line, no matter how many
  // pulses are in flight.
  function buildArmD(arm, humpCenters) {
    let d = `M${DOT_X},${BASE_Y}`;
    let cursorX = DOT_X;
    humpCenters.forEach((hc) => {
      let enterX = hc - arm.dir * HALF_WIDTH;
      // Guard against near-simultaneous clicks producing near-identical
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

  function showShearLabel() {
    labelShear.style.transition = 'opacity 0.4s ease-out';
    labelShear.style.opacity = '1';
  }

  function hideShearLabel() {
    labelShear.style.transition = '';
    labelShear.style.opacity = '0';
  }

  function tick(now) {
    let anyActive = false;
    arms.forEach((arm) => {
      arm.pulses = arm.pulses.filter((pulse) => (now - pulse.start) / PULSE_DURATION < 1);
      if (arm.pulses.length === 0) {
        arm.path.setAttribute('d', '');
        return;
      }
      anyActive = true;
      const hcStart = DOT_X + arm.dir * HALF_WIDTH;
      const hcEnd = arm.travelX - arm.dir * HALF_WIDTH;
      const humpCenters = arm.pulses
        .map((pulse) => {
          const p = Math.min((now - pulse.start) / PULSE_DURATION, 1);
          return hcStart + p * (hcEnd - hcStart);
        })
        .sort((a, b) => (a - DOT_X) * arm.dir - (b - DOT_X) * arm.dir);
      arm.path.setAttribute('d', buildArmD(arm, humpCenters));
    });
    if (anyActive) {
      requestAnimationFrame(tick);
    } else {
      loopRunning = false;
    }
  }

  function ensureLoop() {
    if (loopRunning) return;
    loopRunning = true;
    requestAnimationFrame(tick);
  }

  function runPulse() {
    showShearLabel();
    if (dotEl.animate) {
      dotEl.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }, { transform: 'scale(1)' }],
        { duration: 450, easing: 'ease-out' }
      );
    }
    const start = performance.now();
    arms.forEach((arm) => arm.pulses.push({ start }));
    ensureLoop();
  }

  function clearPulses() {
    arms.forEach((arm) => {
      arm.pulses = [];
      arm.path.setAttribute('d', '');
    });
    loopRunning = false;
  }

  function showStaticShearFrame() {
    // Reduced motion: one illustrative frame, parked at the tissue edge.
    arms.forEach((arm) => {
      const hc = arm.edgeX - arm.dir * HALF_WIDTH;
      arm.path.setAttribute('d', buildArmD(arm, [hc]));
    });
    showShearLabel();
  }

  function playSequence() {
    canPulse = false;
    clearPulses();
    hideShearLabel();
    stage.classList.remove('playing', 'no-motion');
    void stage.offsetWidth; // force reflow so the restarted CSS animations actually replay
    if (reduceMotion) {
      stage.classList.add('no-motion', 'playing');
      showStaticShearFrame();
    } else {
      stage.classList.add('playing');
    }
  }

  function resetSequence() {
    canPulse = false;
    clearPulses();
    hideShearLabel();
    stage.classList.remove('playing', 'no-motion');
  }

  dotEl.addEventListener('animationend', (e) => {
    if (e.animationName === 'arfDotPop') {
      canPulse = true;
      runPulse();
    }
  });

  hitArea.addEventListener('click', () => {
    if (!reduceMotion && canPulse) runPulse();
  });

  playBtn.addEventListener('click', playSequence);
  resetBtn.addEventListener('click', resetSequence);

  playSequence();
}

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
   logic drives both. */
function initValveInteractive(cfg) {
  const stage = document.getElementById(cfg.stageId);
  const dotGroup = document.getElementById(cfg.dotGroupId);
  const dotEl = document.getElementById(cfg.dotId);
  const waveEl = document.getElementById(cfg.waveId);
  const hitArea = document.getElementById(cfg.hitAreaId);
  const playBtn = document.getElementById(cfg.playBtnId);
  const resetBtn = document.getElementById(cfg.resetBtnId);
  if (!stage || !dotGroup || !dotEl || !waveEl || !hitArea || !playBtn || !resetBtn) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PULSE_DURATION = cfg.drawDuration || 2300;

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

  function playSequence() {
    dotGroup.classList.remove('playing', 'no-motion');
    clearPulse();
    void stage.offsetWidth; // force reflow so restarted animations replay

    if (reduceMotion) {
      dotGroup.classList.add('playing', 'no-motion');
      // Illustrative frame: hump parked right at the dot, showing the
      // wave's shape without animating it across the route.
      waveEl.setAttribute('d', buildWaveD(hcStart));
      return;
    }
    dotGroup.classList.add('playing');
  }

  function resetSequence() {
    dotGroup.classList.remove('playing', 'no-motion');
    clearPulse();
  }

  dotEl.addEventListener('animationend', (e) => {
    if (e.animationName !== 'valveDotPop') return;
    runPulse();
  });

  hitArea.addEventListener('click', playSequence);
  playBtn.addEventListener('click', playSequence);
  resetBtn.addEventListener('click', resetSequence);

  playSequence();
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
    const frameRateReadout = document.getElementById(ids.frameRateReadout);
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
        if (frameRateReadout) frameRateReadout.textContent = `≈ ${Math.round(1 / frameDurationS)} fps`;
      } else {
        if (secondaryLabel) secondaryLabel.textContent = `${Number(secondarySlider.value).toLocaleString()} fps`;
        if (frameRateReadout) frameRateReadout.textContent = `${(frameDurationS * 1000).toFixed(2)} ms`;
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
    stageCanvas: 'convStageCanvas', frameRateReadout: 'convFrameRateReadout',
    sampleCountReadout: 'convSampleCountReadout', plotCanvas: 'convPlotCanvas',
    estReadout: 'convEstReadout', trueReadout: 'convTrueReadout',
    playBtn: 'convPlayToggle', resetBtn: 'convResetBtn',
  });
  makePanel('ultrafast', {
    velocitySlider: 'ultraVelocitySlider', velocityLabel: 'ultraVelocityLabel',
    secondarySlider: 'ultraFpsSlider', secondaryLabel: 'ultraFpsLabel',
    stageCanvas: 'ultraStageCanvas', frameRateReadout: 'ultraFrameRateReadout',
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
    const marginL = 48, marginR = 12, marginT = 14, marginB = 46;
    const plotW = Math.max(w - marginL - marginR, 1);
    const plotH = Math.max(h - marginT - marginB, 1);
    const X = (f) => marginL + (f / FREQ_MAX) * plotW;
    const Y = (v) => marginT + plotH - (Math.min(v, VEL_MAX) / VEL_MAX) * plotH;
    const mu2 = currentMu2();

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
   the wall cross-section's sine amplitude, the chart curve, the current
   point, and the deviation readout, so all four stay in agreement. */
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

  function drawWall() {
    const w = wallSize.width, h = wallSize.height;
    wallCtx.clearRect(0, 0, w, h);
    if (w <= 1) return;

    const TOP_MARGIN = 28, BOTTOM_MARGIN = 34;
    const usableH = Math.max(h - TOP_MARGIN - BOTTOM_MARGIN, 1);
    const thicknessMm = Number(slider.value);
    const maxMm = Number(slider.max);
    const pxPerMmY = usableH / maxMm;
    const thicknessPx = thicknessMm * pxPerMmY;
    const baselineY = TOP_MARGIN + usableH / 2;
    const topY = baselineY - thicknessPx / 2;
    const bottomY = baselineY + thicknessPx / 2;

    wallCtx.strokeStyle = TEXT_3;
    wallCtx.lineWidth = 1.75;
    wallCtx.beginPath();
    wallCtx.moveTo(0, topY);
    wallCtx.lineTo(w, topY);
    wallCtx.moveTo(0, bottomY);
    wallCtx.lineTo(w, bottomY);
    wallCtx.stroke();

    // Amplitude is capped by the gap itself — as the wall narrows, the
    // wave visibly gets squeezed between the boundaries instead of just
    // sitting inside an ever-shrinking box unaffected.
    const amplitude = Math.min(Math.max(thicknessPx / 2 - 5, 3), 26);
    const PX_PER_MM_X = 13;
    const wavelengthPx = WAVELENGTH_MM * PX_PER_MM_X;
    const k = (2 * Math.PI) / wavelengthPx;

    wallCtx.strokeStyle = ACCENT;
    wallCtx.lineWidth = 2.25;
    wallCtx.beginPath();
    const step = 2;
    for (let x = 0; x <= w; x += step) {
      const y = baselineY + amplitude * Math.sin(k * x);
      if (x === 0) wallCtx.moveTo(x, y); else wallCtx.lineTo(x, y);
    }
    wallCtx.stroke();

    // Wavelength bracket, fixed within the reserved bottom margin so it
    // never collides with the boundaries even at max wall thickness.
    const x0 = 24;
    const bracketY = h - BOTTOM_MARGIN + 11;
    wallCtx.strokeStyle = TEXT_2;
    wallCtx.lineWidth = 1;
    wallCtx.beginPath();
    wallCtx.moveTo(x0, bracketY - 4);
    wallCtx.lineTo(x0, bracketY);
    wallCtx.lineTo(x0 + wavelengthPx, bracketY);
    wallCtx.lineTo(x0 + wavelengthPx, bracketY - 4);
    wallCtx.stroke();

    wallCtx.fillStyle = TEXT_2;
    wallCtx.font = '9px Inter, sans-serif';
    wallCtx.textAlign = 'center';
    wallCtx.textBaseline = 'top';
    wallCtx.fillText(`λ = ${WAVELENGTH_MM} mm`, x0 + wavelengthPx / 2, bracketY + 3);
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
