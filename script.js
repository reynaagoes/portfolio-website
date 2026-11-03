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
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
// Phones and low-core / low-memory machines start every water canvas one step coarser (see adaptiveDetail).
const lowPowerDevice = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 ||
  window.matchMedia("(pointer: coarse)").matches;
// Brightness of the light shafts at the surface; every space dims it by its own depth (paintLightShafts).
const SEA_LIGHT = 0.18;
const shaftImages = new WeakMap();
// Water palettes for the inner-page canvas: floor colour, how much it rises where light reaches, light-web tint.
const SEA_TINT = {
  deep: { floor: [6, 16, 20], rise: [5, 20, 22], web: [70, 185, 190], gain: 1 },
  // the MON WALLET ocean glows: lit like shallow water (reachMin) so its light web reads even at Contact's depth
  ocean: { floor: [4, 28, 36], rise: [3, 26, 30], web: [80, 200, 210], gain: 1.15, reachMin: 0.78, stir: 0.08 }
};
SEA_TINT.about = SEA_TINT.contact = SEA_TINT.ocean;
const portfolioIntro = document.querySelector(".portfolio-intro");
const homeHero = document.querySelector(".home-hero");

// One underwater camera for the whole site. Each space sits at its own depth: Home is the surface,
// Contact the deep end. How much light reaches its water and how dark it starts follow from that.
const SEA_LEVELS = {
  home: { rank: 0, floor: 0, reach: 1 },
  projects: { rank: 1, floor: 0, reach: 0.88 },
  about: { rank: 2, floor: 0.14, reach: 0.72 },
  experience: { rank: 3, floor: 0.24, reach: 0.6 },
  contact: { rank: 4, floor: 0.36, reach: 0.44 }
};
const seaLevel = SEA_LEVELS[document.body.dataset.page] || null;

// The camera hands its state to the next page (water clock, where the light was, how dark the water
// was, which way it was heading), so the next space carries on in the same water instead of resetting.
const seaCamera = (() => {
  const KEY = "sea-camera";
  let arrival = null;
  try {
    const state = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    if (state && state.to === document.body.dataset.page && Date.now() - state.at < 8000) arrival = state;
  } catch (error) {
    // No storage: every page starts in fresh water.
  }
  return {
    arrival,
    save(state) {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(state));
      } catch (error) {
        // Continuity is a nicety; navigation works without it.
      }
    }
  };
})();

// Page content that travels as one when the camera moves (page portal, project spotlight).
// Never <main> itself: it holds the pinned water canvas. Home's hero children carry the dive's inline
// transforms, so the hero moves as one piece there; the nav's inner element is used, not the header,
// whose own fade-in animation pins its opacity. Each target sits inside a container that clips it
// sideways during the move (header, footer, main), so the page never widens.
const sceneTargets = () => document.querySelectorAll(document.body.classList.contains("page-home")
  ? ".home-nav__inner, .home-hero"
  : ".home-nav__inner, body > footer > *, main > section > :not(.editorial-hero-effect):not(.work-preview)");
const setScene = (state) => {
  document.body.classList.remove("portal-out", "portal-in", "portal-in-go");
  const on = Boolean(state);
  sceneTargets().forEach((node) => node.classList.toggle("portal-target", on));
  document.querySelector(".editorial-hero-effect")?.classList.toggle("portal-target", on);
  if (state) document.body.classList.add(state);
};

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
  // Water portal: the page content sinks away on leaving (the water itself warps) and surfaces out of
  // the same water on arrival. The camera keeps its heading: arriving from a shallower space it is still
  // travelling down, from a deeper one up, and the veil carries the darkness of the water just left.
  const arrival = seaCamera.arrival;
  if (arrival) {
    document.body.dataset.portal = arrival.dir;
    overlay.style.setProperty("--veil-depth", Math.max(0, Math.min(1, arrival.darkness || 0)).toFixed(3));
  }

  if (skipEntry) {
    overlay.className = "page-transition is-idle";
  } else {
    if (!reduced) setScene("portal-in");
    window.setTimeout(() => {
      overlay.className = "page-transition is-exiting";
      if (!reduced) requestAnimationFrame(() => document.body.classList.add("portal-in-go"));
      window.setTimeout(() => {
        overlay.className = "page-transition is-idle";
        if (document.body.classList.contains("portal-in-go")) setScene(null);
      }, exitDuration + 500);
    }, reduced ? 20 : 100);
  }

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
    // deeper spaces lie below: the camera tilts down into them and up out of them
    const from = document.body.dataset.page;
    const to = destinationRoute.replace(/\.html$/, "");
    const dir = (SEA_LEVELS[to]?.rank ?? 0) >= (SEA_LEVELS[from]?.rank ?? 0) ? "down" : "up";
    const camera = { from, to, dir, darkness: SEA_LEVELS[from]?.floor ?? 0, at: 0 };
    document.body.dataset.portal = dir;
    if (!reduced) setScene("portal-out");
    // each part of the scene adds what it knows (water clock, light position, darkness) to the camera;
    // the water canvas also bends its own picture while the content sinks (see initEditorialHeroEffect)
    document.dispatchEvent(new CustomEvent("portal:leave", { detail: { duration: enterDuration, camera } }));
    camera.at = Date.now();
    seaCamera.save(camera);
    overlay.style.setProperty("--veil-depth", Math.max(0, Math.min(1, camera.darkness)).toFixed(3));
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
    // back/forward cache brings the page back mid-portal; surface it again
    setScene(null);
    document.dispatchEvent(new CustomEvent("portal:return"));
    window.scrollTo(0, 0);
  });
};

const revealAll = () => {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.add("is-visible", "is-settled");
  });
};

// One reveal system for every page: elements surface out of the water (rise, unblur, fade in) once,
// as they enter the viewport. Elements arriving together are staggered in reading order, and once
// settled they drop their delay so hover and focus feedback respond immediately.
// Images surface out of the water as they come into view: up from below, tipped back a little, dim and
// out of focus, then settled and sharp. While on screen they drift a few pixels against the scroll, since
// they sit deeper in the water than the text. One observer and one scroll frame; nothing runs off screen.
const initDepthImages = () => {
  const images = document.querySelectorAll(".work-row__image, .about-education__logo img, .about-profile__image");
  if (!images.length || prefersReducedMotion.matches || !("IntersectionObserver" in window)) return;
  const inView = new Set();
  let frame = null;
  const drift = () => {
    frame = null;
    const middle = window.innerHeight / 2;
    inView.forEach((image) => {
      const rect = image.getBoundingClientRect();
      const offset = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - middle) / window.innerHeight));
      image.style.setProperty("--depth-drift", (offset * 12).toFixed(1) + "px");
    });
  };
  const request = () => { if (frame === null && inView.size) frame = requestAnimationFrame(drift); };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        inView.add(entry.target);
        entry.target.classList.add("is-surfaced");
      } else {
        inView.delete(entry.target);
      }
    });
    request();
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  images.forEach((image) => {
    image.classList.add("depth-image");
    observer.observe(image);
  });
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
};

// About: the page is one dive. Sections sit at increasing depth: a gauge tracks which one the camera
// is passing, content layers drift against the water at their own rates (data-parallax), the education
// line fills as it is read, the portrait leans toward the cursor, tool chips are drawn to it, and the
// interests open and close. One scroll frame drives everything; nothing runs while the page is still.
const initAboutStory = () => {
  const story = document.querySelector(".about-story");
  if (!story) return;
  const reduced = prefersReducedMotion.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const behavior = reduced ? "auto" : "smooth";

  // section jumps (cue, gauge) and the way back up; plain anchors still work without this
  story.querySelectorAll("[data-story-jump]").forEach((link) => link.addEventListener("click", (event) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior, block: "start" });
    history.replaceState(null, "", link.getAttribute("href"));
  }));
  story.querySelector("[data-story-top]")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior });
    history.replaceState(null, "", window.location.pathname);
    document.querySelector(".home-nav__brand")?.focus({ preventScroll: true });
  });

  // the gauge marks the section crossing the middle of the screen
  const gaugeLinks = [...story.querySelectorAll(".about-gauge a")];
  if ("IntersectionObserver" in window && gaugeLinks.length) {
    const gaugeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        gaugeLinks.forEach((link) => {
          const on = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-current", on);
          if (on) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    gaugeLinks.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section) gaugeObserver.observe(section);
    });
  }

  // interests: one open at a time reads as a sequence; without JS all stay open
  const interests = [...story.querySelectorAll(".about-interest")];
  const setOpen = (item, open) => {
    item.classList.toggle("is-open", open);
    item.querySelector(".about-interest__toggle")?.setAttribute("aria-expanded", String(open));
  };
  interests.forEach((item, index) => {
    setOpen(item, index === 0);
    item.querySelector(".about-interest__toggle")?.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      interests.forEach((other) => setOpen(other, other === item ? open : false));
    });
  });

  // scroll-driven layers: parallax drift and the education line, only for what is on screen
  const layers = [...story.querySelectorAll("[data-parallax]")].map((element) => ({ element, rate: parseFloat(element.dataset.parallax) || 0 }));
  const milestone = story.querySelector(".about-milestone__entry");
  let scrollFrame = null;
  const onScroll = () => {
    scrollFrame = null;
    const view = window.innerHeight;
    if (!reduced) {
      layers.forEach(({ element, rate }) => {
        const box = element.getBoundingClientRect();
        if (box.bottom < -view * 0.2 || box.top > view * 1.2) return;
        const offset = box.top + box.height / 2 - view / 2;
        element.style.translate = "0 " + (offset * rate).toFixed(1) + "px";
      });
    }
    if (milestone) {
      const box = milestone.getBoundingClientRect();
      const read = Math.min(1, Math.max(0, (view * 0.75 - box.top) / Math.max(1, box.height)));
      milestone.style.setProperty("--milestone", read.toFixed(3));
    }
  };
  const requestScroll = () => { if (scrollFrame === null) scrollFrame = requestAnimationFrame(onScroll); };
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll, { passive: true });
  onScroll();

  if (reduced || !finePointer) return;

  // portrait: leans toward the cursor and the photo shifts the other way inside its frame (depth),
  // with a patch of surface light following the pointer; eased so it moves like it is in water
  const frame = story.querySelector("[data-story-tilt]");
  if (frame) {
    let tx = 0, ty = 0, x = 0, y = 0, tiltFrame = null;
    const step = () => {
      tiltFrame = null;
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      frame.style.setProperty("--tilt-x", x.toFixed(4));
      frame.style.setProperty("--tilt-y", y.toFixed(4));
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) tiltFrame = requestAnimationFrame(step);
    };
    const wakeTilt = () => { if (tiltFrame === null) tiltFrame = requestAnimationFrame(step); };
    frame.addEventListener("pointermove", (event) => {
      const box = frame.getBoundingClientRect();
      tx = (event.clientX - box.left) / box.width - 0.5;
      ty = (event.clientY - box.top) / box.height - 0.5;
      frame.style.setProperty("--light-x", ((tx + 0.5) * 100).toFixed(1) + "%");
      frame.style.setProperty("--light-y", ((ty + 0.5) * 100).toFixed(1) + "%");
      frame.classList.add("is-lit");
      wakeTilt();
    }, { passive: true });
    frame.addEventListener("pointerleave", () => {
      tx = ty = 0;
      frame.classList.remove("is-lit");
      wakeTilt();
    });
  }

  // tool chips are drawn a few pixels toward a nearby cursor, nearest strongest
  const field = story.querySelector(".about-capabilities__field");
  if (field) {
    const chips = [...field.children];
    let px = 0, py = 0, chipFrame = null, inside = false;
    const pull = () => {
      chipFrame = null;
      chips.forEach((chip) => {
        if (!inside) {
          chip.style.translate = "";
          chip.style.removeProperty("--near");
          return;
        }
        const box = chip.getBoundingClientRect();
        const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / 160);
        chip.style.translate = (dx * near * 0.12).toFixed(1) + "px " + (dy * near * 0.12).toFixed(1) + "px";
        chip.style.setProperty("--near", near.toFixed(3));
      });
    };
    const requestPull = () => { if (chipFrame === null) chipFrame = requestAnimationFrame(pull); };
    field.addEventListener("pointermove", (event) => { px = event.clientX; py = event.clientY; inside = true; requestPull(); }, { passive: true });
    field.addEventListener("pointerleave", () => { inside = false; requestPull(); });
  }
};

// Reading highlight (About, Contact): text blocks marked data-reading are read word by word by one soft
// selection light, a cursor guiding the eye. One block reads at a time: the visible blocks in document
// order, resting briefly between them; blocks off screen never animate. The word under the mouse lights
// and pauses the reading, which resumes from the next word when the mouse leaves. Screen readers get
// each block once from a hidden copy; the visible words are presentation only, and plain text nodes
// between them keep native selection and copying natural.
const READING_STEP_MS = 400;
const READING_REST_MS = 1400;

const splitReadingBlock = (block) => {
  // spoken copy: line breaks read as spaces, whitespace collapsed
  const copy = block.cloneNode(true);
  copy.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
  const spoken = document.createElement("span");
  spoken.className = "reading-spoken";
  spoken.textContent = copy.textContent.trim().replace(/\s+/g, " ");
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  while (block.firstChild) shown.appendChild(block.firstChild);
  // wrap every word of every text node, keeping inline markup (<br>, <strong>…) where it was
  const texts = [];
  const walker = document.createTreeWalker(shown, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) texts.push(walker.currentNode);
  const words = [];
  texts.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (!part.trim()) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement("span");
      word.className = "reading-word";
      word.textContent = part;
      words.push(word);
      fragment.appendChild(word);
    });
    node.replaceWith(fragment);
  });
  block.append(spoken, shown);
  return words;
};

const initReadingHighlight = () => {
  // never inside or around anything interactive: links, buttons and fields keep their own behaviour
  const blocks = [...document.querySelectorAll("[data-reading]")]
    .filter((block) => !block.closest("a, button, nav, label") && !block.querySelector("a, button, input, select, textarea"));
  if (!blocks.length) return;
  const reduced = prefersReducedMotion.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const items = blocks.map((block) => ({ block, words: splitReadingBlock(block), visible: false }))
    .filter((item) => item.words.length);
  let active = null, index = -1, timer = null, hovering = false;

  // One reading caret for the whole page: a thin text cursor at the end of the lit word, gliding to the
  // next word (and down across line breaks) as the reading moves on. It sits in document coordinates, so
  // scrolling carries it; layout changes (resize, parallax, reveals) re-place it on the next frame.
  const caret = document.createElement("span");
  caret.className = "reading-caret";
  caret.setAttribute("aria-hidden", "true");
  document.body.appendChild(caret);
  let caretWord = null, caretBlock = null, caretFrame = null, caretMovedBlock = false;
  const placeCaret = () => {
    caretFrame = null;
    if (!caretWord) return;
    // the end of the word's last line box, just inside its highlight padding
    const rects = caretWord.getClientRects();
    const box = rects[rects.length - 1];
    if (!box) return;
    const pad = parseFloat(getComputedStyle(caretWord).paddingRight) || 0;
    const x = box.right - pad * 0.5 + window.scrollX;
    const y = box.top + box.height * 0.1 + window.scrollY;
    // appearing, or starting a new passage, it jumps into place; within a passage it glides word to word
    const appearing = !caret.classList.contains("is-on") || caretMovedBlock;
    caretMovedBlock = false;
    caret.classList.toggle("is-jump", appearing);
    caret.style.height = (box.height * 0.8).toFixed(1) + "px";
    caret.style.transform = "translate3d(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px, 0)";
    caret.classList.add("is-on");
    if (appearing) requestAnimationFrame(() => caret.classList.remove("is-jump"));
  };
  const showCaret = (word, block) => {
    if (block !== caretBlock) caretMovedBlock = true;
    caretWord = word;
    caretBlock = block;
    if (caretFrame === null) caretFrame = requestAnimationFrame(placeCaret);
  };
  const hideCaret = () => {
    caretWord = null;
    caretBlock = null;
    caret.classList.remove("is-on");
  };
  const followLayout = () => {
    if (caretWord && caretFrame === null) caretFrame = requestAnimationFrame(placeCaret);
  };
  window.addEventListener("scroll", followLayout, { passive: true });
  window.addEventListener("resize", followLayout, { passive: true });

  const clear = () => {
    if (active && index >= 0) active.words[index].classList.remove("is-read");
    index = -1;
  };
  const light = (item, i) => {
    clear();
    active = item;
    index = i;
    item.words[i].classList.add("is-read");
    showCaret(item.words[i], item.block);
  };
  // the next visible block after `from` in reading order, wrapping to the first visible one
  // on screen, laid out, and not folded away (a closed interest panel collapses its wrapper to 0px)
  const readable = (item) => item.visible && item.block.offsetParent !== null &&
    item.block.parentElement.getBoundingClientRect().height > 1;
  const nextVisible = (from) => {
    const visible = items.filter(readable);
    return visible.find((item) => items.indexOf(item) > items.indexOf(from)) || visible[0] || null;
  };
  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };
  const step = () => {
    timer = null;
    if (active && readable(active) && index + 1 < active.words.length) {
      light(active, index + 1);
      timer = setTimeout(step, READING_STEP_MS);
      return;
    }
    // end of a block (or it scrolled away): rest unlit, then read the next visible block
    const finished = Boolean(active && readable(active) && index >= 0);
    clear();
    active = nextVisible(active);
    if (active) timer = setTimeout(step, finished ? READING_REST_MS : READING_STEP_MS);
    else hideCaret();
  };
  const run = () => {
    if (timer === null && !hovering && !reduced && !document.hidden && items.some(readable)) {
      timer = setTimeout(step, READING_STEP_MS);
    }
  };

  // only blocks inside the middle of the screen count as visible, so one section reads at a time
  if ("IntersectionObserver" in window && !reduced) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const item = items.find((candidate) => candidate.block === entry.target);
        if (item) item.visible = entry.isIntersecting;
        if (item === active && !entry.isIntersecting && !hovering) {
          stop();
          clear();
          hideCaret();
        }
      });
      run();
    }, { rootMargin: "-18% 0px -18% 0px" });
    items.forEach((item) => observer.observe(item.block));
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));

  if (!finePointer) return;
  items.forEach((item) => {
    item.words.forEach((word, i) => word.addEventListener("pointerenter", () => {
      hovering = true;
      stop();
      light(item, i);
    }));
    item.block.addEventListener("pointerleave", () => {
      hovering = false;
      run();
    });
  });
};

const initRevealAnimations = () => {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  const settle = (element) => {
    const delay = parseFloat(getComputedStyle(element).transitionDelay) * 1000 || 0;
    // depth headings surface word by word; wait for the last word before settling
    const words = element.classList.contains("reveal-depth") ? element.querySelectorAll(".depth-word").length : 0;
    window.setTimeout(() => element.classList.add("is-settled"), delay + (words ? words * 90 + 1700 : 900));
  };

  const observer = new IntersectionObserver((entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .forEach((entry, index) => {
        // hand-tuned delays in the markup win; everything else gets a gentle cascade
        if (!entry.target.style.getPropertyValue("--delay")) {
          entry.target.style.setProperty("--delay", Math.min(index, 5) * 70 + "ms");
        }
        entry.target.classList.add("is-visible");
        settle(entry.target);
        observer.unobserve(entry.target);
      });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });

  elements.forEach((element) => {
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

// How far the Home dive has taken the camera (0 surface .. 1 deep); the hero's light reads it.
let homeDiveDepth = 0;

const initHomeHeroPointer = () => {
  if (!homeHero) return;
  const canvas = homeHero.querySelector(".home-hero__field");
  const overlay = homeHero.querySelector(".home-portal");
  const context = canvas.getContext("2d");
  const maskContext = overlay?.getContext("2d");
  if (!context || !maskContext) return;
  const reduced = prefersReducedMotion;

  // Underwater room: a tiled box receding to one vanishing point, lit by real surface caustics.
  // Everything is computed at half resolution (coarser when the device can't keep up), then scaled up.
  const detail = adaptiveDetail(2, 4, 12);
  let CELL = detail.cell;
  const FRAME_MS = lowPowerDevice ? 40 : 33;
  // One water clock across pages: arriving from another space, the surface (and its shafts) carry on.
  const arrival = seaCamera.arrival;
  const clockShift = arrival && Number.isFinite(arrival.time)
    ? arrival.time + Math.min(8, (Date.now() - arrival.at) / 1000) - performance.now() / 1000 : 0;
  let clockNow = 0;
  // leaving through the portal, the water itself swells into heavy refraction (as on the inner pages)
  let warpStart = null, warpDuration = 1;
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
  let width = 0, height = 0, portalSize = 0, portalLeft = 0, portalTop = 0;
  let frame = null, lastDraw = 0, visible = true, ready = false, resizeFrame = null;
  // cursor ripples on the surface, using the shared ripple simulation
  const RIPPLE_CELL = 4;
  const RIPPLE_DAMPING = 0.988;
  const RIPPLE_GAIN = 4.5;
  const RIPPLE_RADIUS = 6;
  // cursor ripples also add light directly where they focus, so the wake reads as a light trail
  const RIPPLE_LIGHT = 0.9;
  // refraction of the room through the surface, in room cells per unit slope (capped at 3 cells)
  const REFRACT = 0.9;
  const REFRACT_RIPPLE = 0.35;
  // soft shafts from the surface; they dim as the dive takes the camera deeper (homeDiveDepth), on the
  // same depth scale the inner pages use (a full dive hands them reach 0.55, i.e. depth 0.45)
  const shaftCanvas = document.createElement("canvas");
  let ripplePrev = null, rippleCurr = null, rippleCols = 0, rippleRows = 0;
  let rippleCells = { x0: 1, y0: 1, x1: 1, y1: 1 }, lastPointer = null;

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
    width = homeHero.clientWidth;
    height = homeHero.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the portal canvas is a square (CSS); its halo needs room beyond the rim, so the disc is drawn inside it
    portalSize = overlay.clientWidth;
    overlay.width = overlay.height = Math.round(portalSize * dpr);
    maskContext.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    portalLeft = overlay.offsetLeft;
    portalTop = overlay.offsetTop;
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
    const warpT = warpStart === null ? 0 : Math.min(1, (performance.now() - warpStart) / warpDuration);
    const swell = 1 + warpT * warpT * (3 - 2 * warpT) * 5;
    const reachCells = 3 * swell;
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
        // refraction: the room is seen through the moving surface, so tiles and grout shift with its slope
        // (the two longest waves plus the cursor ripples); caustics stay where the light lands
        let bx = (rp[j + 1] - rp[j - 1]) * REFRACT_RIPPLE, by = (rp[j + rc] - rp[j - rc]) * REFRACT_RIPPLE;
        for (let k = 0; k < 2; k += 1) {
          const wave = WAVES[k];
          const s = Math.sin(phase[i * n + k] - offsets[k]) * wave.a * REFRACT;
          bx += s * wave.dx;
          by += s * wave.dz;
        }
        bx *= swell;
        by *= swell;
        const sx = Math.min(cols - 1, Math.max(0, x + Math.round(Math.max(-reachCells, Math.min(reachCells, bx)))));
        const sy = Math.min(rows - 1, Math.max(0, y + Math.round(Math.max(-reachCells, Math.min(reachCells, by)))));
        const si = sy * cols + sx;

        const det = (1 + hxx) * (1 + hzz) - hxz * hxz;
        const focus = 1 / (Math.abs(det) + 0.12);
        let caustic = Math.max(0, (focus - 1.4) * 0.16);
        caustic = Math.min(1, caustic * caustic) * causticMix[i];
        // converging ripple crests (negative curvature) add their own light, even on dimly lit surfaces
        const rippleFocus = -(rp[j - 1] + rp[j + 1] + rp[j - rc] + rp[j + rc] - 4 * centre);
        caustic = Math.min(1, caustic + Math.max(0, rippleFocus) * RIPPLE_LIGHT * (0.4 + 0.6 * causticMix[i]));

        const id = surfaceId[i], f = fog[i], sf = fog[si];
        // the surface overhead shimmers with the wave slope instead of catching caustics
        const sheen = id === 4 ? Math.max(0, slope) * 0.6 : 0;

        const lit = caustic * f;
        const r = baseColor[si * 3] * sf + lit * 150 + sheen * 30;
        const g = baseColor[si * 3 + 1] * sf + lit * 230 + sheen * 70;
        const b = baseColor[si * 3 + 2] * sf + lit * 220 + sheen * 80;
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

  // Darker centre behind the portal so it reads against the room.
  const drawReadability = () => {
    const shade = context.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, Math.max(width, height) * 0.55);
    shade.addColorStop(0, "rgba(3, 8, 12, 0.62)");
    shade.addColorStop(0.55, "rgba(3, 8, 12, 0.34)");
    shade.addColorStop(1, "rgba(3, 8, 12, 0.08)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
  };

  // The portal: a round window of brighter water hanging in the pool, the way the surface looks from
  // below. Its body is lit by the room's own caustics (the light buffer, slightly magnified: it is a lens
  // of water), its rim bends with the water and catches the light from the top left, and a faint halo
  // spills into the water around it. The dive's camera flies into it (the stage zooms on its centre).
  const drawPortal = (t) => {
    const s = portalSize, c = s / 2;
    if (!s) return;
    const still = reduced.matches;
    const R = s * 0.34 * (1 + (still ? 0 : Math.sin(t * 0.55) * 0.012));
    maskContext.clearRect(0, 0, s, s);

    // halo: light scattered into the water around the opening
    const halo = maskContext.createRadialGradient(c, c, R * 0.8, c, c, s * 0.5);
    halo.addColorStop(0, "rgba(77, 201, 208, 0.14)");
    halo.addColorStop(0.45, "rgba(40, 150, 165, 0.05)");
    halo.addColorStop(1, "rgba(20, 90, 100, 0)");
    maskContext.fillStyle = halo;
    maskContext.fillRect(0, 0, s, s);

    // the rim is displaced by the water: its radius wobbles with slow noise sampled around the circle
    // (cos/sin of the angle keep the outline closed and seamless)
    const rim = (scale) => {
      maskContext.beginPath();
      for (let k = 0; k <= 120; k += 1) {
        const a = (k / 120) * Math.PI * 2;
        const wobble = still ? 0 : (poolValueNoise(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + t * 0.35) - 0.5) * 0.035;
        const r = R * scale * (1 + wobble);
        const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
        if (k === 0) maskContext.moveTo(x, y); else maskContext.lineTo(x, y);
      }
      maskContext.closePath();
    };

    maskContext.save();
    rim(1);
    maskContext.clip();
    // luminous water, brightest toward the light (top left) and deepening toward the far side
    const body = maskContext.createRadialGradient(c - R * 0.3, c - R * 0.35, R * 0.05, c, c, R * 1.05);
    body.addColorStop(0, "rgba(160, 236, 236, 0.58)");
    body.addColorStop(0.45, "rgba(60, 172, 186, 0.36)");
    body.addColorStop(1, "rgba(8, 48, 58, 0.5)");
    maskContext.fillStyle = body;
    maskContext.fillRect(0, 0, s, s);
    // depth: the opening darkens toward its edge, like the mouth of a tunnel
    const mouth = maskContext.createRadialGradient(c, c, R * 0.68, c, c, R);
    mouth.addColorStop(0, "rgba(3, 18, 22, 0)");
    mouth.addColorStop(1, "rgba(3, 18, 22, 0.5)");
    maskContext.fillStyle = mouth;
    maskContext.fillRect(0, 0, s, s);
    // through the opening: the brightly lit pool floor and its moving caustics (a patch of the light
    // buffer from the floor below the portal, magnified as if seen through a lens of water)
    const patch = Math.min(light.width, light.height * 0.5, (s / CELL) * 0.75);
    const sx = Math.max(0, Math.min(light.width - patch, (portalLeft + c) / CELL - patch / 2));
    const sy = Math.max(0, light.height - patch * 1.05);
    maskContext.globalCompositeOperation = "lighter";
    maskContext.globalAlpha = 0.9;
    maskContext.imageSmoothingEnabled = true;
    maskContext.drawImage(light, sx, sy, patch, patch, c - R, c - R, R * 2, R * 2);
    maskContext.restore();

    // the rim catches the light from the top left and fades toward the bottom right
    const edge = maskContext.createLinearGradient(c - R, c - R, c + R, c + R);
    edge.addColorStop(0, "rgba(210, 248, 246, 0.7)");
    edge.addColorStop(0.5, "rgba(120, 214, 220, 0.28)");
    edge.addColorStop(1, "rgba(80, 180, 190, 0.1)");
    maskContext.save();
    maskContext.strokeStyle = edge;
    maskContext.lineWidth = 1.4;
    rim(1);
    maskContext.stroke();
    // a fainter inner ring: the rim seen again through its own refraction
    maskContext.globalAlpha = 0.32;
    maskContext.lineWidth = 1;
    rim(0.9);
    maskContext.stroke();
    maskContext.restore();
  };

  function draw(now) {
    const t = now / 1000 + clockShift;
    clockNow = t;
    if (!reduced.matches) {
      rippleStep(ripplePrev, rippleCurr, rippleCols, rippleCells, RIPPLE_DAMPING);
      const swap = ripplePrev;
      ripplePrev = rippleCurr;
      rippleCurr = swap;
    }
    context.clearRect(0, 0, width, height);
    drawRoom(t * 0.6);
    lightContext.putImageData(lightImage, 0, 0);
    // shafts light the room and, through the light buffer, the portal where they cross it
    const shafts = paintLightShafts(shaftCanvas, width, height, t, SEA_LIGHT, homeDiveDepth * 0.45);
    if (shafts) {
      context.save();
      context.globalCompositeOperation = "lighter";
      context.drawImage(shafts, 0, 0, width, height);
      context.restore();
      lightContext.save();
      lightContext.globalCompositeOperation = "lighter";
      lightContext.drawImage(shafts, 0, 0, light.width, light.height);
      lightContext.restore();
    }
    drawReadability();
    drawPortal(t);
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
    // ~30fps (25 on low-power devices) keeps the half-res caustics smooth without burning the main thread
    if (now - lastDraw > FRAME_MS) {
      lastDraw = now;
      const began = performance.now();
      draw(now);
      // passes running long: rebuild the room one cell coarser (or finer again with headroom)
      if (detail.sample(performance.now() - began)) {
        CELL = detail.cell;
        resize();
      }
    }
    // resize() may already have scheduled the next frame; never run two loops
    if (frame === null) frame = requestAnimationFrame(tick);
  };
  // hand the water clock to the next space, and bend the water while the page sinks away
  document.addEventListener("portal:leave", (event) => {
    const camera = event.detail?.camera;
    if (camera) camera.time = clockNow;
    if (reduced.matches) return;
    warpStart = performance.now();
    warpDuration = event.detail?.duration || 900;
  });
  document.addEventListener("portal:return", () => { warpStart = null; wake(); });

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
  // rebuilding the room is a full per-pixel pass, so coalesce resize bursts into one per frame
  window.addEventListener("resize", () => {
    if (resizeFrame === null) resizeFrame = requestAnimationFrame(() => { resizeFrame = null; resize(); });
  }, { passive: true });
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
    // the card leans into its own motion like a pane dragged through water, and the image inside
    // trails it slightly (parallax); both settle to rest as the card catches up with the cursor
    const lagX = targetX - currentX, lagY = targetY - currentY;
    const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
    preview.style.setProperty("--tilt-y", clamp(lagX * 0.05, 6).toFixed(2) + "deg");
    preview.style.setProperty("--tilt-x", clamp(-lagY * 0.05, 5).toFixed(2) + "deg");
    preview.style.setProperty("--drift-x", clamp(-lagX * 0.06, 12).toFixed(1) + "px");
    preview.style.setProperty("--drift-y", clamp(-lagY * 0.06, 10).toFixed(1) + "px");
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
    // the active row tips a fraction of a degree toward the cursor (perspective, not rotation)
    if (!reduced) {
      const box = row.getBoundingClientRect();
      row.style.setProperty("--row-rx", (((event.clientY - box.top) / box.height - 0.5) * -2.4).toFixed(2) + "deg");
      row.style.setProperty("--row-ry", (((event.clientX - box.left) / box.width - 0.5) * 1.6).toFixed(2) + "deg");
    }
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

// Inner-page heroes surface out of the water: each word of the heading rises from depth, tilted back
// and out of focus, and settles in reading order; the eyebrow leads and the statement follows once
// the heading has formed. Built on the shared reveal system (it only prepares the elements).
const initDepthTypography = () => {
  const hero = document.querySelector(".work-hero, .about-hero, .experience-hero, .contact-hero");
  const heading = hero?.querySelector("h1");
  if (!heading) return;
  const lead = hero.querySelector(".about-chapter, .contact-chapter, .experience-eyebrow");
  const follow = hero.querySelector(".about-hero__statement, .contact-hero__statement, .experience-hero__copy");

  const words = [];
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (!part.trim()) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement("span");
      word.className = "depth-word";
      word.setAttribute("aria-hidden", "true");
      word.textContent = part;
      word.style.setProperty("--word-index", words.length);
      words.push(word);
      fragment.appendChild(word);
    });
    node.replaceWith(fragment);
  });
  // one accessible name for the heading, in its source wording (innerText would apply the CSS
  // uppercase, which some screen readers spell out); the per-word pieces are presentation only
  heading.setAttribute("aria-label", words.map((word) => word.textContent).join(" "));

  [lead, heading, follow].forEach((element) => element?.classList.remove("reveal-up", "reveal-left", "reveal-right"));
  heading.classList.add("reveal", "reveal-depth");
  [lead, follow].forEach((element) => element?.classList.add("reveal", "reveal-depth-line"));
  // timing starts as the portal veil clears
  const start = 380;
  lead?.style.setProperty("--delay", start - 160 + "ms");
  heading.style.setProperty("--delay", start + "ms");
  follow?.style.setProperty("--delay", start + words.length * 90 + 320 + "ms");

  // Each word paints its own slice of the heading's white-to-cyan ink (a moving word would drop out of
  // the heading's text clip), so the gradient stays continuous across the whole heading.
  const layoutInk = () => {
    heading.style.setProperty("--ink-w", heading.offsetWidth + "px");
    heading.style.setProperty("--ink-h", heading.offsetHeight + "px");
    words.forEach((word) => {
      word.style.setProperty("--ink-x", offsetWithin(word, heading, "offsetLeft") + "px");
      word.style.setProperty("--ink-y", offsetWithin(word, heading, "offsetTop") + "px");
    });
  };
  layoutInk();
  document.fonts?.ready.then(layoutInk);
  let frame = null;
  window.addEventListener("resize", () => {
    if (frame === null) frame = requestAnimationFrame(() => { frame = null; layoutInk(); });
  }, { passive: true });
};

// Work: the All / Design / Development buttons show the rows whose data-category matches.
const initWorkFilters = () => {
  const buttons = [...document.querySelectorAll(".work-filters button")];
  const rows = [...document.querySelectorAll(".work-index__list .work-row")];
  if (!buttons.length || !rows.length) return;
  let pending = null;
  buttons.forEach((button) => button.addEventListener("click", () => {
    const filter = button.textContent.trim().toLowerCase();
    buttons.forEach((other) => {
      other.classList.toggle("is-active", other === button);
      other.setAttribute("aria-pressed", String(other === button));
    });
    const matches = (row) => filter === "all" || (row.dataset.category || "").split(" ").includes(filter);
    window.clearTimeout(pending);
    if (prefersReducedMotion.matches) {
      rows.forEach((row) => { row.hidden = !matches(row); });
      return;
    }
    // leaving rows sink out of view first, then the remaining rows close up and new ones surface in order
    rows.forEach((row) => row.classList.toggle("is-filtering-out", !row.hidden && !matches(row)));
    pending = window.setTimeout(() => {
      let order = 0;
      rows.forEach((row) => {
        row.classList.remove("is-filtering-out");
        const show = matches(row);
        if (show && row.hidden) {
          row.hidden = false;
          row.style.setProperty("--filter-delay", order * 60 + "ms");
          // rows that never scrolled into view are still observed, so the scroll reveal surfaces them
          row.classList.add("is-filtering-in");
          requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove("is-filtering-in")));
          window.setTimeout(() => row.style.removeProperty("--filter-delay"), 1200);
        }
        if (show) order += 1;
        row.hidden = !show;
      });
    }, 280);
  }));
};

// Work: a fullscreen spotlight for one project at a time. The camera pushes past the page into open
// water (the same move as leaving a page) and the project's image surfaces there, flying in from the
// hover preview when one is showing. Title, details, description, image and link all come from the
// row. Plain clicks open it; modified clicks (new tab, etc.) still follow a row's own link.
const initProjectSpotlight = () => {
  const list = document.querySelector(".work-index__list");
  const rows = list ? [...list.querySelectorAll(".work-row")] : [];
  if (!rows.length) return;
  const preview = document.querySelector(".work-preview");
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  // the same lens as the page portal and the hero type (--sea-perspective)
  const lens = "perspective(" + (getComputedStyle(document.documentElement).getPropertyValue("--sea-perspective").trim() || "1200px") + ")";

  const hint = document.createElement("p");
  hint.id = "spotlight-hint";
  hint.className = "spotlight-hint";
  hint.textContent = "Opens a full-screen project preview.";
  list.after(hint);
  rows.forEach((row) => {
    row.setAttribute("aria-describedby", hint.id);
    if (row.tagName === "A") row.setAttribute("aria-haspopup", "dialog");
  });

  const dialog = document.createElement("div");
  dialog.className = "spotlight";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "spotlight-title");
  dialog.innerHTML =
    '<div class="spotlight__water" aria-hidden="true"></div>' +
    '<button class="spotlight__close" type="button" aria-label="Close project preview">Close <span aria-hidden="true">&times;</span></button>' +
    '<div class="spotlight__frame">' +
      '<figure class="spotlight__stage"><div class="spotlight__media"><img alt=""><img alt=""></div></figure>' +
      '<div class="spotlight__info" aria-live="polite">' +
        '<p class="spotlight__count"></p>' +
        '<h2 class="spotlight__title" id="spotlight-title"></h2>' +
        '<p class="spotlight__meta"></p>' +
        '<p class="spotlight__description"></p>' +
        '<a class="spotlight__visit" target="_blank" rel="noopener noreferrer">Visit project <span aria-hidden="true">&nearr;</span></a>' +
      '</div>' +
    '</div>' +
    '<div class="spotlight__controls">' +
      '<button class="spotlight__step" type="button" data-step="-1" aria-label="Previous project"><span aria-hidden="true">&larr;</span></button>' +
      '<button class="spotlight__step" type="button" data-step="1" aria-label="Next project"><span aria-hidden="true">&rarr;</span></button>' +
    '</div>';
  document.body.appendChild(dialog);

  const pick = (selector) => dialog.querySelector(selector);
  const water = pick(".spotlight__water"), closeButton = pick(".spotlight__close");
  const stage = pick(".spotlight__stage"), media = pick(".spotlight__media");
  const images = [...media.querySelectorAll("img")];
  const info = pick(".spotlight__info"), count = pick(".spotlight__count"), title = pick(".spotlight__title");
  const meta = pick(".spotlight__meta"), description = pick(".spotlight__description"), visit = pick(".spotlight__visit");
  const steps = [...dialog.querySelectorAll(".spotlight__step")];
  let index = -1, layer = 0, lastFocus = null, closing = null;
  const visibleRows = () => rows.filter((row) => !row.hidden);
  const still = () => prefersReducedMotion.matches || !media.animate;

  const fill = (row) => {
    const shown = visibleRows();
    const text = (selector) => row.querySelector(selector)?.textContent.trim() || "";
    count.textContent = String(shown.indexOf(row) + 1).padStart(2, "0") + " / " + String(shown.length).padStart(2, "0");
    title.textContent = text("h2");
    meta.textContent = [text(".work-row__type"), text(".work-row__focus")].filter(Boolean).join(" · ");
    description.textContent = text(".work-row__description");
    description.hidden = !description.textContent;
    const href = row.tagName === "A" ? row.href : "";
    visit.hidden = !href;
    if (href) visit.href = href;
    else visit.removeAttribute("href");
    steps.forEach((button) => { button.disabled = shown.length < 2; });
  };

  // loads a row's image into the idle layer; resolves once it can be shown (the frame keeps one
  // proportion and each image is fitted inside it, so stepping between projects never resizes the stage)
  const loadImage = (row) => new Promise((resolve) => {
    const next = images[1 - layer];
    const done = () => resolve(next);
    next.onload = done;
    next.onerror = done;
    next.alt = row.dataset.alt || "";
    if (next.getAttribute("src") !== row.dataset.image) next.src = row.dataset.image;
    if (next.complete) done();
  });

  // the old image sinks back into the water while the new one surfaces from the side it is heading
  const swapTo = (next, dir) => {
    const prev = images[layer];
    layer = images.indexOf(next);
    if (prev !== next) prev.classList.remove("is-active");
    next.classList.add("is-active");
    if (still() || !dir || prev === next) return;
    prev.animate([
      { opacity: 1, transform: "none", filter: "blur(0px)" },
      { opacity: 0, transform: lens + " translate3d(" + -dir * 8 + "%, 0, -160px)", filter: "blur(8px)" }
    ], { duration: 640, easing: ease });
    next.animate([
      { opacity: 0, transform: lens + " translate3d(" + dir * 8 + "%, 0, -160px)", filter: "blur(8px)" },
      { opacity: 1, transform: "none", filter: "blur(0px)" }
    ], { duration: 820, easing: ease });
  };

  const show = async (row, dir) => {
    index = rows.indexOf(row);
    const next = await loadImage(row);
    if (rows[index] !== row) return;
    swapTo(next, dir);
    if (still()) {
      fill(row);
      return;
    }
    info.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translate3d(0, -8px, 0)" }],
      { duration: 200, easing: "ease-in" }).onfinish = () => {
      fill(row);
      info.animate([
        { opacity: 0, transform: "translate3d(0, 12px, 0)", filter: "blur(4px)" },
        { opacity: 1, transform: "none", filter: "blur(0px)" }
      ], { duration: 560, easing: ease });
    };
  };

  const step = (dir) => {
    const shown = visibleRows();
    if (dialog.hidden || closing || shown.length < 2) return;
    const at = Math.max(0, shown.indexOf(rows[index]));
    show(shown[(at + dir + shown.length) % shown.length], dir);
  };

  // the page behind goes inert and stops scrolling; the scrollbar's width is kept so nothing shifts
  const lockPage = (on) => {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.toggle("spotlight-lock", on);
    document.body.style.paddingRight = on && gap > 0 ? gap + "px" : "";
    [...document.body.children].forEach((child) => {
      if (child !== dialog && !child.matches("script, .page-transition, .sea-depth")) child.inert = on;
    });
  };

  const open = async (row) => {
    if (!dialog.hidden && !closing) return;
    if (closing) {
      window.clearTimeout(closing);
      closing = null;
      media.getAnimations().forEach((animation) => animation.cancel());
    }
    lastFocus = document.activeElement;
    index = rows.indexOf(row);
    // where the image already is on screen: the floating hover preview, or the row's own image on small screens
    const source = preview?.classList.contains("is-visible")
      ? preview.querySelector(".work-preview__media")
      : row.querySelector(".work-row__image");
    const from = source && source.offsetParent !== null ? source.getBoundingClientRect() : null;
    fill(row);
    swapTo(await loadImage(row), 0);
    lockPage(true);
    dialog.hidden = false;
    document.body.classList.add("spotlight-open");
    document.body.dataset.portal = "down";
    setScene("portal-out");
    void dialog.offsetHeight;
    dialog.classList.add("is-open");
    closeButton.focus({ preventScroll: true });
    if (still()) return;
    const to = media.getBoundingClientRect();
    if (from && from.width && to.width) {
      // fly in from where the image already was
      const scale = from.width / to.width;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      media.animate([
        { transform: "translate3d(" + dx + "px, " + dy + "px, 0) scale(" + scale + ")" },
        { transform: "none" }
      ], { duration: 980, easing: ease });
    } else {
      // nothing on screen to fly from: the image rises out of the depth instead
      media.animate([
        { transform: lens + " translate3d(0, 6vh, -240px) rotateX(10deg)", opacity: 0, filter: "blur(10px)" },
        { transform: "none", opacity: 1, filter: "blur(0px)" }
      ], { duration: 1100, easing: ease });
    }
  };

  const close = () => {
    if (dialog.hidden || closing) return;
    const row = rows[index];
    dialog.classList.remove("is-open");
    document.body.classList.remove("spotlight-open", "portal-out");
    lockPage(false);
    // focus returns to the project now showing (its row), or to whatever opened the spotlight
    (row && !row.hidden ? row : lastFocus)?.focus?.();
    const finish = () => {
      closing = null;
      dialog.hidden = true;
      media.getAnimations().forEach((animation) => animation.cancel());
      if (!document.body.classList.contains("portal-out")) setScene(null);
    };
    if (still()) {
      finish();
      return;
    }
    // the image sinks back into the water while the page returns along the same camera path
    media.animate([
      { transform: "none", opacity: 1, filter: "blur(0px)" },
      { transform: lens + " translate3d(0, 5vh, -220px)", opacity: 0, filter: "blur(8px)" }
    ], { duration: 560, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
    closing = window.setTimeout(finish, 900);
  };

  list.addEventListener("click", (event) => {
    const row = event.target.closest(".work-row");
    if (!row || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(row);
  });
  list.addEventListener("keydown", (event) => {
    const row = event.target.closest?.(".work-row");
    // link rows already turn Enter into a click; the other rows answer Enter and Space here
    if (!row || row.tagName === "A" || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    open(row);
  });
  closeButton.addEventListener("click", close);
  water.addEventListener("click", close);
  steps.forEach((button) => button.addEventListener("click", () => step(Number(button.dataset.step))));
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Tab") {
      // keep focus inside the dialog
      const focusable = [...dialog.querySelectorAll("button:not([disabled]), a[href]")].filter((element) => !element.closest("[hidden]"));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  // the image leans a few degrees toward the cursor, like a pane suspended in the water
  dialog.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || still()) return;
    const box = stage.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / box.width));
    const ny = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / box.height));
    stage.style.setProperty("--sp-ry", (nx * 4).toFixed(2) + "deg");
    stage.style.setProperty("--sp-rx", (ny * -3).toFixed(2) + "deg");
  });
  dialog.addEventListener("pointerleave", () => {
    stage.style.removeProperty("--sp-rx");
    stage.style.removeProperty("--sp-ry");
  });
};

// The water darkens and the surface light recedes as the page scrolls deeper. Two fixed layers sit
// between the water canvas and the content: surface light (falls away, moves slower than the page)
// and the deep (thickens). Each page also starts deeper than the one before it (SEA_LEVELS).
// Arriving through the portal, the darkness of the water just left is carried in and settles to this
// page's own level, so moving between spaces never resets the atmosphere.
const initSeaDepth = () => {
  const floor = seaLevel?.floor;
  if (floor === undefined || !document.querySelector(".editorial-hero-effect")) return;
  const layer = document.createElement("div");
  layer.className = "sea-depth";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const root = document.documentElement;
  root.style.setProperty("--sea-floor", floor);
  let frame = null, depth = 0, goal = 0, carry = 0, lastStep = 0;
  const measure = () => {
    const range = Math.max(1, root.scrollHeight - window.innerHeight);
    goal = Math.min(1, window.scrollY / range);
  };
  // the water's depth follows the scroll with drag (~220ms), so a flick of the wheel never snaps the light
  const update = (now) => {
    frame = null;
    measure();
    const dt = lastStep ? Math.min(64, now - lastStep) : 16.7;
    lastStep = now;
    depth = prefersReducedMotion.matches ? goal : depth + (goal - depth) * (1 - Math.exp(-dt / 220));
    if (Math.abs(goal - depth) < 0.0008) depth = goal;
    root.style.setProperty("--sea-depth", depth.toFixed(3));
    if (depth !== goal && !document.hidden) frame = requestAnimationFrame(update);
    else lastStep = 0;
  };
  const request = () => { if (frame === null) frame = requestAnimationFrame(update); };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) request(); });
  measure();
  depth = goal;
  root.style.setProperty("--sea-depth", depth.toFixed(3));

  const arrival = seaCamera.arrival;
  if (arrival && Number.isFinite(arrival.darkness) && !prefersReducedMotion.matches) {
    const start = arrival.darkness - floor;
    const began = performance.now();
    const settle = (now) => {
      const t = Math.min(1, (now - began) / 2400);
      carry = start * (1 - t) ** 3;
      layer.style.setProperty("--sea-carry", carry.toFixed(3));
      if (t < 1) requestAnimationFrame(settle);
    };
    layer.style.setProperty("--sea-carry", start.toFixed(3));
    requestAnimationFrame(settle);
  }
  // hand the water's darkness (page depth, scroll depth, any carry still settling) to the next page
  document.addEventListener("portal:leave", (event) => {
    const camera = event.detail?.camera;
    if (camera) camera.darkness = floor + depth * 0.55 + carry;
  });
};

// Magnetic nav: small targets lean toward a nearby cursor and spring back when it leaves.
// Uses the independent `translate` property so it never fights transforms set elsewhere.
const initMagneticNav = () => {
  if (prefersReducedMotion.matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const items = [...document.querySelectorAll(".home-nav__brand, .home-nav__links:not(.ripple-menu__panel) a, .ripple-menu__toggle, .work-contact__heading a, .experience-next a, [data-magnetic]")]
    .map((element) => ({ element, x: 0, y: 0, tx: 0, ty: 0, pull: element.matches(".work-contact__heading a, .experience-next a, [data-magnetic]") ? 0.12 : 0.28 }));
  if (!items.length) return;
  let frame = null;
  const step = () => {
    frame = null;
    let moving = false;
    items.forEach((item) => {
      item.x += (item.tx - item.x) * 0.18;
      item.y += (item.ty - item.y) * 0.18;
      if (Math.abs(item.tx - item.x) > 0.05 || Math.abs(item.ty - item.y) > 0.05) moving = true;
      else { item.x = item.tx; item.y = item.ty; }
      item.element.style.translate = item.x || item.y ? item.x.toFixed(2) + "px " + item.y.toFixed(2) + "px" : "";
    });
    if (moving && !document.hidden) frame = requestAnimationFrame(step);
  };
  const wake = () => { if (frame === null) frame = requestAnimationFrame(step); };
  items.forEach((item) => {
    item.element.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const box = item.element.getBoundingClientRect();
      item.tx = (event.clientX - (box.left + box.width / 2)) * item.pull;
      item.ty = (event.clientY - (box.top + box.height / 2)) * item.pull * 1.2;
      wake();
    });
    item.element.addEventListener("pointerleave", () => { item.tx = 0; item.ty = 0; wake(); });
  });
};

// One light line under the inner-page nav: it rests under the current page, glides to whichever
// link is hovered or focused, and glides back when the pointer or focus leaves.
const initNavIndicator = () => {
  const list = document.querySelector(".home-nav__links:not(.ripple-menu__panel)");
  if (!list) return;
  const links = [...list.querySelectorAll("a")];
  const current = list.querySelector('a[aria-current="page"]');
  const line = document.createElement("li");
  line.className = "nav-current";
  line.setAttribute("aria-hidden", "true");
  list.appendChild(line);
  list.classList.add("has-indicator");
  // layout offsets, not client rects: the header may be mid-portal (transformed) when this runs
  const moveTo = (link) => {
    if (!link) { line.style.opacity = "0"; return; }
    const left = offsetWithin(link, list, "offsetLeft"), top = offsetWithin(link, list, "offsetTop");
    line.style.opacity = "1";
    line.style.width = link.offsetWidth + "px";
    line.style.transform = "translate(" + left + "px, " + (top + link.offsetHeight - 6) + "px)";
  };
  // place it without a glide on load, then let it move
  line.style.transition = "none";
  moveTo(current);
  requestAnimationFrame(() => requestAnimationFrame(() => { line.style.transition = ""; }));
  links.forEach((link) => {
    link.addEventListener("pointerenter", () => moveTo(link));
    link.addEventListener("focus", () => moveTo(link));
  });
  list.addEventListener("pointerleave", () => moveTo(current));
  list.addEventListener("focusout", (event) => { if (!list.contains(event.relatedTarget)) moveTo(current); });
  window.addEventListener("resize", () => moveTo(current), { passive: true });
  document.fonts?.ready.then(() => moveTo(current));
};

// Experience: a thread of light runs down beside the archive. It fills as the visitor descends,
// and each section's marker lights up as the light reaches it, like milestones passing in the deep.
const initExperienceJourney = () => {
  const main = document.querySelector(".experience-main");
  const sections = [...document.querySelectorAll(".experience-section")];
  if (!main || !sections.length) return;
  const journey = document.createElement("div");
  journey.className = "experience-journey";
  journey.setAttribute("aria-hidden", "true");
  journey.innerHTML = '<span class="experience-journey__fill"></span><span class="experience-journey__lantern"></span>';
  const markers = sections.map(() => {
    const marker = document.createElement("span");
    marker.className = "experience-journey__marker";
    journey.appendChild(marker);
    return marker;
  });
  main.appendChild(journey);
  let top = 0, height = 1, stops = [], frame = null;

  const headingOf = (section) => section.querySelector(".experience-section__heading") || section;
  // layout offsets (transform-free), since content may still be surfacing from the portal
  const layout = () => {
    const first = headingOf(sections[0]);
    const last = sections[sections.length - 1];
    const firstLeft = offsetWithin(first, main, "offsetLeft");
    top = offsetWithin(first, main, "offsetTop");
    height = Math.max(1, offsetWithin(last, main, "offsetTop") + last.offsetHeight - top);
    // sits in the gutter just left of the content edge
    const left = Math.max(8, firstLeft - Math.min(36, firstLeft * 0.5));
    journey.style.top = top + "px";
    journey.style.height = height + "px";
    journey.style.left = left.toFixed(1) + "px";
    stops = sections.map((section, index) => {
      const offset = offsetWithin(headingOf(section), main, "offsetTop") - top + 8;
      markers[index].style.top = offset + "px";
      return offset / height;
    });
    update();
  };
  const update = () => {
    frame = null;
    const mainTop = main.getBoundingClientRect().top;
    // the light's leading edge sits a little below the middle of the screen
    const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - mainTop - top) / height));
    journey.style.setProperty("--journey", progress.toFixed(4));
    stops.forEach((stop, index) => {
      const reached = progress >= stop;
      markers[index].classList.toggle("is-reached", reached);
      sections[index].classList.toggle("is-reached", reached);
    });
  };
  const request = () => { if (frame === null) frame = requestAnimationFrame(update); };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(layout), { passive: true });
  document.fonts?.ready.then(layout);
  layout();
};

// Contact: rows answer a press with a ripple from the touch point and carry a soft cyan light
// under the pointer (or centred, for keyboard focus).
const initContactRipples = () => {
  const rows = document.querySelectorAll(".contact-row, [data-ripple]");
  if (!rows.length) return;
  rows.forEach((row) => {
    row.addEventListener("pointermove", (event) => {
      const box = row.getBoundingClientRect();
      row.style.setProperty("--light-x", (event.clientX - box.left).toFixed(0) + "px");
      row.style.setProperty("--light-y", (event.clientY - box.top).toFixed(0) + "px");
    }, { passive: true });
    row.addEventListener("focus", () => {
      row.style.setProperty("--light-x", "50%");
      row.style.setProperty("--light-y", "50%");
    });
    if (prefersReducedMotion.matches) return;
    row.addEventListener("pointerdown", (event) => {
      const box = row.getBoundingClientRect();
      const ring = document.createElement("span");
      ring.className = "contact-ripple";
      ring.setAttribute("aria-hidden", "true");
      ring.style.left = (event.clientX - box.left) + "px";
      ring.style.top = (event.clientY - box.top) + "px";
      ring.style.setProperty("--ripple-size", (Math.hypot(box.width, box.height) * 0.9).toFixed(0) + "px");
      row.appendChild(ring);
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      // fallback if the animation never ends (row hidden, page frozen mid-ripple)
      window.setTimeout(() => ring.remove(), 1400);
    });
  });
};

const initEditorialHeroEffect = () => {
  const canvas = document.querySelector(".editorial-hero-effect[data-hero-effect]");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const mode = canvas.dataset.heroEffect;
  const reduced = prefersReducedMotion.matches;
  let w = 0, h = 0, frame = null, previous = 0, time = 0, visible = true;
  let x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, pointerId = null, lastInput = -Infinity, coast = 0;
  // Light reaching this depth (Work is shallowest, Contact the deep end). Arriving through the portal,
  // the same water carries on: its clock continues, the light starts where it was, and the light level
  // eases from the last space's to this one's instead of switching.
  const reachTarget = seaLevel?.reach ?? 0.72;
  let reachFrom = reachTarget, reachSince = 0, reachNow = reachTarget;
  const arrival = reduced ? null : seaCamera.arrival;
  if (arrival) {
    if (Number.isFinite(arrival.time)) time = arrival.time + Math.min(8, (Date.now() - arrival.at) / 1000);
    if (Number.isFinite(arrival.reach)) { reachFrom = arrival.reach; reachSince = performance.now(); }
  }

  const resize = () => {
    // dark theme pins the canvas behind the whole page (CSS); then it fills the viewport, not the hero
    fixed = getComputedStyle(canvas).position === "fixed";
    w = fixed ? window.innerWidth : hero.clientWidth; h = fixed ? window.innerHeight : hero.clientHeight;
    deepTime = -1;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 1.5);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!x && !y) {
      // the light pool starts where it was on the previous page and holds there briefly before drifting
      const carried = arrival && Number.isFinite(arrival.px) ? arrival : null;
      x = tx = w * (carried ? carried.px : 0.52); y = ty = h * (carried ? carried.py : 0.48);
      if (carried) lastInput = performance.now();
    }
    wake();
  };
  const pull = (px, py, radius, strength) => {
    const dx = x - px, dy = y - py, distance = Math.hypot(dx, dy);
    const amount = distance < radius ? (1 - distance / radius) ** 2 * strength : 0;
    return [dx * amount, dy * amount];
  };
  // Every inner page sits below Home in the same water: one caustic web, dimmer the deeper the page,
  // fading with depth and lit from the top left. Work is shallowest, Contact the deep end.
  const deep = document.createElement("canvas");
  const deepCtx = deep.getContext("2d");
  let deepImage = null, deepTime = -1, fixed = false;
  let warpStart = null, warpDuration = 1;
  // About opens with a descent: the light web streams up past the camera for ~2.4s as it sinks into the page
  let descentStart = mode === "about" && !reduced ? performance.now() : 0;
  const DESCENT_MS = 2400;
  document.addEventListener("portal:leave", (event) => {
    // hand the water's state to the next page (see seaCamera)
    const camera = event.detail?.camera;
    if (camera) Object.assign(camera, { time, px: w ? x / w : 0.52, py: h ? y / h : 0.48, reach: reachNow });
    if (reduced) return;
    warpStart = performance.now();
    warpDuration = event.detail?.duration || 900;
    wake();
  });
  document.addEventListener("portal:return", () => { warpStart = null; deepTime = -1; wake(); });
  // Water colour. About and Contact use the MON WALLET ocean: a bluer, more luminous teal
  // (#041C24 floor rising to #073642, light web toward #65D6DF); the other pages keep the original deep.
  const tint = SEA_TINT[mode] || SEA_TINT.deep;
  // cell size adapts to how long the per-pixel pass takes on this device
  const detail = adaptiveDetail(3, 5, 9);
  let DEEP_CELL = detail.cell;
  const drawDeep = () => {
    const cols = Math.max(2, Math.ceil(w / DEEP_CELL)), rows = Math.max(2, Math.ceil(h / DEEP_CELL));
    if (deep.width !== cols || deep.height !== rows) {
      deep.width = cols; deep.height = rows; deepImage = deepCtx.createImageData(cols, rows); deepTime = -1;
    }
    const out = deepImage.data, t = time * 0.35;
    // arriving from another depth: the light level eases over ~2.4s from the last space's to this one's
    const blend = reachSince ? Math.min(1, (performance.now() - reachSince) / 2400) : 1;
    reachNow = reachFrom + (reachTarget - reachFrom) * (1 - (1 - blend) ** 3);
    if (blend === 1) reachSince = 0;
    const reach = reachNow;
    // portal: while the page is leaving, the water swells into slow, broad refraction bands
    const warpT = warpStart === null ? 0 : Math.min(1, (performance.now() - warpStart) / warpDuration);
    const warp = warpT * warpT * (3 - 2 * warpT);
    // ~24fps for the per-pixel pass; in between, reuse the last frame
    const descentT = descentStart ? Math.min(1, (performance.now() - descentStart) / DESCENT_MS) : 1;
    if (descentT === 1) descentStart = 0;
    if (Math.abs(time - deepTime) < 0.042 && deepTime >= 0 && !warp) {
      ctx.drawImage(deep, 0, 0, cols * DEEP_CELL, rows * DEEP_CELL);
      return;
    }
    deepTime = time;
    const passStart = performance.now();
    // scrolling down the page sinks deeper: less light reaches the water
    const sink = fixed ? Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - h)) : 0;
    const fall = Math.max(reach, tint.reachMin || 0) * (1 - sink * 0.6);
    // the light web drifts up at a quarter of the scroll speed (parallax behind the content)
    const descent = (1 - descentT) ** 3 * -h * 0.6;
    const drift = (fixed ? window.scrollY * 0.25 : 0) + descent;
    // deeper water diffuses the web: lines lose contrast and spread into an even glow
    const sharp = 1 - sink * 0.55, diffuse = sink * 0.09;
    // light gathered under the pointer: a soft pool, falling off with distance
    // beyond 1.8 radii the pool adds under 4% light, so those pixels skip the exp()
    const spotRadius = Math.max(w, h) * 0.22, spotReach = spotRadius * 1.8;
    const spotGain = reduced ? 0 : 0.32 * (1 - sink * 0.4);
    for (let row = 0, i = 0; row < rows; row += 1) {
      const py = row * DEEP_CELL, depth = row / rows;
      const sy = py - y;
      for (let col = 0; col < cols; col += 1, i += 4) {
        let px = col * DEEP_CELL;
        const sx = px - x;
        const near = spotGain > 0 && Math.abs(sx) < spotReach && Math.abs(sy) < spotReach;
        const spot = near ? Math.exp(-(sx * sx + sy * sy) / (spotRadius * spotRadius)) * spotGain : 0;
        // pointer stirs the water a little
        const bend = pull(px, py, 220, pointerId === null ? tint.stir || 0.04 : 0.1);
        px += bend[0]; let qy = py + bend[1] + drift;
        // the light web is seen through moving water: slow, broad bending a few pixels either way
        px += Math.sin(py * 0.0085 + time * 0.6) * 3.5 + Math.sin((py + px) * 0.0041 - time * 0.37) * 2.5;
        qy += Math.cos(px * 0.0071 - time * 0.5) * 3;
        if (warp) {
          px += Math.sin(py * 0.011 + time * 3.1) * 34 * warp;
          qy += Math.cos(px * 0.009 + time * 2.3) * 26 * warp;
        }
        const lightFall = Math.max(0, 1 - (px / w) * 0.45 - depth * 0.85) * fall + spot * reach;
        const web = poolCaustic(px * 0.8, qy * 0.8, t);
        const c = (web * sharp + diffuse) * lightFall * 0.55 * tint.gain;
        // floor rising toward the lit water where the light reaches, caustics toward the glow (see SEA_TINT)
        out[i] = tint.floor[0] + tint.rise[0] * (1 - depth) * lightFall + c * tint.web[0];
        out[i + 1] = tint.floor[1] + tint.rise[1] * (1 - depth) * lightFall * (1 - sink * 0.3) + c * tint.web[1] * (1 - sink * 0.15);
        out[i + 2] = tint.floor[2] + tint.rise[2] * (1 - depth) * lightFall * (1 - sink * 0.2) + c * tint.web[2];
        out[i + 3] = 255;
      }
    }
    deepCtx.putImageData(deepImage, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(deep, 0, 0, cols * DEEP_CELL, rows * DEEP_CELL);
    // next pass resizes the buffer itself when the cell changes
    if (detail.sample(performance.now() - passStart)) DEEP_CELL = detail.cell;
  };

  // the same shafts as Home: this space sits deeper (less reach), and scrolling down sinks further
  const shaft = document.createElement("canvas");
  let shafts = null, shaftTime = -1, shaftWidth = 0, shaftScroll = -1;
  const render = () => {
    ctx.clearRect(0, 0, w, h);
    drawDeep();
    // repainted at the deep pass's ~24fps; in between, the last shafts are reused
    if (shaftTime < 0 || Math.abs(time - shaftTime) >= 0.042 || shaftWidth !== w ||
      (fixed && Math.abs(window.scrollY - shaftScroll) > 24)) {
      const sink = fixed ? Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - h)) : 0;
      shafts = paintLightShafts(shaft, w, h, time, SEA_LIGHT, (1 - reachNow) + sink * 0.45);
      shaftTime = time;
      shaftWidth = w;
      shaftScroll = window.scrollY;
    }
    if (shafts) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(shafts, 0, 0, w, h);
      ctx.restore();
    }
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
    const rect = canvas.getBoundingClientRect(); tx =Math.max(0, Math.min(w, event.clientX - rect.left)); ty = Math.max(0, Math.min(h, event.clientY - rect.top));
    lastInput = performance.now(); wake();
  };
  if (!reduced) {
    // the canvas is pinned behind the whole page, so the light follows the pointer anywhere on it
    window.addEventListener("pointermove", (event) => { if (pointerId === null || pointerId === event.pointerId) position(event); }, { passive: true });
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
  }, { threshold: 0 }).observe(canvas);
  window.addEventListener("resize", resize, { passive: true }); resize(); render();
  // under reduced motion the loop is idle, so redraw the still frame at the new depth
  window.addEventListener("scroll", () => { if (reduced && fixed) { deepTime = -1; render(); } }, { passive: true });
  // a theme switch moves the canvas between hero and page background
  new MutationObserver(resize).observe(document.body, { attributes: true, attributeFilter: ["class"] });
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
  // the surface the dive broke through is still overhead, receding upward as the camera sinks on
  const surface = document.createElement("div");
  surface.className = "pool-dive__surface";
  veil.appendChild(surface);
  surface.animate([
    { opacity: 0.8, transform: "translate3d(0, 0, 0) scale(1, 1)" },
    { opacity: 0, transform: "translate3d(0, -38%, 0) scale(0.85, 0.7)" }
  ], { duration: 1100, easing: ease, fill: "forwards" });
  // the refraction from the break carries on through the hero under the clearing veil, then calms
  // (the veil's own blur animation owns its filter, so only the hero bends)
  bendThrough([homeHero], 1200, (t) => 10 * (1 - t) * (1 - t));

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
  homeHero.querySelectorAll(".home-portal, .home-portal__line").forEach((element) => {
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

// Home: wheel, swipe and keys drive a camera dive through the portal, deeper into the pool.
const initHomeDive = () => {
  if (!homeHero) return;
  const stage = homeHero.querySelector(".home-hero__canvas");
  const field = homeHero.querySelector(".home-hero__field");
  const nav = homeHero.querySelector(".home-dive");
  if (!stage || !nav) return;
  const doors = Array.from(nav.querySelectorAll(".home-dive__door"));
  const menuToggle = document.querySelector(".ripple-menu__toggle");
  const menuOpen = () => menuToggle?.getAttribute("aria-expanded") === "true";
  // an open menu or a page transition already leaving owns the input; the dive must not move under it
  const transition = document.querySelector(".page-transition");
  const blocked = () => menuOpen() || Boolean(transition?.classList.contains("is-entering"));
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  let target = 0, current = 0, velocity = 0, frame = null, last = 0, touchY = null;
  // after 5s untouched at the surface, the camera starts the same dive on its own
  let auto = false, idle = null;
  // The camera has weight in water: a spring pulls it toward the target, slightly overdamped so it
  // accelerates away, glides and settles without overshooting. Speed is capped (dive progress per
  // second) and a burst of wheel input can only lead the camera so far, so fast scrolling never lurches.
  const STIFFNESS = 40;
  const DAMPING = 2 * Math.sqrt(STIFFNESS) * 1.08;
  const MAX_SPEED = 1.7;
  const MAX_LEAD = 0.42;

  const render = (p, speed = 0) => {
    const still = prefersReducedMotion.matches;
    homeDiveDepth = p;
    // camera swims into the portal: the stage zooms on the portal's centre (its transform-origin, CSS),
    // the opening fills the view, and the camera passes through into the deeper water
    const a = smooth(0, 0.66, p);
    const zoom = still ? 1 : 1 + a * a * 5;
    // the lens pitches a little into its own motion, and levels out as the camera slows
    const pitch = still || zoom === 1 ? 0 : Math.max(-1, Math.min(1, speed / MAX_SPEED)) * 4;
    stage.style.transform = zoom === 1 ? "" : "perspective(1400px) rotateX(" + pitch.toFixed(2) + "deg) scale(" + zoom.toFixed(4) + ")";
    stage.style.opacity = (1 - smooth(0.42, 0.66, p)).toFixed(3);
    stage.style.filter = !still && p > 0.3 ? "blur(" + (smooth(0.3, 0.66, p) * 10).toFixed(2) + "px)" : "";
    // the pool moves slower than the portal (parallax) and darkens as the light from the surface falls off;
    // it trails the camera slightly, as if dragged through the water
    if (field) {
      const drag = still ? 0 : Math.max(-1, Math.min(1, speed / MAX_SPEED)) * -1.6;
      field.style.transform = still || p === 0 ? "" : "translate3d(0, " + drag.toFixed(2) + "vh, 0) scale(" + (1 + p * 0.45).toFixed(4) + ")";
      field.style.filter = p === 0 ? "" : "brightness(" + (1 - p * 0.45).toFixed(3) + ") saturate(" + (1 + p * 0.2).toFixed(3) + ")";
    }
    doors.forEach((door, k) => {
      const d = smooth(0.46 + k * 0.07, Math.min(1, 0.94 + k * 0.06), p);
      const side = k === 0 ? -1 : 1;
      const z = still ? 0 : (1 - d) * -1800;
      const turn = -side * (10 + (1 - d) * 22);
      door.style.transform = "translate3d(0, " + ((1 - d) * -4).toFixed(2) + "vh, " + z.toFixed(1) + "px) rotateY(" + turn.toFixed(2) + "deg)";
      door.style.opacity = Math.pow(d, 1.2).toFixed(3);
    });
    nav.classList.toggle("is-open", p >= 0.75);
    homeHero.classList.toggle("is-diving", p > 0.001);
  };

  const step = (now) => {
    frame = null;
    const prevNow = last;
    const dt = last ? Math.min(64, now - last) : 16.7;
    last = now;
    // the automatic dive walks its target down slowly so the camera eases in rather than lunging
    // it advances on wall-clock time (not the 64ms-capped step) so slow devices still arrive in ~2.6s
    if (auto) target = Math.min(1, target + (prevNow ? Math.min(250, now - prevNow) : 16.7) / 2600);
    // integrate the spring in ~8ms substeps so a slow frame never destabilises it
    const steps = Math.max(1, Math.ceil(dt / 8));
    const h = dt / 1000 / steps;
    for (let s = 0; s < steps; s += 1) {
      velocity += (STIFFNESS * (target - current) - DAMPING * velocity) * h;
      velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
      current += velocity * h;
    }
    if (current <= 0 || current >= 1) {
      current = Math.min(1, Math.max(0, current));
      velocity = 0;
    }
    if (Math.abs(target - current) < 0.0006 && Math.abs(velocity) < 0.004) {
      current = target;
      velocity = 0;
    }
    render(current, velocity);
    if (auto && current === 1) auto = false;
    if ((current !== target || auto) && !document.hidden) frame = requestAnimationFrame(step);
    else {
      last = 0;
      if (current === 0 && target === 0) arm();
    }
  };
  const arm = () => {
    clearTimeout(idle);
    idle = null;
    if (auto || target !== 0 || current !== 0) return;
    idle = setTimeout(() => {
      idle = null;
      if (document.hidden || blocked() || target !== 0 || current !== 0) return arm();
      if (prefersReducedMotion.matches) return go(1);
      auto = true;
      if (frame === null) frame = requestAnimationFrame(step);
    }, 5000);
  };
  const go = (value) => {
    // any manual move takes over from the automatic dive
    auto = false;
    clearTimeout(idle);
    idle = null;
    target = Math.min(1, Math.max(0, value));
    if (prefersReducedMotion.matches) {
      // no camera move: snap between the two states
      target = current = target >= 0.5 ? 1 : 0;
      velocity = 0;
      render(current);
      if (current === 0) arm();
      return;
    }
    if (frame === null && !document.hidden) frame = requestAnimationFrame(step);
  };
  const nudge = (amount) => {
    if (prefersReducedMotion.matches) go(amount > 0 ? 1 : 0);
    // reversing acts at once (the lead is measured from where the camera is, not where it was headed)
    else go(Math.max(current - MAX_LEAD, Math.min(current + MAX_LEAD, target + amount)));
  };

  window.addEventListener("wheel", (event) => {
    if (blocked()) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    nudge((event.deltaY * unit) / 1600);
  }, { passive: false });

  window.addEventListener("touchstart", (event) => {
    touchY = event.touches[0] ? event.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener("touchmove", (event) => {
    if (blocked() || touchY === null || !event.touches[0]) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    if (prefersReducedMotion.matches && Math.abs(delta) < 6) return;
    nudge(delta / (window.innerHeight * 0.9));
  }, { passive: false });
  window.addEventListener("touchend", () => { touchY = null; }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (blocked() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest?.("button, input, textarea, select, [contenteditable]")) return;
    const moves = { ArrowDown: 0.2, PageDown: 0.4, " ": 0.4, ArrowUp: -0.2, PageUp: -0.4 };
    if (event.key in moves) nudge(event.shiftKey && event.key === " " ? -0.4 : moves[event.key]);
    else if (event.key === "End") go(1);
    else if (event.key === "Home" || event.key === "Escape") go(0);
    else return;
    event.preventDefault();
  });

  // tabbing to a destination dives straight to it
  doors.forEach((door) => door.addEventListener("focus", () => { if (target < 1) go(1); }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (auto) { if (frame === null) frame = requestAnimationFrame(step); }
    else if (current !== target) go(target);
    else arm();
  });
  prefersReducedMotion.addEventListener("change", () => go(target));
  // activity restarts the countdown; arm() ignores it unless the camera is resting at the surface
  ["pointermove", "pointerdown", "wheel", "touchstart", "keydown", "scroll"].forEach((type) => {
    window.addEventListener(type, arm, { passive: true });
  });
  window.addEventListener("pagehide", () => clearTimeout(idle));
  // back/forward cache restores the page frozen; restart the countdown if it came back at the surface
  window.addEventListener("pageshow", (event) => { if (event.persisted) arm(); });
  // Camera hand-off: leaving through a door after the dive, the next space inherits how dark the
  // pool had become. Surfacing back to Home from a deeper page, the pool starts as dark as the water
  // just left and lightens (the dive's own filter takes over once that settles).
  document.addEventListener("portal:leave", (event) => {
    const camera = event.detail?.camera;
    if (!camera) return;
    camera.darkness = current * 0.45;
    camera.reach = 1 - current * 0.45;
  });
  const arrival = seaCamera.arrival;
  if (arrival && field?.animate && !prefersReducedMotion.matches && arrival.darkness > 0.02) {
    field.animate([
      { filter: "brightness(" + Math.max(0.1, 1 - arrival.darkness).toFixed(3) + ")" },
      { filter: "brightness(1)" }
    ], { duration: 2400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }
  render(0);
  arm();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
    initPortfolioIntro();
    initHomeHeroPointer();
    initHomeDiveReveal();
    initHomeDive();
    initRippleMenu();
    initEditorialHeroEffect();
    initHomeWorkPreview();
    initWorkFilters();
    initProjectSpotlight();
    initSeaDepth();
    initMagneticNav();
    initNavIndicator();
    initExperienceJourney();
    initContactRipples();
    initDepthTypography();
    initDepthImages();
    initAboutStory();
    initReadingHighlight();
    initRevealAnimations();
  });
} else {
  initPageTransitions();
  initPortfolioIntro();
  initHomeHeroPointer();
  initHomeDiveReveal();
  initHomeDive();
  initRippleMenu();
  initEditorialHeroEffect();
  initHomeWorkPreview();
  initWorkFilters();
  initProjectSpotlight();
  initSeaDepth();
  initMagneticNav();
  initNavIndicator();
  initExperienceJourney();
  initContactRipples();
  initDepthTypography();
  initDepthImages();
  initAboutStory();
  initReadingHighlight();
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

// offsetLeft/offsetTop of `element` measured from `ancestor`, walking offsetParents (ignores transforms).
function offsetWithin(element, ancestor, axis) {
  let total = 0;
  for (let node = element; node && node !== ancestor; node = node.offsetParent) {
    total += node[axis];
    if (node.offsetParent === null) break;
  }
  return total;
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

// Crossing the surface: one SVG refraction (slow fractal noise displacing whatever is drawn through it),
// shared by the index dive and the home arrival so the bend carries on across the page change.
// bendThrough(elements, duration, strength) bends the elements for `duration` ms, strength(t) -> px.
function bendThrough(elements, duration, strength) {
  const ns = "http://www.w3.org/2000/svg";
  let svg = document.getElementById("surface-refraction");
  if (!svg) {
    svg = document.createElementNS(ns, "svg");
    svg.id = "surface-refraction";
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.innerHTML = '<filter id="surface-refract" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="2" seed="7"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(svg);
  }
  const noise = svg.querySelector("feTurbulence");
  const map = svg.querySelector("feDisplacementMap");
  const targets = elements.filter(Boolean);
  if (!noise || !map || !targets.length) return;
  const previous = targets.map((element) => element.style.filter);
  targets.forEach((element) => { element.style.filter = "url(#surface-refract)"; });
  const began = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - began) / duration);
    map.setAttribute("scale", Math.max(0, strength(t)).toFixed(1));
    // the pattern morphs rather than slides, like a surface settling overhead
    noise.setAttribute("baseFrequency", (0.006 + Math.sin(now * 0.0011) * 0.0012).toFixed(4) + " " +
      (0.011 + Math.cos(now * 0.0008) * 0.002).toFixed(4));
    if (t < 1) requestAnimationFrame(step);
    else targets.forEach((element, k) => { element.style.filter = previous[k]; });
  };
  requestAnimationFrame(step);
}

// Light shafts from the surface, top left: a few soft beams leaning down to the right that sway and
// breathe with the water. The same surface noise that draws the caustics streaks each beam along its
// length (follow a ray back up and it left a brighter or dimmer patch of surface), and the water itself
// scatters a faint haze toward the light. `depth` (0 surface .. 1 deep end) absorbs the light, shortens
// the beams and diffuses them, identically on every page. Painted write-only at a tenth of the size
// and scaled up by the caller, so edges blur for free. Returns the scratch canvas, or null when dark.
function paintLightShafts(scratch, width, height, t, strength, depth = 0) {
  const deep = Math.min(1, Math.max(0, depth));
  const light = strength * Math.exp(-deep * 1.8);
  if (light <= 0.002 || !width || !height) return null;
  const sw = Math.max(8, Math.ceil(width / 10));
  const sh = Math.max(8, Math.ceil(height / 10));
  if (scratch.width !== sw || scratch.height !== sh) {
    scratch.width = sw;
    scratch.height = sh;
  }
  const c = scratch.getContext("2d");
  if (!c) return null;
  let image = shaftImages.get(scratch);
  if (!image || image.width !== sw || image.height !== sh) {
    image = c.createImageData(sw, sh);
    shaftImages.set(scratch, image);
  }
  const out = image.data;
  const slant = 0.42;
  const beams = [];
  for (let k = 0; k < 6; k += 1) {
    const seed = k * 7.31;
    const beam = sw * (0.025 + poolHash(k, 9) * 0.035);
    const length = sh * (0.7 + poolHash(k, 2) * 0.35) * (1 - deep * 0.4);
    beams.push({
      seed,
      x0: (-0.12 + k * 0.17 + (poolHash(k, 3) - 0.5) * 0.08 + (poolValueNoise(seed, t * 0.16) - 0.5) * 0.06) * sw,
      beam,
      // deeper water spreads each beam wider and softer
      spread: beam * (0.9 + poolHash(k, 5) * 0.7) * (1 + deep * 0.8),
      length,
      lean: length * slant,
      // each beam brightens and dims as the surface overhead focuses it; farther from the light, dimmer
      alpha: light * (0.3 + poolValueNoise(seed + 11, t * 0.32) * 0.7) * (0.5 + poolHash(k, 1) * 0.5) * (1 - k * 0.09)
    });
  }
  // deeper light loses its red first
  const red = 170 - deep * 60, green = 236 - deep * 30, blue = 232;
  const scale = width / sw;
  const haze = light * 0.2, hazeReach = Math.hypot(sw, sh) * 0.45;
  for (let y = 0, i = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1, i += 4) {
      // in-scattering: the water glows faintly toward the light, falling off with distance from it
      let v = haze * Math.exp(-Math.hypot(x, y * 1.4) / hazeReach);
      for (let k = 0; k < beams.length; k += 1) {
        const b = beams[k];
        if (y >= b.length) continue;
        const along = y / b.length;
        const half = b.beam * 0.5 + b.spread * along;
        const d = (x - (b.x0 + b.beam * 0.5 + b.lean * along)) / half;
        if (d <= -1 || d >= 1) continue;
        const origin = (x - b.lean * along) * scale;
        const streak = Math.min(1.6, Math.max(0.2, 0.5 + (poolFbm(origin * 0.6, b.seed * 40, t * 0.5) - 0.5) * 2.4));
        // soft across the beam; absorbed and spread thinner the farther it travels
        v += b.alpha * (1 - d * d) * Math.exp(-along * 2.6) * (1 - along) * streak;
      }
      out[i] = red;
      out[i + 1] = green;
      out[i + 2] = blue;
      out[i + 3] = Math.min(255, v * 255);
    }
  }
  c.putImageData(image, 0, 0);
  return scratch;
}

// Adaptive detail for a per-pixel water pass: times each pass and coarsens the cell size when passes run
// over budget, refines it again with plenty of headroom. Low-power devices start one step coarser.
function adaptiveDetail(base, max, budget) {
  let cell = Math.min(max, base + (lowPowerDevice ? 1 : 0)), average = budget * 0.6, samples = 0;
  return {
    get cell() { return cell; },
    // true when the cell size changed and the caller must rebuild at the new size
    sample(ms) {
      average += (ms - average) * 0.1;
      samples += 1;
      if (samples < 30) return false;
      const next = average > budget ? cell + 1 : average < budget * 0.35 ? cell - 1 : cell;
      if (next === cell || next < base || next > max) return false;
      cell = next;
      samples = 0;
      average = budget * 0.6;
      return true;
    }
  };
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
  let frameImage = null;
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
    const c = base.getContext('2d', { willReadFrequently: true });
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
    // one output buffer per size, reused every frame instead of a fresh w*h allocation
    if (!frameImage || frameImage.width !== w || frameImage.height !== h) frameImage = ctx.createImageData(w, h);
    const out = frameImage;
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

    // passing through the surface: the whole view bends, hardest at the break, and is still bending
    // when home.html takes over (initHomeDiveReveal starts from the same strength)
    const smoothIn = (a, b, x) => {
      const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    bendThrough([intro], DIVE, (t) => t < 0.5
      ? 26 * smoothIn(0.22, 0.5, t)
      : 10 + 16 * (1 - smoothIn(0.5, 1, t)));

    // underwater layer: fades in after the break, with a few fine bubbles rising past
    const under = document.createElement('div');
    under.className = 'pool-dive';
    under.setAttribute('aria-hidden', 'true');
    // the underside of the surface, seen from just below: a bright, bent sheet the camera sinks away from
    const surface = document.createElement('div');
    surface.className = 'pool-dive__surface';
    under.appendChild(surface);
    if (surface.animate) {
      surface.animate([
        { opacity: 0, transform: 'translate3d(0, 22%, 0) scale(1.5, 1.8)', offset: 0 },
        { opacity: 0, transform: 'translate3d(0, 22%, 0) scale(1.5, 1.8)', offset: 0.46 },
        { opacity: 1, transform: 'translate3d(0, 6%, 0) scale(1.2, 1.25)', offset: 0.62 },
        { opacity: 0.8, transform: 'translate3d(0, 0, 0) scale(1, 1)', offset: 1 }
      ], { duration: DIVE, easing: ease, fill: 'forwards' });
    }
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
