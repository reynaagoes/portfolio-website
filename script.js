const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".home-nav__links a, .nav-links a");
const getSavedTheme = () => {
  try {
    return localStorage.getItem("portfolio-theme");
  } catch (error) {
    return null;
  }
};
const savedTheme = getSavedTheme();
const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const portfolioIntro = document.querySelector(".portfolio-intro");
const homeHero = document.querySelector(".home-hero");

const applyTheme = (theme) => {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle("dark-theme", isDark);
  document.documentElement.classList.toggle("light-theme", !isDark);
  document.body.classList.toggle("dark-theme", isDark);
  document.body.classList.toggle("light-theme", !isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }
};

const setActiveNav = () => {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === currentPath);
  });
};

applyTheme(document.body.dataset.page === "intro" ? "dark" :
  (savedTheme || (document.body.dataset.page === "projects" ? "light" : "dark")));
setActiveNav();

const initPageTransitions = () => {
  const routeLabels = new Map([
    ["home.html", "HOME"],
    ["projects.html", "WORK"],
    ["experience.html", "EXPERIENCE"],
    ["about.html", "ABOUT"],
    ["contact.html", "CONTACT"]
  ]);
  const currentRoute = window.location.pathname.split("/").pop() || "index.html";
  const overlay = document.querySelector(".page-transition");
  const label = overlay?.querySelector(".page-transition__name");
  if (!routeLabels.has(currentRoute) || !overlay || !label) return;

  let isTransitioning = false;
  const reduced = prefersReducedMotion.matches;
  const enterDuration = reduced ? 140 : 880;
  const exitDuration = reduced ? 180 : 980;

  const setTransitionLabel = (text) => {
    label.replaceChildren(...[...text].map((character, index, characters) => {
      const clip = document.createElement("span");
      const letter = document.createElement("span");
      clip.className = "page-transition__character";
      letter.className = "page-transition__letter";
      letter.textContent = character;
      letter.style.setProperty("--character-index", index);
      letter.style.setProperty("--character-reverse-index", characters.length - index - 1);
      clip.appendChild(letter);
      return clip;
    }));
  };

  setTransitionLabel(routeLabels.get(currentRoute));
  window.scrollTo(0, 0);
  // Arriving from the index.html pool zoom: skip the entry overlay entirely (no label, no exit animation).
  let skipEntry = false;
  try {
    skipEntry = sessionStorage.getItem("skip-page-transition-entry") === "1";
    sessionStorage.removeItem("skip-page-transition-entry");
  } catch (error) {
    // Continue with the normal entry when storage is unavailable.
  }
  if (skipEntry) {
    overlay.className = "page-transition is-idle";
  } else window.setTimeout(() => {
    overlay.className = "page-transition is-exiting";
    window.setTimeout(() => {
      overlay.className = "page-transition is-idle";
    }, exitDuration);
  }, reduced ? 20 : 100);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const destination = new URL(link.href, window.location.href);
    const destinationRoute = destination.pathname.split("/").pop();
    if (destination.origin !== window.location.origin || destination.hash || !routeLabels.has(destinationRoute)) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    if (isTransitioning) return;
    isTransitioning = true;
    setTransitionLabel(routeLabels.get(destinationRoute));
    overlay.className = "page-transition is-idle";
    void overlay.offsetHeight;
    requestAnimationFrame(() => overlay.className = "page-transition is-entering");
    window.setTimeout(() => {
      window.location.href = destination.href;
    }, enterDuration);
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    isTransitioning = false;
    setTransitionLabel(routeLabels.get(currentRoute));
    overlay.className = "page-transition is-idle";
    window.scrollTo(0, 0);
  });
};

const revealAll = () => {
  revealElements.forEach((element) => {
    element.classList.add("is-visible");
  });
};

const initRevealAnimations = () => {
  if (!revealElements.length) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });

  revealElements.forEach((element) => {
    observer.observe(element);
  });
};

const initPortfolioIntro = () => {
  if (!portfolioIntro) {
    return;
  }

  const goHome = () => {
    try {
      sessionStorage.setItem("skip-page-transition-entry", "1");
    } catch (error) {
      // Continue without session state when storage is unavailable.
    }
    window.location.replace("home.html");
  };
  const hasPool = Boolean(portfolioIntro.querySelector("[data-pool-ripple]"));
  // Pool intro: reduced motion skips the whole sequence.
  if (hasPool && prefersReducedMotion.matches) {
    goHome();
    return;
  }
  const count = portfolioIntro.querySelector(".portfolio-intro__count");
  const startedAt = performance.now();
  const duration = hasPool ? 2000 : prefersReducedMotion.matches ? 500 : 1100;

  const updateCount = (now) => {
    const value = Math.min(100, Math.round(((now - startedAt) / duration) * 100));
    count.textContent = String(value).padStart(2, "0");
    if (value < 100) window.requestAnimationFrame(updateCount);
  };

  window.requestAnimationFrame(updateCount);
  // Pool intro: the pool zooms and brightens during the count (CSS .is-loading), then hands over.
  // Two frames so the small, dim start state is painted before the transition begins.
  if (hasPool) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => portfolioIntro.classList.add("is-loading")));
  }
  if (hasPool) {
    window.setTimeout(() => {
      portfolioIntro.classList.add("is-revealed");
      portfolioIntro.dispatchEvent(new CustomEvent("pool:reveal"));
    }, duration);
    return;
  }
  window.setTimeout(() => portfolioIntro.classList.add("is-entering"), duration + 100);
  window.setTimeout(() => portfolioIntro.classList.add("is-leaving"), duration + 700);
  window.setTimeout(goHome, duration + 1100);
};

// One reversible progress controller; the existing water renderer remains the only Home simulation.
const initHomeScrollDive = () => {
  if (!homeHero || homeHero.dataset.diveReady) return;
  homeHero.dataset.diveReady = "true";
  const destinations = homeHero.querySelector(".home-depth");
  const hint = homeHero.querySelector(".home-hero__scroll");
  if (!destinations) return;
  let target = 0, progress = 0, frame = null, previous = 0, touchY = null;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const paint = () => {
    homeHero.style.setProperty("--dive", progress.toFixed(4));
    homeHero.dataset.dive = progress;
    const revealed = progress >= 0.68;
    destinations.inert = !revealed;
    destinations.setAttribute("aria-hidden", String(!revealed));
    document.body.classList.toggle("is-home-diving", progress < 0.999);
    homeHero.dispatchEvent(new Event("dive:progress"));
  };
  const tick = (now) => {
    frame = null;
    if (document.hidden) return;
    const dt = Math.min(64, previous ? now - previous : 16);
    previous = now;
    progress += (target - progress) * (1 - Math.exp(-dt / 110));
    if (Math.abs(target - progress) < 0.001) progress = target;
    paint();
    if (progress !== target) frame = requestAnimationFrame(tick);
  };
  const seek = (value) => {
    target = clamp(value);
    if (prefersReducedMotion.matches) { progress = target; paint(); return; }
    if (frame === null && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); }
  };
  const editable = (element) => element.closest("input, textarea, select, [contenteditable], .ripple-menu__panel, .ripple-menu__toggle");
  const advance = (delta, event) => {
    if (window.scrollY > 1 || editable(event.target)) return;
    // Once fully submerged, forward input can reach the preserved work section.
    if (delta > 0 && progress === 1 && target === 1) return;
    event.preventDefault();
    seek(target + delta / Math.max(900, innerHeight * 1.8));
  };
  window.addEventListener("wheel", (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    advance(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1), event);
  }, { passive: false });
  window.addEventListener("touchstart", (event) => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener("touchmove", (event) => {
    if (touchY === null || event.touches.length !== 1) return;
    const y = event.touches[0].clientY;
    advance((touchY - y) * 2.2, event);
    touchY = y;
  }, { passive: false });
  window.addEventListener("touchend", () => { touchY = null; }, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || editable(event.target) || event.target.closest("a, button")) return;
    const delta = { ArrowDown: 120, ArrowUp: -120, PageDown: 420, PageUp: -420, " ": event.shiftKey ? -300 : 300, Home: -2000, End: 2000 }[event.key];
    if (delta !== undefined) advance(delta, event);
  });
  hint?.addEventListener("click", (event) => { event.preventDefault(); seek(1); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
    else seek(target);
  });
  prefersReducedMotion.addEventListener("change", () => seek(target));
  window.addEventListener("pageshow", () => { paint(); seek(target); });
  paint();
};

const initHomeHeroPointer = () => {
  if (!homeHero) return;
  const portrait = homeHero.querySelector(".home-hero__portrait");
  const canvas = homeHero.querySelector(".home-hero__field");
  const overlay = homeHero.querySelector(".home-hero__mask");
  const context = canvas.getContext("2d");
  const maskContext = overlay.getContext("2d");
  if (!context || !maskContext) return;
  const reduced = prefersReducedMotion;
  const name = homeHero.querySelector(".home-hero__name");

  // Underwater room: a tiled box receding to one vanishing point, lit by real surface caustics.
  // Everything is computed at half resolution, then scaled onto the canvas.
  const CELL = 2;
  const ROOM_DEPTH = 6;
  const TILE = 0.32;
  // travelling surface waves: direction, wavenumber, angular speed, amplitude
  const WAVES = [
    { dx: 0.92, dz: 0.39, k: 5.2, w: 0.9, a: 1 },
    { dx: -0.58, dz: 0.81, k: 7.4, w: 1.15, a: 0.72 },
    { dx: 0.21, dz: -0.98, k: 9.6, w: 1.4, a: 0.5 },
    { dx: -0.86, dz: -0.51, k: 12.8, w: 1.7, a: 0.34 }
  ];
  // per-wave focusing strength, tuned so the Jacobian regularly reaches zero (bright lines)
  const FOCUS = 0.34;
  // Hessian of a cos wave scales with k^2; normalised to the longest wave
  WAVES.forEach((wave) => { wave.s = wave.a * FOCUS * (wave.k / WAVES[0].k) ** 2; });
  // light from top-left: surface ids 0 floor, 1 left wall, 2 right wall, 3 back wall, 4 surface
  const SURFACE_LIGHT = [0.95, 0.55, 0.85, 0.6, 0.5];
  const CAUSTIC_WEIGHT = [1, 0.5, 0.8, 0.45, 0];

  const room = document.createElement("canvas");
  const roomContext = room.getContext("2d");
  const light = document.createElement("canvas");
  const lightContext = light.getContext("2d");
  let roomImage = null, lightImage = null;
  // geometry caches, rebuilt only on resize
  let surfaceId = null, baseColor = null, fog = null, causticMix = null, phase = null;
  let values = null;
  let width = 0, height = 0, portraitWidth = 0, portraitHeight = 0;
  let imageX = 0, imageY = 0, imageWidth = 0, imageHeight = 0;
  let portraitLeft = 0, portraitTop = 0, nameLight = 0, glowX = 0, glowY = 0;
  let frame = null, lastDraw = 0, visible = true, ready = false;
  // cursor ripples on the surface, using the shared ripple simulation
  const RIPPLE_CELL = 4;
  const RIPPLE_DAMPING = 0.988;
  const RIPPLE_GAIN = 4.5;
  const RIPPLE_RADIUS = 6;
  // cursor ripples also add light directly where they focus, so the wake reads as a light trail
  const RIPPLE_LIGHT = 0.9;
  let ripplePrev = null, rippleCurr = null, rippleCols = 0, rippleRows = 0;
  let rippleCells = { x0: 1, y0: 1, x1: 1, y1: 1 }, lastPointer = null;
  const photo = document.createElement("canvas");
  const photoContext = photo.getContext("2d");
  const glowLayer = document.createElement("canvas");
  const glowContext = glowLayer.getContext("2d");
  const nameSpots = [0, 1, 2].map(() => ({ x: 0, y: 0, a: 0 }));

  const particles = Array.from({ length: 22 }, () => ({
    x: Math.random(), y: Math.random(), size: 0.6 + Math.random() * 1.3,
    speed: 0.004 + Math.random() * 0.01, seed: Math.random() * 10
  }));

  const buildRoom = () => {
    const cols = room.width, rows = room.height;
    const count = cols * rows;
    surfaceId = new Uint8Array(count);
    baseColor = new Float32Array(count * 3);
    fog = new Float32Array(count);
    causticMix = new Float32Array(count);
    phase = new Float32Array(count * WAVES.length);
    values = new Float32Array(count);
    const aspect = cols / rows;
    const cx = cols / 2, cy = rows / 2, focal = rows / 2;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x;
        const rx = (x + 0.5 - cx) / focal;
        const ry = (y + 0.5 - cy) / focal;
        // nearest hit of the view ray (rx, ry, 1) with the room box
        let t = ROOM_DEPTH, id = 3;
        if (ry > 0 && 1 / ry < t) { t = 1 / ry; id = 0; }
        if (ry < 0 && -1 / ry < t) { t = -1 / ry; id = 4; }
        if (rx < 0 && -aspect / rx < t) { t = -aspect / rx; id = 1; }
        if (rx > 0 && aspect / rx < t) { t = aspect / rx; id = 2; }
        const px = rx * t, py = ry * t, pz = t;
        // surface-plane coordinates for tiles and caustics
        let u, v;
        if (id === 0 || id === 4) { u = px; v = pz; }
        else if (id === 3) { u = px; v = py; }
        else { u = pz; v = py; }

        const tu = u / TILE - Math.floor(u / TILE);
        const tv = v / TILE - Math.floor(v / TILE);
        // grout is a fixed world width, so it narrows with distance; soften it far away
        const groutWidth = 0.05;
        const grout = (tu < groutWidth || tv < groutWidth) && id !== 4 ? 1 - Math.min(1, (pz - 1) / 4) * 0.6 : 0;
        const shade = SURFACE_LIGHT[id] * (id === 0 ? 1 - Math.max(0, -px / aspect) * 0.2 : 1) *
          (id === 1 || id === 2 ? 0.85 + (1 - (py + 1) / 2) * 0.15 : 1);
        const tile = id === 4 ? [26, 70, 84] : [44, 112, 124];
        const g = 1 - grout * 0.45;

        baseColor[i * 3] = tile[0] * shade * g;
        baseColor[i * 3 + 1] = tile[1] * shade * g;
        baseColor[i * 3 + 2] = tile[2] * shade * g;
        // water haze: farther is darker and bluer, nearly black at the back
        fog[i] = Math.exp(-(pz - 1) * 0.55);
        // caustics rise up the walls from the floor, fading with height and depth
        const rise = id === 1 || id === 2 || id === 3 ? Math.max(0, (py + 1) / 2) : 1;
        causticMix[i] = CAUSTIC_WEIGHT[id] * rise;
        surfaceId[i] = id;

        // caustics are always sampled in floor-plane coordinates of the light's landing point
        const sx = id === 0 || id === 4 ? px : px + (1 - py) * 0.25;
        const sz = pz + (id === 0 ? 0 : (1 - py) * 0.25);
        for (let k = 0; k < WAVES.length; k += 1) {
          const wave = WAVES[k];
          phase[i * WAVES.length + k] = (wave.dx * sx + wave.dz * sz) * wave.k;
        }
      }
    }
  };

  const resize = () => {
    if (!portrait.naturalWidth) return;
    width = homeHero.clientWidth;
    height = homeHero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    portraitWidth = portrait.clientWidth;
    portraitHeight = portrait.clientHeight;
    overlay.width = Math.round(portraitWidth * dpr);
    overlay.height = Math.round(portraitHeight * dpr);
    maskContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(portrait);
    // match the CSS object-fit/position so the canvas copy lines up with the <img> crop
    const cover = style.objectFit === "cover";
    const scale = cover
      ? Math.max(portraitWidth / portrait.naturalWidth, portraitHeight / portrait.naturalHeight)
      : Math.min(portraitWidth / portrait.naturalWidth, portraitHeight / portrait.naturalHeight);
    imageWidth = portrait.naturalWidth * scale;
    imageHeight = portrait.naturalHeight * scale;
    const position = (style.objectPosition || "").split(/\s+/);
    const share = (token, fallback) => {
      if (!token) return fallback;
      if (token.endsWith("%")) return parseFloat(token) / 100;
      if (/^(left|top)$/.test(token)) return 0;
      if (/^(right|bottom)$/.test(token)) return 1;
      if (token === "center") return 0.5;
      return fallback;
    };
    imageX = (portraitWidth - imageWidth) * share(position[0], 0.5);
    imageY = (portraitHeight - imageHeight) * share(position[1], /bottom|100%/.test(style.objectPosition) ? 1 : 0.5);
    room.width = light.width = Math.max(2, Math.ceil(width / CELL));
    room.height = light.height = Math.max(2, Math.ceil(height / CELL));
    roomImage = roomContext.createImageData(room.width, room.height);
    lightImage = lightContext.createImageData(light.width, light.height);
    buildRoom();
    rippleCols = Math.max(4, Math.ceil(width / RIPPLE_CELL) + 1);
    rippleRows = Math.max(4, Math.ceil(height / RIPPLE_CELL) + 1);
    ripplePrev = new Float32Array(rippleCols * rippleRows);
    rippleCurr = new Float32Array(rippleCols * rippleRows);
    rippleCells = { x0: 1, y0: 1, x1: rippleCols - 2, y1: rippleRows - 2 };
    photo.width = glowLayer.width = overlay.width;
    photo.height = glowLayer.height = overlay.height;
    photoContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    glowContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    portraitLeft = portrait.offsetLeft;
    portraitTop = portrait.offsetTop;
    ready = true;
    draw(reduced.matches ? 0 : performance.now());
    wake();
  };

  // Caustics from light focusing through the moving surface: intensity ~ 1 / det(I + s * Hessian(h)).
  const drawRoom = (t) => {
    const out = roomImage.data, glow = lightImage.data;
    const n = WAVES.length;
    const offsets = WAVES.map((wave) => wave.w * t);
    const cols = room.width, rows = room.height;
    const rc = rippleCols, rp = ripplePrev;
    for (let y = 0, i = 0; y < rows; y += 1) {
      // cursor ripples live in hero space; same surface, added to the wave curvature
      const ry = Math.min(rippleRows - 2, Math.max(1, ((y * CELL) / RIPPLE_CELL) | 0));
      for (let x = 0; x < cols; x += 1, i += 1) {
        let hxx = 0, hzz = 0, hxz = 0, slope = 0;
        for (let k = 0; k < n; k += 1) {
          const wave = WAVES[k];
          const c = Math.cos(phase[i * n + k] - offsets[k]) * wave.s;
          hxx -= c * wave.dx * wave.dx;
          hzz -= c * wave.dz * wave.dz;
          hxz -= c * wave.dx * wave.dz;
          slope += c;
        }
        const rx = Math.min(rippleCols - 2, Math.max(1, ((x * CELL) / RIPPLE_CELL) | 0));
        const j = ry * rc + rx;
        const centre = rp[j];
        hxx += (rp[j - 1] + rp[j + 1] - 2 * centre) * RIPPLE_GAIN;
        hzz += (rp[j - rc] + rp[j + rc] - 2 * centre) * RIPPLE_GAIN;
        hxz += (rp[j + rc + 1] - rp[j + rc - 1] - rp[j - rc + 1] + rp[j - rc - 1]) * 0.25 * RIPPLE_GAIN;
        slope -= centre * 0.4;

        const det = (1 + hxx) * (1 + hzz) - hxz * hxz;
        const focus = 1 / (Math.abs(det) + 0.12);
        let caustic = Math.max(0, (focus - 1.4) * 0.16);
        caustic = Math.min(1, caustic * caustic) * causticMix[i];
        // converging ripple crests (negative curvature) add their own light, even on dimly lit surfaces
        const rippleFocus = -(rp[j - 1] + rp[j + 1] + rp[j - rc] + rp[j + rc] - 4 * centre);
        caustic = Math.min(1, caustic + Math.max(0, rippleFocus) * RIPPLE_LIGHT * (0.4 + 0.6 * causticMix[i]));

        const id = surfaceId[i], f = fog[i];
        // the surface overhead shimmers with the wave slope instead of catching caustics
        const sheen = id === 4 ? Math.max(0, slope) * 0.6 : 0;

        const lit = caustic * f;
        const r = baseColor[i * 3] * f + lit * 150 + sheen * 30;
        const g = baseColor[i * 3 + 1] * f + lit * 230 + sheen * 70;
        const b = baseColor[i * 3 + 2] * f + lit * 220 + sheen * 80;
        // fog colour: deep blue fading toward black
        const haze = 1 - f;
        const k4 = i * 4;
        out[k4] = r + haze * 2;
        out[k4 + 1] = g + haze * 10;
        out[k4 + 2] = b + haze * 22;
        out[k4 + 3] = 255;
        glow[k4] = 150;
        glow[k4 + 1] = 230;
        glow[k4 + 2] = 225;
        glow[k4 + 3] = Math.min(255, (lit + sheen * 0.3) * 255);
        values[i] = lit;
      }
    }
    roomContext.putImageData(roomImage, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(room, 0, 0, room.width * CELL, room.height * CELL);
  };

  // Light shafts dropping from the surface, swaying with the waves.
  const shafts = [
    { x: 0.18, width: 0.07, alpha: 0.07, sway: 0.9 },
    { x: 0.34, width: 0.12, alpha: 0.05, sway: 1.3 },
    { x: 0.63, width: 0.05, alpha: 0.08, sway: 0.7 },
    { x: 0.82, width: 0.1, alpha: 0.05, sway: 1.1 }
  ];

  // Ripple height under a hero-space point, so shafts bend with the same surface.
  const rippleAt = (x, y) => {
    if (!ripplePrev) return 0;
    const rx = Math.min(rippleCols - 1, Math.max(0, (x / RIPPLE_CELL) | 0));
    const ry = Math.min(rippleRows - 1, Math.max(0, (y / RIPPLE_CELL) | 0));
    return ripplePrev[ry * rippleCols + rx];
  };

  // Drawn into the hero canvas and, scaled down, into the light buffer that lights the portrait and name.
  const drawShafts = (target, t, scale) => {
    target.save();
    target.globalCompositeOperation = target === context ? "screen" : "lighter";
    for (const shaft of shafts) {
      const surface = rippleAt(shaft.x * width, height * 0.08);
      const top = shaft.x * width + Math.sin(t * 0.4 * shaft.sway + shaft.x * 7) * width * 0.02 - surface * 40;
      const lean = width * (0.08 + Math.sin(t * 0.3 + shaft.x * 5) * 0.03) - surface * 120;
      const half = shaft.width * width * 0.5;
      const pulse = Math.min(0.2, shaft.alpha * (0.75 + 0.25 * Math.sin(t * 0.8 + shaft.x * 11)) * (1 + Math.abs(surface) * 2));
      const beam = target.createLinearGradient(0, 0, 0, height * 0.9 * scale);
      beam.addColorStop(0, "rgba(140, 220, 225, " + pulse + ")");
      beam.addColorStop(1, "rgba(140, 220, 225, 0)");
      target.fillStyle = beam;
      target.beginPath();
      target.moveTo((top - half) * scale, 0);
      target.lineTo((top + half) * scale, 0);
      target.lineTo((top + half * 1.8 + lean) * scale, height * 0.9 * scale);
      target.lineTo((top - half * 1.8 + lean) * scale, height * 0.9 * scale);
      target.closePath();
      target.fill();
    }
    target.restore();
  };

  // A few fine particles drifting with the current.
  const drawParticles = (t) => {
    context.save();
    for (const particle of particles) {
      const x = ((particle.x + t * particle.speed + Math.sin(t * 0.3 + particle.seed) * 0.01) % 1 + 1) % 1;
      const y = ((particle.y - t * particle.speed * 0.4 + Math.cos(t * 0.25 + particle.seed) * 0.01) % 1 + 1) % 1;
      context.fillStyle = "rgba(190, 235, 235, " + (0.18 + 0.12 * Math.sin(t + particle.seed)) + ")";
      context.beginPath();
      context.arc(x * width, y * height, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };

  // Darker centre behind the portrait and name so the text stays readable.
  const drawReadability = () => {
    const shade = context.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, Math.max(width, height) * 0.55);
    shade.addColorStop(0, "rgba(3, 8, 12, 0.62)");
    shade.addColorStop(0.55, "rgba(3, 8, 12, 0.34)");
    shade.addColorStop(1, "rgba(3, 8, 12, 0.08)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
  };

  // The portrait rests dim and only lights up where caustics or shafts cross it, pixel by pixel.
  const PORTRAIT_REST = 0.5;
  const drawPortrait = (t) => {
    photoContext.clearRect(0, 0, portraitWidth, portraitHeight);
    // a thin ripple band drifts down the portrait, shifting slices by a pixel or so
    const band = ((t * 0.06) % 1.6 - 0.3) * portraitHeight;
    const slice = 3;
    for (let y = 0; y < portraitHeight; y += slice) {
      const distance = (y - band) / (portraitHeight * 0.12);
      const envelope = Math.exp(-distance * distance);
      const wobble = (poolValueNoise(y * 0.035, t * 0.5) - 0.5) * 2;
      const shift = reduced.matches ? 0 : envelope * wobble * 1.4;
      const sourceY = ((y - imageY) / imageHeight) * portrait.naturalHeight;
      const sourceHeight = (slice / imageHeight) * portrait.naturalHeight;
      if (sourceY + sourceHeight <= 0 || sourceY >= portrait.naturalHeight) continue;
      photoContext.drawImage(portrait, 0, sourceY, portrait.naturalWidth, sourceHeight,
        imageX + shift, y, imageWidth, slice);
    }

    // resting state: the photo darkened, still recognisable
    maskContext.clearRect(0, 0, portraitWidth, portraitHeight);
    maskContext.drawImage(photo, 0, 0, portraitWidth, portraitHeight);
    maskContext.save();
    maskContext.globalCompositeOperation = "source-atop";
    maskContext.fillStyle = "rgba(2, 8, 12, " + PORTRAIT_REST + ")";
    maskContext.fillRect(0, 0, portraitWidth, portraitHeight);
    maskContext.restore();

    // lit pass: the light buffer's alpha selects which pixels of the full-brightness photo show through
    glowContext.clearRect(0, 0, portraitWidth, portraitHeight);
    glowContext.save();
    glowContext.imageSmoothingEnabled = true;
    glowContext.drawImage(light, -portraitLeft, -portraitTop, light.width * CELL, light.height * CELL);
    glowContext.globalCompositeOperation = "source-in";
    glowContext.drawImage(photo, 0, 0, portraitWidth, portraitHeight);
    glowContext.restore();
    maskContext.save();
    maskContext.globalCompositeOperation = "lighter";
    maskContext.drawImage(glowLayer, 0, 0, portraitWidth, portraitHeight);
    // a faint teal tint where the light lands
    maskContext.globalCompositeOperation = "source-atop";
    maskContext.globalAlpha = 0.25;
    maskContext.drawImage(light, -portraitLeft, -portraitTop, light.width * CELL, light.height * CELL);
    maskContext.restore();
  };

  // The name rests dim; up to three highlights sit where the light currently crosses the letters.
  const lightName = () => {
    if (!name || !values) return;
    const left = name.offsetLeft, top = name.offsetTop;
    const boxWidth = name.offsetWidth, boxHeight = name.offsetHeight;
    // read back the light buffer (caustics + shafts) over the name only
    const bx = Math.max(0, Math.floor(left / CELL) - 4), by = Math.max(0, Math.floor(top / CELL) - 4);
    const bw = Math.max(1, Math.min(light.width - bx, Math.ceil(boxWidth / CELL) + 8));
    const bh = Math.max(1, Math.min(light.height - by, Math.ceil(boxHeight / CELL) + 8));
    const lightData = lightContext.getImageData(bx, by, bw, bh).data;
    const samples = [];
    for (let gy = 0; gy < 6; gy += 1) {
      for (let gx = 0; gx < 24; gx += 1) {
        const x = left + ((gx + 0.5) / 24) * boxWidth;
        const y = top + ((gy + 0.5) / 6) * boxHeight;
        const cx = Math.min(bw - 1, Math.max(0, ((x / CELL) | 0) - bx));
        const cy = Math.min(bh - 1, Math.max(0, ((y / CELL) | 0) - by));
        // a small neighbourhood so thin strands still register
        let local = 0;
        for (let oy = -3; oy <= 3; oy += 1) {
          for (let ox = -3; ox <= 3; ox += 1) {
            const sx = Math.min(bw - 1, Math.max(0, cx + ox));
            const sy = Math.min(bh - 1, Math.max(0, cy + oy));
            local += lightData[(sy * bw + sx) * 4 + 3];
          }
        }
        samples.push({ x: x - left, y: y - top, v: local / (49 * 255) });
      }
    }
    samples.sort((a, b) => b.v - a.v);
    const picked = [];
    const spacing = boxWidth / 6;
    for (const sample of samples) {
      if (picked.length === nameSpots.length) break;
      if (picked.every((p) => Math.hypot(p.x - sample.x, p.y - sample.y) > spacing)) picked.push(sample);
    }
    nameSpots.forEach((spot, index) => {
      const target = picked[index] || { x: spot.x, y: spot.y, v: 0 };
      // ease toward the light so the highlight sweeps across letters instead of jumping
      spot.x += (target.x - spot.x) * 0.18;
      spot.y += (target.y - spot.y) * 0.18;
      spot.a += (Math.min(1, target.v * 4) - spot.a) * 0.2;
      name.style.setProperty("--glow-x" + (index + 1), spot.x.toFixed(1) + "px");
      name.style.setProperty("--glow-y" + (index + 1), spot.y.toFixed(1) + "px");
      name.style.setProperty("--glow-a" + (index + 1), spot.a.toFixed(3));
    });
  };

  function draw(now) {
    const t = now / 1000;
    if (!reduced.matches) {
      rippleStep(ripplePrev, rippleCurr, rippleCols, rippleCells, RIPPLE_DAMPING);
      const swap = ripplePrev;
      ripplePrev = rippleCurr;
      rippleCurr = swap;
    }
    context.clearRect(0, 0, width, height);
    drawRoom(t * 0.6);
    lightContext.putImageData(lightImage, 0, 0);
    drawParticles(t);
    drawReadability();
    drawPortrait(t);
  }

  // Cursor movement disturbs the same surface, via the shared ripple trail.
  const dropAt = (x, y, strength) => {
    rippleDrop(ripplePrev, rippleCols, rippleCells, (x / RIPPLE_CELL) | 0, (y / RIPPLE_CELL) | 0, strength, RIPPLE_RADIUS);
  };
  // client px -> hero px (same space as the canvas CSS box); dropAt then divides by RIPPLE_CELL for grid cells
  const disturb = (clientX, clientY, strength) => {
    if (!ready || !ripplePrev || reduced.matches) return;
    const rect = homeHero.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      lastPointer = null;
      return;
    }
    lastPointer = rippleTrail(lastPointer, x, y, performance.now(), strength, RIPPLE_CELL * 2, dropAt);
    wake();
  };
  // listeners sit on the hero section itself; the canvases are pointer-events: none
  homeHero.addEventListener("mousemove", (event) => disturb(event.clientX, event.clientY, 7));
  homeHero.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (touch) disturb(touch.clientX, touch.clientY, 8);
  }, { passive: true });
  homeHero.addEventListener("mouseleave", () => { lastPointer = null; });
  homeHero.addEventListener("touchend", () => { lastPointer = null; });

  const tick = (now) => {
    frame = null;
    if (!ready || !visible || document.hidden || reduced.matches) return;
    // ~30fps keeps the half-res caustics smooth without burning the main thread
    if (now - lastDraw > 33) {
      lastDraw = now;
      draw(now);
    }
    frame = requestAnimationFrame(tick);
  };

  function wake() {
    if (frame === null && ready && visible && !document.hidden && !reduced.matches) {
      frame = requestAnimationFrame(tick);
    }
  }
  const pause = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
  homeHero.addEventListener("dive:progress", () => {
    if (ready && reduced.matches) draw(0); else wake();
  });
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : wake());
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake(); else pause();
    }, { threshold: 0 }).observe(homeHero);
  }
  reduced.addEventListener("change", () => {
    if (!ready) return;
    if (reduced.matches) {
      pause();
      draw(0);
    } else {
      wake();
    }
  });
  window.addEventListener("resize", resize, { passive: true });
  portrait.addEventListener("load", resize);
  resize();
};

const initHomeWorkPreview = () => {
  const section = document.querySelector(".selected-work, .work-index");
  if (!section) return;
  const list = section.querySelector(".home-work-list, .work-index__list");
  const rows = [...list.querySelectorAll(".home-work-row, .work-row")];
  const preview = section.querySelector(".home-work-preview, .work-preview");
  const images = [...preview.querySelectorAll("img")];
  const reduced = prefersReducedMotion.matches;
  let activeRow = null;
  let activeLayer = 0;
  let targetX = window.innerWidth * 0.64;
  let targetY = window.innerHeight * 0.52;
  let currentX = targetX;
  let currentY = targetY;
  let previewFrame = null;
  preview.style.left = `${currentX}px`;
  preview.style.top = `${currentY}px`;

  const positionPreview = () => {
    previewFrame = null;
    currentX += (targetX - currentX) * 0.11;
    currentY += (targetY - currentY) * 0.11;
    preview.style.left = `${currentX}px`;
    preview.style.top = `${currentY}px`;
    if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
      previewFrame = requestAnimationFrame(positionPreview);
    }
  };

  const requestPosition = () => {
    if (reduced) {
      currentX = targetX;
      currentY = targetY;
      preview.style.left = `${currentX}px`;
      preview.style.top = `${currentY}px`;
    } else if (previewFrame === null) {
      previewFrame = requestAnimationFrame(positionPreview);
    }
  };

  const hidePreview = () => {
    if (activeRow) activeRow.classList.remove("is-active");
    activeRow = null;
    list.classList.remove("has-active");
    preview.classList.remove("is-visible");
    if (previewFrame !== null) cancelAnimationFrame(previewFrame);
    previewFrame = null;
  };

  const activateRow = (row) => {
    if (activeRow === row) {
      if (images[activeLayer].naturalWidth) preview.classList.add("is-visible");
      return;
    }
    if (activeRow) activeRow.classList.remove("is-active");
    activeRow = row;
    activeRow.classList.add("is-active");
    list.classList.add("has-active");
    const nextLayer = 1 - activeLayer;
    const nextImage = images[nextLayer];
    const revealNext = () => {
      if (activeRow !== row) return;
      if (!nextImage.naturalWidth) {
        hidePreview();
        return;
      }
      preview.querySelector(".home-work-preview__media, .work-preview__media").style.aspectRatio =
        `${nextImage.naturalWidth} / ${nextImage.naturalHeight}`;
      nextImage.classList.add("is-active");
      images[activeLayer].classList.remove("is-active");
      activeLayer = nextLayer;
      preview.classList.add("is-visible");
    };
    nextImage.onerror = hidePreview;
    nextImage.onload = revealNext;
    nextImage.src = row.dataset.image;
    nextImage.alt = row.dataset.alt;
    if (nextImage.complete) revealNext();
  };

  list.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const row = event.target.closest(".home-work-row, .work-row");
    if (!row) return;
    activateRow(row);
    const halfWidth = preview.offsetWidth / 2 + 28;
    const halfHeight = preview.offsetHeight / 2 + 28;
    targetX = Math.max(halfWidth, Math.min(window.innerWidth - halfWidth, event.clientX + 56));
    targetY = Math.max(halfHeight, Math.min(window.innerHeight - halfHeight, event.clientY - 52));
    requestPosition();
  });
  list.addEventListener("pointerleave", hidePreview);
  window.addEventListener("scroll", hidePreview, { passive: true });
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) hidePreview();
  }, { threshold: 0.02 }).observe(section);
};

const initEditorialHeroEffect = () => {
  const canvas = document.querySelector(".editorial-hero-effect[data-hero-effect]");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const mode = canvas.dataset.heroEffect;
  const reduced = prefersReducedMotion.matches;
  const palette = [[242, 240, 234], [145, 154, 160], [73, 157, 177], [72, 108, 164], [184, 207, 98]];
  let w = 0, h = 0, frame = null, previous = 0, time = 0, visible = true;
  let x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, pointerId = null, lastInput = -Infinity, coast = 0;

  const resize = () => {
    w = hero.clientWidth; h = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!x && !y) { x = tx = w * 0.52; y = ty = h * 0.48; }
    wake();
  };
  const color = (index, alpha) => {
    const c = palette[index % palette.length];
    return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  };
  const pull = (px, py, radius, strength) => {
    const dx = x - px, dy = y - py, distance = Math.hypot(dx, dy);
    const amount = distance < radius ? (1 - distance / radius) ** 2 * strength : 0;
    return [dx * amount, dy * amount];
  };
  const finishLine = (index, alpha, lineWidth = 0.75) => {
    ctx.strokeStyle = color(index, alpha); ctx.lineWidth = lineWidth; ctx.stroke();
  };
  const drawMotionSegment = (points, progress, mobile) => {
    const head = Math.max(1, Math.min(points.length - 1, Math.floor(progress * points.length)));
    const length = mobile ? 4 : 7;
    const segment = points.slice(Math.max(0, head - length), head + 1);
    if (segment.length < 2) return;
    const strength = { work: 1, experience: 0.82, about: 0.58, contact: 0.78 }[mode];
    const tail = segment[0], front = segment[segment.length - 1];
    const path = () => {
      ctx.beginPath();
      segment.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
    };
    const gradient = (tailColor, frontColor) => {
      const value = ctx.createLinearGradient(tail[0], tail[1], front[0], front[1]);
      value.addColorStop(0, tailColor); value.addColorStop(0.52, frontColor); value.addColorStop(1, frontColor); return value;
    };
    ctx.save();
    path();
    ctx.strokeStyle = gradient("rgba(45,125,180,0)", `rgba(45,125,180,${0.17 * strength})`);
    ctx.lineWidth = mobile ? 6 : 8;
    ctx.shadowColor = `rgba(45,125,180,${0.18 * strength})`;
    ctx.shadowBlur = mobile ? 10 : 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    path();
    ctx.strokeStyle = gradient("rgba(70,165,205,0)", `rgba(70,165,205,${0.36 * strength})`);
    ctx.lineWidth = mobile ? 2.3 : 3;
    ctx.stroke();
    path();
    ctx.strokeStyle = gradient("rgba(185,225,240,0.08)", `rgba(185,225,240,${0.82 * strength})`);
    ctx.lineWidth = mobile ? 0.75 : 1;
    ctx.stroke();
    ctx.restore();
  };

  const drawWork = (mobile) => {
    const lines = mobile ? 11 : 20, samples = mobile ? 28 : 46;
    for (let line = 0; line < lines; line += 1) {
      const points = [];
      ctx.beginPath();
      for (let point = 0; point <= samples; point += 1) {
        const t = point / samples;
        let px = w * (-0.12 + t * 1.24);
        let py = h * (0.08 + line / (lines - 1) * 0.84) + Math.sin(t * 5.2 + line * 0.62 + time * (0.08 + line % 4 * 0.02)) * h * 0.045;
        py += (t - 0.5) * h * (line % 2 ? 0.16 : -0.1);
        const bend = pull(px, py, mobile ? 150 : 250, pointerId === null ? 0.12 : 0.24);
        px += bend[0] * 0.2; py += bend[1] * 0.38;
        points.push([px, py]); point ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      finishLine(line % 9 === 0 ? 4 : line + 1, 0.04 + line % 5 * 0.012, line % 5 ? 0.7 : 1.1);
      if (line % 5 === 1) drawMotionSegment(points, (time * 0.045 + line * 0.13) % 1, mobile);
    }
    const gx = w * (0.2 + (time * 0.018 % 0.65)), gy = h * 0.52;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, mobile ? 150 : 280);
    glow.addColorStop(0, "rgba(72,157,177,0.065)"); glow.addColorStop(1, "rgba(5,5,5,0)");
    ctx.save(); ctx.scale(1.7, 0.6); ctx.fillStyle = glow; ctx.fillRect(0, 0, w / 1.7, h / 0.6); ctx.restore();
  };

  const drawExperience = (mobile) => {
    const groups = mobile ? [4, 4, 3] : [7, 7, 6];
    groups.forEach((count, group) => {
      const speed = [0.05, 0.09, 0.14][group], scale = [0.11, 0.075, 0.045][group];
      for (let line = 0; line < count; line += 1) {
        const points = [];
        ctx.beginPath();
        for (let point = 0; point <= 38; point += 1) {
          const t = point / 38;
          let px = w * (-0.1 + t * 1.2) + Math.cos(t * 5 + line + time * speed) * w * scale * 0.18;
          let py = h * (0.16 + (line + 0.5) / count * 0.68) + Math.sin(t * (3.8 + group) + line * 0.8 + time * speed) * h * scale;
          const bend = pull(px, py, mobile ? 145 : 240, [0.08, 0.13, 0.2][group] * (pointerId === null ? 0.75 : 1.35));
          px += bend[0]; py += bend[1]; points.push([px, py]); point ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        finishLine(group === 2 ? 4 : line + group * 2, 0.045 + group * 0.018, 1.05 - group * 0.2);
        if (line === group) drawMotionSegment(points, (time * (0.032 + group * 0.012) + group * 0.24) % 1, mobile);
      }
    });
  };

  const drawAbout = (mobile) => {
    const lines = mobile ? 8 : 13, cx = w * (0.5 + Math.sin(time * 0.025) * 0.025), cy = h * (0.5 + Math.cos(time * 0.021) * 0.035);
    for (let line = 0; line < lines; line += 1) {
      const points = [];
      ctx.beginPath();
      for (let point = 0; point <= 50; point += 1) {
        const angle = -2.8 + line * 0.13 + point / 50 * (4.3 + line % 3 * 0.25) + time * (0.006 + line * 0.00025);
        let px = cx + Math.cos(angle) * w * (0.22 + line * 0.038);
        let py = cy + Math.sin(angle) * h * (0.16 + line * 0.027);
        const bend = pull(px, py, mobile ? 155 : 270, pointerId === null ? 0.05 : 0.1);
        px += bend[0]; py += bend[1]; points.push([px, py]); point ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      finishLine(line % 4 ? line : 2, 0.035 + line % 4 * 0.012, line % 4 ? 0.65 : 1);
      if (line % 4 === 2) drawMotionSegment(points, (time * 0.018 + line * 0.09) % 1, mobile);
    }
    [[0.32, 0.42, 2], [0.72, 0.58, 3]].forEach(([px, py, c], index) => {
      const gx = w * px + Math.sin(time * (0.018 + index * 0.006)) * w * 0.06;
      const gy = h * py + Math.cos(time * (0.016 + index * 0.005)) * h * 0.05;
      const radius = mobile ? 140 : 250, glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      glow.addColorStop(0, color(c, mobile ? 0.03 : 0.045)); glow.addColorStop(1, color(c, 0));
      ctx.fillStyle = glow; ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
    });
  };

  const drawContact = (mobile) => {
    const lines = mobile ? 10 : 17, samples = 50;
    for (let line = 0; line < lines; line += 1) {
      const points = []; ctx.beginPath();
      for (let point = 0; point <= samples; point += 1) {
        const t = point / samples, lane = (line + 0.5) / lines;
        let px = w * (-0.06 + t * 1.12);
        let py = h * (lane + Math.sin(t * 5.2 + line * 0.57 + time * 0.045) * 0.055) + Math.sin(t * Math.PI) * h * (0.5 - lane) * 0.35;
        const bend = pull(px, py, mobile ? 150 : 250, pointerId === null ? 0.1 : 0.22);
        px += bend[0] * 0.7; py += bend[1] * 0.7; points.push([px, py]);
        point ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      finishLine(line % 5 ? line : 2, 0.04 + line % 4 * 0.012, line % 5 ? 0.65 : 1);
      if (line % 6 === 1) {
        drawMotionSegment(points, (time * 0.035 + line * 0.11) % 1, mobile);
      }
    }
  };

  const drawComets = (mobile) => {
    const settings = {
      work: { count: mobile ? 3 : 6, duration: 2.8, range: 1.7, alpha: 0.3, length: mobile ? 130 : 220 },
      experience: { count: mobile ? 3 : 5, duration: 3.5, range: 2, alpha: 0.27, length: mobile ? 125 : 210 },
      about: { count: mobile ? 2 : 4, duration: 5, range: 2, alpha: 0.2, length: mobile ? 120 : 190 },
      contact: { count: mobile ? 3 : 5, duration: 3.8, range: 2, alpha: 0.26, length: mobile ? 125 : 205 }
    }[mode];
    const bezierPoint = (points, t) => {
      const inverse = 1 - t;
      return [inverse ** 3 * points[0][0] + 3 * inverse ** 2 * t * points[1][0] + 3 * inverse * t ** 2 * points[2][0] + t ** 3 * points[3][0],
        inverse ** 3 * points[0][1] + 3 * inverse ** 2 * t * points[1][1] + 3 * inverse * t ** 2 * points[2][1] + t ** 3 * points[3][1]];
    };
    for (let trail = 0; trail < settings.count; trail += 1) {
      const seed = (trail * 0.61803398875) % 1;
      const duration = settings.duration + seed * settings.range;
      const delay = 0.4 + ((trail * 0.47) % 1) * 1.4;
      const cycle = duration + delay;
      const localTime = (time + trail * 1.73) % cycle;
      if (localTime > duration) continue;
      const progress = localTime / duration;
      const fade = Math.min(1, progress / 0.12, (1 - progress) / 0.12);
      const lane = 0.14 + ((trail * 0.23 + seed * 0.17) % 0.7);
      let points;
      if (mode === "work") points = [[-0.18, lane + 0.12], [0.22, lane - 0.16], [0.72, lane + 0.12], [1.18, lane - 0.08]];
      else if (mode === "experience") points = trail % 2 ? [[1.16, lane - 0.08], [0.76, lane + 0.18], [0.28, lane - 0.16], [-0.16, lane + 0.09]] : [[-0.16, lane + 0.1], [0.22, lane - 0.2], [0.68, lane + 0.2], [1.16, lane - 0.1]];
      else if (mode === "about") points = [[-0.14, lane + 0.2], [0.08, lane - 0.34], [0.9, lane + 0.36], [1.14, lane - 0.18]];
      else points = trail % 2 ? [[1.14, lane - 0.16], [0.78, lane + 0.3], [0.2, lane - 0.28], [-0.14, lane + 0.14]] : [[-0.14, lane + 0.15], [0.18, lane - 0.3], [0.82, lane + 0.3], [1.14, lane - 0.14]];
      points = points.map(([px, py]) => [px * w, py * h]);
      const approximatePath = w * (mode === "about" || mode === "contact" ? 1.42 : 1.28);
      const tailFraction = Math.min(0.28, settings.length * (0.78 + seed * 0.44) / approximatePath);
      const tailStart = Math.max(0, progress - tailFraction);
      const samples = mobile ? 12 : 18, trailPoints = [];
      for (let sample = 0; sample <= samples; sample += 1) {
        const t = tailStart + (progress - tailStart) * sample / samples;
        let [px, py] = bezierPoint(points, t);
        const bend = pull(px, py, mobile ? 120 : 190, pointerId === null ? 0.025 : 0.06);
        px += bend[0]; py += bend[1]; trailPoints.push([px, py]);
      }
      const tail = trailPoints[0], head = trailPoints[trailPoints.length - 1];
      const drawPath = () => {
        ctx.beginPath();
        trailPoints.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
      };
      const gradient = (tailColor, headColor) => {
        const value = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
        value.addColorStop(0, tailColor); value.addColorStop(0.68, tailColor); value.addColorStop(1, headColor); return value;
      };
      ctx.save();
      drawPath(); ctx.strokeStyle = gradient("rgba(22,59,97,0)", `rgba(45,109,159,${settings.alpha * 0.28 * fade})`); ctx.lineWidth = mobile ? 7 : 10; ctx.shadowColor = "rgba(69,175,199,0.18)"; ctx.shadowBlur = 6; ctx.stroke();
      ctx.shadowBlur = 0; drawPath(); ctx.strokeStyle = gradient("rgba(45,109,159,0)", `rgba(69,175,199,${settings.alpha * 0.62 * fade})`); ctx.lineWidth = mobile ? 2.5 : 3.4; ctx.stroke();
      drawPath(); ctx.strokeStyle = gradient("rgba(69,175,199,0)", `rgba(201,231,240,${settings.alpha * fade})`); ctx.lineWidth = mobile ? 0.8 : 1.05; ctx.stroke(); ctx.restore();
      const flareRadius = mobile ? 8 : 12;
      const flare = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], flareRadius);
      flare.addColorStop(0, `rgba(201,231,240,${settings.alpha * fade})`);
      flare.addColorStop(0.2, `rgba(69,175,199,${settings.alpha * 0.36 * fade})`);
      flare.addColorStop(1, "rgba(22,59,97,0)");
      ctx.fillStyle = flare;
      ctx.fillRect(head[0] - flareRadius, head[1] - flareRadius, flareRadius * 2, flareRadius * 2);
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, w, h);
    const mobile = w < 700;
    if (mode === "work") drawWork(mobile);
    else if (mode === "experience") drawExperience(mobile);
    else if (mode === "about") drawAbout(mobile);
    else drawContact(mobile);
    drawComets(mobile);
  };
  const tick = (now) => {
    frame = null;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.04, previous ? (now - previous) / 1000 : 1 / 60); previous = now;
    if (!reduced) time += dt;
    const controlled = pointerId !== null || now - lastInput < 1500;
    if (!controlled && coast <= 0) { tx = w * (0.5 + Math.sin(time * 0.31) * 0.32); ty = h * (0.5 + Math.cos(time * 0.27) * 0.28); }
    const oldX = x, oldY = y;
    if (coast > 0 && pointerId === null && !reduced) {
      x += vx * dt; y += vy * dt; vx *= Math.exp(-4.5 * dt); vy *= Math.exp(-4.5 * dt); coast -= dt;
    } else {
      const lag = mode === "about" ? 2.2 : mode === "experience" ? 3.2 : 4.2;
      const follow = 1 - Math.exp(-(pointerId === null ? lag : lag * 2.2) * dt);
      x += (tx - x) * follow; y += (ty - y) * follow;
      vx += ((x - oldX) / dt - vx) * (1 - Math.exp(-8 * dt)); vy += ((y - oldY) / dt - vy) * (1 - Math.exp(-8 * dt));
    }
    x = Math.max(0, Math.min(w, x)); y = Math.max(0, Math.min(h, y)); render();
    if (!reduced || controlled || coast > 0) frame = requestAnimationFrame(tick);
  };
  function wake() { if (frame === null && visible && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); } }
  const position = (event) => {
    const rect = hero.getBoundingClientRect(); tx = Math.max(0, Math.min(w, event.clientX - rect.left)); ty = Math.max(0, Math.min(h, event.clientY - rect.top));
    lastInput = performance.now(); wake();
  };
  if (!reduced) {
    hero.addEventListener("pointermove", (event) => { if (pointerId === null || pointerId === event.pointerId) position(event); }, { passive: true });
    hero.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || pointerId !== null || event.target.closest("a, button, input, select, textarea")) return;
      pointerId = event.pointerId; coast = 0; position(event); hero.setPointerCapture(event.pointerId);
    });
    const release = (event) => {
      if (event.pointerId !== pointerId) return; pointerId = null; coast = 0.7; lastInput = -Infinity;
      if (hero.hasPointerCapture(event.pointerId)) hero.releasePointerCapture(event.pointerId); wake();
    };
    hero.addEventListener("pointerup", release); hero.addEventListener("pointercancel", release); hero.addEventListener("lostpointercapture", release);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (frame !== null) cancelAnimationFrame(frame); frame = null; } else wake(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; if (visible) wake(); else if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
  }, { threshold: 0 }).observe(hero);
  window.addEventListener("resize", resize, { passive: true }); resize(); render();
};

// Ripple menu: one toggle in the corner opens the nav links.
const initRippleMenu = () => {
  const toggle = document.querySelector(".ripple-menu__toggle");
  const panel = document.getElementById("ripple-menu");
  if (!toggle || !panel) return;

  let open = false;
  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.hidden = false;
      // let the closed state paint before the ripple opens
      window.requestAnimationFrame(() => panel.classList.add("is-open"));
    } else {
      panel.classList.remove("is-open");
      const hide = () => { if (!open) panel.hidden = true; };
      if (prefersReducedMotion.matches) hide();
      else window.setTimeout(hide, 560);
    }
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!open);
  });

  document.addEventListener("click", (event) => {
    if (open && !panel.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      toggle.focus();
    }
  });

  // keyboard: leaving the menu entirely closes it
  panel.addEventListener("focusout", (event) => {
    if (open && !panel.contains(event.relatedTarget) && event.relatedTarget !== toggle) setOpen(false);
  });
};

// Arriving from the index.html dive: surface into the hero instead of popping in.
const initHomeDiveReveal = () => {
  if (!homeHero) return;
  let fromDive = false;
  try {
    fromDive = sessionStorage.getItem("home-dive-reveal") === "1";
    sessionStorage.removeItem("home-dive-reveal");
  } catch (error) {
    // No flag available: show the page directly.
  }
  if (!fromDive || prefersReducedMotion.matches || !document.body.animate) return;

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const layer = (className) => {
    const node = document.createElement("div");
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    // above the nav and hero; never blocks the cursor
    node.style.zIndex = "10001";
    document.body.appendChild(node);
    return node;
  };

  // 1-2. Same layer and --dive-landing colour the index dive ended on, clearing with a slight waver.
  const veil = layer("pool-dive");
  veil.style.opacity = "1";
  veil.animate([
    { opacity: 1, filter: "blur(0px)", transform: "scale(1) translate(0, 0)" },
    { opacity: 0.7, filter: "blur(2px)", transform: "scale(1.02) translate(0.4%, -0.3%)", offset: 0.35 },
    { opacity: 0.25, filter: "blur(4px)", transform: "scale(1.03) translate(-0.4%, 0.3%)", offset: 0.7 },
    { opacity: 0, filter: "blur(6px)", transform: "scale(1.04) translate(0, 0)" }
  ], { duration: 1000, easing: ease, fill: "forwards" });

  // 7. Bubbles keep rising from the dive, in their own layer so they outlast the veil.
  const bubbles = layer("pool-dive pool-dive--bubbles");
  bubbles.style.opacity = "1";
  bubbles.style.background = "transparent";
  for (let k = 0; k < 14; k += 1) {
    const bubble = document.createElement("span");
    bubble.style.left = (Math.random() * 100).toFixed(1) + "%";
    bubble.style.setProperty("--size", (3 + Math.random() * 6).toFixed(1) + "px");
    bubble.style.setProperty("--delay", (Math.random() * 600).toFixed(0) + "ms");
    bubble.style.setProperty("--rise", (900 + Math.random() * 500).toFixed(0) + "ms");
    bubbles.appendChild(bubble);
  }

  // 3. The underwater room comes up first, dim to normal.
  const field = homeHero.querySelector(".home-hero__field");
  field?.animate([{ filter: "brightness(0.2)" }, { filter: "brightness(1)" }],
    { duration: 1000, easing: ease, fill: "backwards" });

  // 4. Portrait out of the dark: brightness, blur and scale together (never opacity).
  const withBase = (element, extra) => {
    const base = getComputedStyle(element).filter;
    return (base && base !== "none" ? base + " " : "") + extra;
  };
  homeHero.querySelectorAll(".home-hero__portrait, .home-hero__mask").forEach((element) => {
    element.animate([
      { filter: withBase(element, "brightness(0.06) blur(12px)"), transform: "scale(1.04)" },
      { filter: withBase(element, "brightness(1) blur(0px)"), transform: "scale(1)" }
    ], { duration: 950, delay: 250, easing: ease, fill: "backwards" });
  });

  // 5. Name follows ~200ms later with the same fade and blur.
  homeHero.querySelector(".home-hero__name")?.animate([
    { opacity: 0, filter: "blur(12px)" },
    { opacity: 1, filter: "blur(0px)" }
  ], { duration: 900, delay: 450, easing: ease, fill: "backwards" });

  // 6. Nav and small text last.
  document.querySelectorAll(".home-nav, .home-hero__hint, .home-hero__scroll")
    .forEach((element, index) => {
      element.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 500, delay: 1050 + index * 40, easing: ease, fill: "backwards" });
    });

  window.setTimeout(() => {
    veil.remove();
    bubbles.remove();
  }, 1700);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
    initPortfolioIntro();
    initHomeScrollDive();
    initHomeHeroPointer();
    initHomeDiveReveal();
    initRippleMenu();
    initEditorialHeroEffect();
    initHomeWorkPreview();
    initRevealAnimations();
  });
} else {
  initPageTransitions();
  initPortfolioIntro();
  initHomeScrollDive();
  initHomeHeroPointer();
  initHomeDiveReveal();
  initRippleMenu();
  initEditorialHeroEffect();
  initHomeWorkPreview();
  initRevealAnimations();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch (error) {
      return;
    }
  });
}

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

// 2D height-field ripple shared by the intro pool and the home hero.
// `cells` bounds the active area; the fixed border reflects waves back.
function rippleDrop(buffer, cols, cells, x, y, strength, radius = 3) {
  const r = radius;
  for (let j = -r; j <= r; j += 1) {
    for (let i = -r; i <= r; i += 1) {
      const nx = x + i;
      const ny = y + j;
      if (nx < cells.x0 || ny < cells.y0 || nx > cells.x1 || ny > cells.y1) continue;
      const falloff = 1 - (Math.sqrt(i * i + j * j) / (r + 1));
      if (falloff > 0) buffer[ny * cols + nx] -= strength * falloff;
    }
  }
}

function rippleStep(prev, curr, cols, cells, damping) {
  for (let y = cells.y0; y <= cells.y1; y += 1) {
    for (let x = cells.x0; x <= cells.x1; x += 1) {
      const i = y * cols + x;
      curr[i] = (((prev[i - 1] + prev[i + 1] + prev[i - cols] + prev[i + cols]) / 2) - curr[i]) * damping;
    }
  }
}

// Ripple along the whole pointer path, stronger the faster it moves. Returns the new last point.
function rippleTrail(last, x, y, now, strength, spacing, dropAt) {
  const from = last && now - last.time < 120 ? last : { x, y };
  const dist = Math.hypot(x - from.x, y - from.y);
  const speed = last ? dist / Math.max(8, now - last.time) : 0;
  const force = strength * Math.min(2.2, 0.35 + speed * 0.9);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  for (let k = 1; k <= steps; k += 1) {
    const s = k / steps;
    dropAt(from.x + (x - from.x) * s, from.y + (y - from.y) * s, force / Math.sqrt(steps));
  }
  return { x, y, time: now };
}

// Value noise and caustic web shared by the intro pool and the home hero.
function poolHash(ix, iy) {
  let n = (ix * 374761393 + iy * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function poolValueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = poolHash(ix, iy);
  const b = poolHash(ix + 1, iy);
  const c = poolHash(ix, iy + 1);
  const d = poolHash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// 4 octaves, each drifting its own way so nothing repeats on a fixed grid.
function poolFbm(x, y, t) {
  return (
    poolValueNoise(x * 0.011 + t * 0.21, y * 0.011 - t * 0.17) * 0.5 +
    poolValueNoise(x * 0.023 - t * 0.29, y * 0.021 + t * 0.23) * 0.27 +
    poolValueNoise(x * 0.047 + t * 0.37, y * 0.051 + t * 0.31) * 0.15 +
    poolValueNoise(x * 0.093 - t * 0.43, y * 0.089 - t * 0.41) * 0.08
  );
}

// Thin web along a noise threshold; a slow mask fades some regions out.
function poolCaustic(x, y, t) {
  const n = poolFbm(x, y, t);
  const width = 0.018 + poolValueNoise(x * 0.006 + 40, y * 0.006 - t * 0.05) * 0.03;
  const line = 1 - Math.abs(n - 0.5) / width;
  if (line <= 0) return 0;
  const mask = poolValueNoise(x * 0.004 - t * 0.08, y * 0.004 + 17);
  return line * line * mask * mask;
}

/* Intro pool ripple canvas */
(function initPoolRipple() {
  const canvas = document.querySelector('[data-pool-ripple]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const frameEl = canvas.closest('.pool-frame');
  const intro = canvas.closest('.portfolio-intro');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SCALE = 2;
  const DAMPING = 0.975;

  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let prev = null;
  let curr = null;
  let caus = null;
  let blur = null;
  let detail = null;
  let laneCenter = { x: 0, y: 0 };
  let lastPointer = null;
  let pool = null;
  let frame = null;
  let lastDrop = 0;
  let diving = false;
  // water rect in pixels and in simulation cells
  let water = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let cells = { x0: 1, y0: 1, x1: 2, y1: 2 };
  let floorRect = { x0: 0, y0: 0, x1: 0, y1: 0 };

  // Top-down pool: thin tiled deck, dark-blue coping strip, bright water, painted lane.
  function buildPoolBase() {
    const base = document.createElement('canvas');
    base.width = w;
    base.height = h;
    const c = base.getContext('2d');
    const unit = Math.min(w, h);

    const deck = Math.max(10, Math.round(unit * 0.05));
    const lip = Math.max(6, Math.round(unit * 0.03));

    // deck: per-tile colour jitter, uneven grout, soft grain
    c.fillStyle = '#cfc9bc';
    c.fillRect(0, 0, w, h);
    const deckTile = deck;
    const jitter = () => (Math.random() - 0.5) * deckTile * 0.08;
    for (let y = 0; y < h; y += deckTile) {
      for (let x = 0; x < w; x += deckTile) {
        const tone = 206 + Math.round((Math.random() - 0.5) * 10);
        const warm = Math.round(Math.random() * 4);
        const gap = 0.4 + Math.random() * 0.8;
        c.fillStyle = 'rgb(' + (tone + 10 + warm) + ', ' + (tone + 6) + ', ' + (tone - 3 - warm) + ')';
        c.fillRect(x + gap + jitter() * 0.3, y + gap + jitter() * 0.3, deckTile - gap * 2, deckTile - gap * 2);
      }
    }
    c.strokeStyle = 'rgba(120, 112, 98, 0.08)';
    for (let x = deckTile; x < w; x += deckTile) {
      c.lineWidth = 0.6 + Math.random() * 0.8;
      c.beginPath();
      c.moveTo(x + jitter(), 0);
      c.lineTo(x + jitter(), h);
      c.stroke();
    }
    for (let y = deckTile; y < h; y += deckTile) {
      c.lineWidth = 0.6 + Math.random() * 0.8;
      c.beginPath();
      c.moveTo(0, y + jitter());
      c.lineTo(w, y + jitter());
      c.stroke();
    }
    c.lineWidth = 1;

    // deck light falls from the top-left
    const deckLight = c.createLinearGradient(0, 0, w, h);
    deckLight.addColorStop(0, 'rgba(255, 252, 244, 0.16)');
    deckLight.addColorStop(0.5, 'rgba(255, 252, 244, 0)');
    deckLight.addColorStop(1, 'rgba(60, 54, 44, 0.12)');
    c.fillStyle = deckLight;
    c.fillRect(0, 0, w, h);

    const grain = c.getImageData(0, 0, w, h);
    for (let k = 0; k < grain.data.length; k += 4) {
      const g = (Math.random() - 0.5) * 9;
      grain.data[k] += g;
      grain.data[k + 1] += g;
      grain.data[k + 2] += g;
    }
    c.putImageData(grain, 0, 0);

    // coping strip: muted blue tiles with per-tile variation
    const cx0 = deck;
    const cy0 = deck;
    const cw = w - deck * 2;
    const ch = h - deck * 2;
    // whole tiles per side so the four corners meet cleanly
    const tilesX = Math.max(1, Math.round(cw / lip));
    const tilesY = Math.max(1, Math.round(ch / lip));
    const edgeX = (k) => cx0 + Math.round((k * cw) / tilesX);
    const edgeY = (k) => cy0 + Math.round((k * ch) / tilesY);
    for (let j = 0; j < tilesY; j += 1) {
      for (let i = 0; i < tilesX; i += 1) {
        const v = (Math.random() - 0.5) * 10;
        c.fillStyle = 'rgb(' + Math.round(38 + v) + ', ' + Math.round(72 + v) + ', ' + Math.round(108 + v * 1.2) + ')';
        c.fillRect(edgeX(i), edgeY(j), edgeX(i + 1) - edgeX(i), edgeY(j + 1) - edgeY(j));
      }
    }
    c.strokeStyle = 'rgba(14, 30, 50, 0.35)';
    for (let i = 0; i <= tilesX; i += 1) {
      c.beginPath();
      c.moveTo(edgeX(i) + 0.5, cy0);
      c.lineTo(edgeX(i) + 0.5, cy0 + ch);
      c.stroke();
    }
    for (let j = 0; j <= tilesY; j += 1) {
      c.beginPath();
      c.moveTo(cx0, edgeY(j) + 0.5);
      c.lineTo(cx0 + cw, edgeY(j) + 0.5);
      c.stroke();
    }
    const copingLight = c.createLinearGradient(cx0, cy0, cx0 + cw, cy0 + ch);
    copingLight.addColorStop(0, 'rgba(200, 220, 235, 0.14)');
    copingLight.addColorStop(1, 'rgba(10, 20, 36, 0.16)');
    c.fillStyle = copingLight;
    c.fillRect(cx0, cy0, cw, ch);

    // feather the deck/coping seam
    const seam = Math.max(2, lip * 0.35);
    [
      [cx0, cy0, cx0, cy0 + seam, cx0, cy0, cw, seam],
      [cx0, cy0 + ch, cx0, cy0 + ch - seam, cx0, cy0 + ch - seam, cw, seam],
      [cx0, cy0, cx0 + seam, cy0, cx0, cy0, seam, ch],
      [cx0 + cw, cy0, cx0 + cw - seam, cy0, cx0 + cw - seam, cy0, seam, ch],
    ].forEach(([gx0, gy0, gx1, gy1, rx, ry, rw, rh]) => {
      const g = c.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, 'rgba(150, 156, 160, 0.45)');
      g.addColorStop(1, 'rgba(150, 156, 160, 0)');
      c.fillStyle = g;
      c.fillRect(rx, ry, rw, rh);
    });

    // water opening (rim)
    const px = deck + lip;
    const py = deck + lip;
    const pw = w - px * 2;
    const ph = h - py * 2;
    water = { x0: px, y0: py, x1: px + pw, y1: py + ph };

    // floor: one inset for all four walls, centred on the rim, whole pixels
    const inset = Math.round(Math.min(pw, ph) * 0.1);
    const fx = px + inset;
    const fy = py + inset;
    const fw = pw - inset * 2;
    const fh = ph - inset * 2;
    floorRect = { x0: fx, y0: fy, x1: fx + fw, y1: fy + fh };

    const rim = [[px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph]];
    const flo = [[fx, fy], [fx + fw, fy], [fx + fw, fy + fh], [fx, fy + fh]];
    const lerp = (p, q, s) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
    // light from top-left: small brightness steps between walls, dark at the rim, lighter toward the floor
    const walls = [
      { a: 0, b: 1, top: '#24707a', bottom: '#4fa8aa' },
      { a: 1, b: 2, top: '#2c7e86', bottom: '#5ab4b3' },
      { a: 2, b: 3, top: '#2f838a', bottom: '#5db7b5' },
      { a: 3, b: 0, top: '#226b76', bottom: '#4ca4a7' },
    ];

    walls.forEach(({ a, b, top, bottom }) => {
      const ma = lerp(rim[a], rim[b], 0.5);
      const mb = lerp(flo[a], flo[b], 0.5);

      c.save();
      c.beginPath();
      c.moveTo(rim[a][0], rim[a][1]);
      c.lineTo(rim[b][0], rim[b][1]);
      c.lineTo(flo[b][0], flo[b][1]);
      c.lineTo(flo[a][0], flo[a][1]);
      c.closePath();
      const shade = c.createLinearGradient(ma[0], ma[1], mb[0], mb[1]);
      shade.addColorStop(0, top);
      shade.addColorStop(1, bottom);
      c.fillStyle = shade;
      c.fill();
      c.clip();

      // wall tiles run down toward the floor, with a few depth courses
      c.strokeStyle = 'rgba(6, 50, 64, 0.16)';
      const len = Math.hypot(rim[b][0] - rim[a][0], rim[b][1] - rim[a][1]);
      const columns = Math.max(4, Math.round(len / 22));
      for (let k = 1; k < columns; k += 1) {
        const p1 = lerp(rim[a], rim[b], k / columns);
        const p2 = lerp(flo[a], flo[b], k / columns);
        c.beginPath();
        c.moveTo(p1[0], p1[1]);
        c.lineTo(p2[0], p2[1]);
        c.stroke();
      }
      for (let k = 1; k < 4; k += 1) {
        const p1 = lerp(rim[a], flo[a], k / 4);
        const p2 = lerp(rim[b], flo[b], k / 4);
        c.beginPath();
        c.moveTo(p1[0], p1[1]);
        c.lineTo(p2[0], p2[1]);
        c.stroke();
      }
      c.restore();
    });

    // soften the wall corner seams
    c.save();
    c.strokeStyle = 'rgba(30, 100, 108, 0.35)';
    c.lineWidth = 4;
    c.filter = 'blur(3px)';
    rim.forEach((corner, index) => {
      c.beginPath();
      c.moveTo(corner[0], corner[1]);
      c.lineTo(flo[index][0], flo[index][1]);
      c.stroke();
    });
    c.restore();

    // floor: greener and lighter near the walls, deeper and bluer in the centre
    c.save();
    c.beginPath();
    c.rect(fx, fy, fw, fh);
    c.clip();
    c.fillStyle = '#6cc0b6';
    c.fillRect(fx, fy, fw, fh);
    c.save();
    c.translate(fx + fw / 2, fy + fh / 2);
    c.scale(fw / fh, 1);
    const depth = c.createRadialGradient(0, 0, 0, 0, 0, fh * 0.7);
    depth.addColorStop(0, 'rgba(38, 118, 142, 0.85)');
    depth.addColorStop(0.5, 'rgba(56, 146, 156, 0.5)');
    depth.addColorStop(1, 'rgba(108, 192, 182, 0)');
    c.fillStyle = depth;
    c.fillRect(-fw, -fh, fw * 2, fh * 2);
    c.restore();

    const floorTile = Math.max(10, Math.round(Math.min(fw, fh) / 12));
    c.strokeStyle = 'rgba(20, 100, 116, 0.2)';
    for (let x = fx; x <= fx + fw; x += floorTile) {
      c.beginPath();
      c.moveTo(x + 0.5, fy);
      c.lineTo(x + 0.5, fy + fh);
      c.stroke();
    }
    for (let y = fy; y <= fy + fh; y += floorTile) {
      c.beginPath();
      c.moveTo(fx, y + 0.5);
      c.lineTo(fx + fw, y + 0.5);
      c.stroke();
    }

    // painted lane line with end bars, scaled to the floor
    const laneWidth = Math.max(5, Math.round(fh * 0.05));
    const margin = Math.round(fw * 0.07);
    const barWidth = Math.max(5, Math.round(fw * 0.014));
    const barHeight = Math.round(fh * 0.22);
    const midY = fy + fh / 2;
    const laneTop = Math.round(midY - laneWidth / 2);
    const barTop = Math.round(midY - barHeight / 2);
    const laneLeft = fx + margin;
    const laneRight = fx + fw - margin;
    c.fillStyle = '#163f5e';
    c.fillRect(laneLeft, laneTop, laneRight - laneLeft, laneWidth);
    c.fillRect(laneLeft, barTop, barWidth, barHeight);
    c.fillRect(laneRight - barWidth, barTop, barWidth, barHeight);
    // midpoint of the lane between its end bars, used to centre the label
    laneCenter = { x: (laneLeft + laneRight) / 2, y: laneTop + laneWidth / 2 };
    c.restore();

    // short gradient where walls meet the floor, instead of a hard edge
    const ao = Math.min(fw, fh) * 0.07;
    c.save();
    c.beginPath();
    c.rect(px, py, pw, ph);
    c.clip();
    [
      [fx, fy, fx, fy + ao, fx, fy - ao * 0.4, fw, ao * 1.4],
      [fx, fy + fh, fx, fy + fh - ao, fx, fy + fh - ao, fw, ao * 1.4],
      [fx, fy, fx + ao, fy, fx - ao * 0.4, fy, ao * 1.4, fh],
      [fx + fw, fy, fx + fw - ao, fy, fx + fw - ao, fy, ao * 1.4, fh],
    ].forEach(([gx0, gy0, gx1, gy1, rx, ry, rw, rh]) => {
      const g = c.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, 'rgba(18, 70, 84, 0.3)');
      g.addColorStop(1, 'rgba(18, 70, 84, 0)');
      c.fillStyle = g;
      c.fillRect(rx, ry, rw, rh);
    });

    // deeper occlusion in the inner corners
    flo.forEach(([qx, qy]) => {
      const r = Math.min(pw, ph) * 0.16;
      const g = c.createRadialGradient(qx, qy, 0, qx, qy, r);
      g.addColorStop(0, 'rgba(10, 44, 60, 0.3)');
      g.addColorStop(1, 'rgba(10, 44, 60, 0)');
      c.fillStyle = g;
      c.fillRect(qx - r, qy - r, r * 2, r * 2);
    });

    // shadow cast by the coping onto the water
    const edge = c.createLinearGradient(px, py, px, py + lip * 1.5);
    edge.addColorStop(0, 'rgba(10, 40, 60, 0.32)');
    edge.addColorStop(1, 'rgba(10, 40, 60, 0)');
    c.fillStyle = edge;
    c.fillRect(px, py, pw, lip * 1.5);
    c.restore();

    // feather the coping/water seam
    [
      [px, py, px, py - seam, px, py - seam, pw, seam],
      [px, py + ph, px, py + ph + seam, px, py + ph, pw, seam],
      [px, py, px - seam, py, px - seam, py, seam, ph],
      [px + pw, py, px + pw + seam, py, px + pw, py, seam, ph],
    ].forEach(([gx0, gy0, gx1, gy1, rx, ry, rw, rh]) => {
      const g = c.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, 'rgba(36, 96, 112, 0.5)');
      g.addColorStop(1, 'rgba(36, 96, 112, 0)');
      c.fillStyle = g;
      c.fillRect(rx, ry, rw, rh);
    });

    // soft irregular colour drift across the water
    const tint = c.getImageData(px, py, pw, ph);
    const td = tint.data;
    for (let y = 0; y < ph; y += 1) {
      for (let x = 0; x < pw; x += 1) {
        const n = valueNoise(x * 0.018, y * 0.018) * 0.65 + valueNoise(x * 0.055 + 9, y * 0.055 - 4) * 0.35 - 0.5;
        const k = (y * pw + x) * 4;
        td[k] += n * 6;
        td[k + 1] += n * 12;
        td[k + 2] += n * 9;
      }
    }
    c.putImageData(tint, px, py);

    // Overhead light: the deck is brightest beside the water and falls off into the dark,
    // ending on the same faint teal the reflected glow puts around the frame, so no edge shows.
    const lit = c.getImageData(0, 0, w, h);
    const ld = lit.data;
    const EDGE = [5, 18, 20];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const ox = Math.max(cx0 - x, x - (cx0 + cw), 0);
        const oy = Math.max(cy0 - y, y - (cy0 + ch), 0);
        const d = Math.hypot(ox, oy);
        if (d === 0) continue;
        const reach = Math.min(1, d / deck);
        const keep = (1 - reach) * (1 - reach) * (1 - reach * 0.4);
        const k = (y * w + x) * 4;
        ld[k] = ld[k] * keep + EDGE[0] * (1 - keep);
        ld[k + 1] = ld[k + 1] * keep + EDGE[1] * (1 - keep);
        ld[k + 2] = ld[k + 2] * keep + EDGE[2] * (1 - keep);
      }
    }
    c.putImageData(lit, 0, 0);

    // very faint vignette over the whole scene
    const vig = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.14)');
    c.fillStyle = vig;
    c.fillRect(0, 0, w, h);

    return c.getImageData(0, 0, w, h);
  }

  function resize() {
    if (diving) return false;
    w = Math.max(4, Math.round(canvas.clientWidth));
    h = Math.max(4, Math.round(canvas.clientHeight));
    if (!canvas.clientWidth || !canvas.clientHeight) return false;

    canvas.width = w;
    canvas.height = h;
    cols = Math.ceil(w / SCALE) + 1;
    rows = Math.ceil(h / SCALE) + 1;
    prev = new Float32Array(cols * rows);
    curr = new Float32Array(cols * rows);
    caus = new Float32Array(cols * rows);
    blur = new Float32Array(cols * rows);
    detail = new Float32Array(cols * rows);
    pool = buildPoolBase();

    // simulation stays inside the water so waves reflect off the pool walls
    cells = {
      x0: Math.ceil(water.x0 / SCALE) + 1,
      y0: Math.ceil(water.y0 / SCALE) + 1,
      x1: Math.floor(water.x1 / SCALE) - 1,
      y1: Math.floor(water.y1 / SCALE) - 1,
    };
    alignLabel();
    return true;
  }

  function drop(px, py, strength) {
    rippleDrop(prev, cols, cells, Math.floor(px / SCALE), Math.floor(py / SCALE), strength);
  }

  function step() {
    rippleStep(prev, curr, cols, cells, DAMPING);
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  // shared noise helpers (defined above, also used by the home hero)
  const valueNoise = poolValueNoise;
  const caustic = poolCaustic;

  function render(time) {
    const src = pool.data;
    const out = ctx.createImageData(w, h);
    const dst = out.data;
    dst.set(src);

    const t = time / 2600;
    const { x0, y0, x1, y1 } = water;

    // caustics evaluated at simulation resolution, sampled per pixel below
    for (let cy = cells.y0 - 2; cy <= cells.y1 + 2; cy += 1) {
      for (let cx = cells.x0 - 2; cx <= cells.x1 + 2; cx += 1) {
        const qx = cx * SCALE;
        const qy = cy * SCALE;
        // full strength on the floor, fading as it climbs the walls
        const reach = Math.max(floorRect.x0 - qx, qx - floorRect.x1, floorRect.y0 - qy, qy - floorRect.y1, 0);
        const climb = reach ? Math.max(0.15, 1 - reach / (Math.min(w, h) * 0.09)) : 1;
        caus[cy * cols + cx] = caustic(qx, qy, t) * climb;
        // fine, faster secondary ripple riding on top of the main waves
        detail[cy * cols + cx] = (valueNoise(qx * 0.085 + t * 1.7, qy * 0.085 - t * 1.3) - 0.5) * 0.9;
      }
    }

    // soften caustic edges with a small box blur
    for (let cy = cells.y0 - 1; cy <= cells.y1 + 1; cy += 1) {
      for (let cx = cells.x0 - 1; cx <= cells.x1 + 1; cx += 1) {
        const k = cy * cols + cx;
        blur[k] = (caus[k] * 4 + caus[k - 1] + caus[k + 1] + caus[k - cols] + caus[k + cols]) / 8;
      }
    }

    for (let y = y0; y < y1; y += 1) {
      const sy = (y / SCALE) | 0;
      for (let x = x0; x < x1; x += 1) {
        const sx = (x / SCALE) | 0;
        const i = sy * cols + sx;
        const dx = prev[i - 1] - prev[i + 1] + detail[i - 1] - detail[i + 1];
        const dy = prev[i - cols] - prev[i + cols] + detail[i - cols] - detail[i + cols];
        // caustics brighten on crests and fade in troughs
        const crest = Math.min(2, Math.max(0.3, 1 - prev[i] * 1.6));

        let ox = x + Math.round(dx * 14);
        let oy = y + Math.round(dy * 14);
        if (ox < x0) ox = x0; else if (ox >= x1) ox = x1 - 1;
        if (oy < y0) oy = y0; else if (oy >= y1) oy = y1 - 1;

        const s = (oy * w + ox) * 4;
        const d = (y * w + x) * 4;
        const light = dx * 60 + blur[((oy / SCALE) | 0) * cols + ((ox / SCALE) | 0)] * 95 * crest;

        dst[d] = Math.min(255, Math.max(0, src[s] + light));
        dst[d + 1] = Math.min(255, Math.max(0, src[s + 1] + light));
        dst[d + 2] = Math.min(255, Math.max(0, src[s + 2] + light));
      }
    }

    ctx.putImageData(out, 0, 0);
  }

  function loop(time) {
    if (time - lastDrop > 2200) {
      lastDrop = time;
      const rx = water.x0 + Math.random() * (water.x1 - water.x0);
      const ry = water.y0 + Math.random() * (water.y1 - water.y0);
      drop(rx, ry, 0.5);
    }

    // slow background currents: two points wander and keep nudging the surface
    const tc = time / 9000;
    for (let k = 0; k < 2; k += 1) {
      const cx = water.x0 + valueNoise(tc + k * 31, k * 7.3) * (water.x1 - water.x0);
      const cy = water.y0 + valueNoise(k * 5.1, tc + k * 19) * (water.y1 - water.y0);
      drop(cx, cy, 0.06);
    }

    step();
    render(time);
    swayGlow(time);
    frame = window.requestAnimationFrame(loop);
  }

  // Reflected teal glow around the pool sways with the water: slow drift plus current ripple energy.
  let glowEnergy = 0;
  function swayGlow(time) {
    if (!frameEl) return;
    let energy = 0;
    for (let k = 1; k <= 4; k += 1) {
      for (let j = 1; j <= 4; j += 1) {
        const cx = cells.x0 + (((cells.x1 - cells.x0) * k) / 5) | 0;
        const cy = cells.y0 + (((cells.y1 - cells.y0) * j) / 5) | 0;
        energy += Math.abs(prev[cy * cols + cx]);
      }
    }
    glowEnergy += (Math.min(1, energy / 6) - glowEnergy) * 0.05;
    const t = time / 1000;
    frameEl.style.setProperty('--glow-x', (Math.sin(t * 0.35) * 1.2).toFixed(2) + '%');
    frameEl.style.setProperty('--glow-y', (Math.cos(t * 0.27) * 1).toFixed(2) + '%');
    frameEl.style.setProperty('--glow-s', (1 + Math.sin(t * 0.5) * 0.015 + glowEnergy * 0.04).toFixed(3));
    frameEl.style.setProperty('--glow-a', (0.16 + Math.sin(t * 0.6) * 0.02 + glowEnergy * 0.08).toFixed(3));
  }

  function start() {
    if (frame !== null || reduceMotion.matches || document.hidden) return;
    frame = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (frame === null) return;
    window.cancelAnimationFrame(frame);
    frame = null;
  }

  function renderStatic() {
    render(0);
  }

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * w,
      y: ((clientY - rect.top) / rect.height) * h,
      inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom,
    };
  }

  function pointerAt(clientX, clientY, strength) {
    if (diving || reduceMotion.matches) return;
    const p = toCanvas(clientX, clientY);
    const now = performance.now();
    if (!p.inside) {
      lastPointer = null;
      return;
    }

    lastPointer = rippleTrail(lastPointer, p.x, p.y, now, strength, SCALE * 3, drop);
  }

  // centre the ENTER label on the lane's midpoint, not the canvas centre
  function alignLabel() {
    const label = intro && intro.querySelector('.portfolio-intro__word');
    if (!label || diving) return;
    label.style.translate = '0 0';
    const rect = canvas.getBoundingClientRect();
    const box = label.getBoundingClientRect();
    const fontSize = parseFloat(window.getComputedStyle(label).fontSize) || 16;
    const targetX = rect.left + (laneCenter.x / w) * rect.width;
    const targetY = rect.top + (laneCenter.y / h) * rect.height;
    // text sits in the top 1em of a 1.2em box, so its visual centre is 0.5em down
    const textX = box.left + box.width / 2;
    const textY = box.top + fontSize * 0.5;
    label.style.translate = Math.round(targetX - textX) + 'px ' + Math.round(targetY - textY) + 'px';
  }

  function goHome() {
    try {
      sessionStorage.setItem('skip-page-transition-entry', '1');
    } catch (error) {
      // Continue without session state when storage is unavailable.
    }
    window.location.replace('home.html');
  }

  // Zoom into the pool and leave. Called by the hold timer, or early by a click anywhere.
  function dive(event) {
    if (diving || !revealed) return;
    diving = true;
    window.clearTimeout(holdTimer);
    holdTimer = null;

    if (reduceMotion.matches || !frameEl) {
      goHome();
      return;
    }

    const p = event ? toCanvas(event.clientX, event.clientY) : { x: w / 2, y: h / 2 };
    drop(p.x, p.y, 3);
    if (intro) intro.classList.add('is-diving');

    // Dive (~1.2s): the camera tips down toward the surface, breaks through, then sinks into teal.
    const DIVE = 1200;
    const ease = 'cubic-bezier(0.55, 0, 0.25, 1)';
    const rect = frameEl.getBoundingClientRect();
    const cover = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height);
    const at = (tilt, scale) => `translate(-50%, -50%) perspective(900px) rotateX(${tilt}deg) scale(${scale})`;
    if (frameEl.animate) {
      frameEl.animate([
        { transform: at(0, 1), filter: 'blur(0px) brightness(1)', offset: 0 },
        { transform: at(24, cover * 0.9), filter: 'blur(0px) brightness(1.05)', offset: 0.42 },
        { transform: at(34, cover * 2.2), filter: 'blur(7px) brightness(1.25)', offset: 0.58 },
        { transform: at(38, cover * 4), filter: 'blur(3px) brightness(0.55)', offset: 1 }
      ], { duration: DIVE, easing: ease, fill: 'forwards' });
    } else {
      frameEl.style.transform = at(0, cover * 1.15);
    }

    // breaking the surface: a burst of strong ripples for a moment of heavy distortion
    window.setTimeout(() => {
      for (let k = 0; k < 9; k += 1) {
        drop(water.x0 + Math.random() * (water.x1 - water.x0), water.y0 + Math.random() * (water.y1 - water.y0), 6);
      }
    }, DIVE * 0.4);

    // underwater layer: fades in after the break, with a few fine bubbles rising past
    const under = document.createElement('div');
    under.className = 'pool-dive';
    under.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 18; k += 1) {
      const bubble = document.createElement('span');
      bubble.style.left = (Math.random() * 100).toFixed(1) + '%';
      bubble.style.setProperty('--size', (3 + Math.random() * 7).toFixed(1) + 'px');
      bubble.style.setProperty('--delay', (DIVE * (0.45 + Math.random() * 0.25)).toFixed(0) + 'ms');
      bubble.style.setProperty('--rise', (500 + Math.random() * 400).toFixed(0) + 'ms');
      under.appendChild(bubble);
    }
    (intro || document.body).appendChild(under);
    if (under.animate) {
      under.animate([
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.45 },
        { opacity: 0.8, offset: 0.68 },
        { opacity: 1, offset: 1 }
      ], { duration: DIVE, easing: ease, fill: 'forwards' });
    } else {
      under.style.opacity = '1';
    }

    // goHome sets the skip-page-transition flag; this flag asks home.html for its dive reveal
    window.setTimeout(() => {
      try {
        sessionStorage.setItem('home-dive-reveal', '1');
      } catch (error) {
        // Continue without the reveal when storage is unavailable.
      }
      goHome();
    }, DIVE);
  }

  window.addEventListener('mousemove', (event) => pointerAt(event.clientX, event.clientY, 1.1));
  window.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (touch) pointerAt(touch.clientX, touch.clientY, 1.3);
  }, { passive: true });
  // Sequence: count while the pool zooms in (loader) -> hold 1.5s -> auto-zoom to home.
  let revealed = false;
  let holdTimer = null;
  if (intro) {
    intro.addEventListener('pool:reveal', () => {
      if (revealed) return;
      revealed = true;
      holdTimer = window.setTimeout(() => dive(null), 1500);
    });
  }
  window.addEventListener('click', dive);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener('resize', () => {
    if (diving) return;
    stop();
    if (!resize()) return;
    if (reduceMotion.matches) renderStatic();
    else start();
  });

  reduceMotion.addEventListener('change', () => {
    stop();
    if (reduceMotion.matches) renderStatic();
    else start();
  });

  if (resize()) {
    if (reduceMotion.matches) renderStatic();
    else start();
  }
})();
