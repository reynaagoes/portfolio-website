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

const fixedDarkPages = new Set(["home", "about", "contact", "intro"]);
applyTheme(document.body.dataset.page === "projects" ? "light" :
  (fixedDarkPages.has(document.body.dataset.page) ? "dark" : (savedTheme === "light" ? "light" : "dark")));
setActiveNav();

const initPageTransitions = () => {
  const routes = new Set(["home.html", "projects.html", "about.html", "contact.html"]);
  const currentRoute = window.location.pathname.split("/").pop() || "index.html";
  if (!routes.has(currentRoute)) return;

  const overlay = document.createElement("div");
  overlay.className = "page-transition";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  let isTransitioning = false;
  let skipEntry = false;
  try {
    skipEntry = sessionStorage.getItem("skip-page-transition-entry") === "1";
    sessionStorage.removeItem("skip-page-transition-entry");
  } catch (error) {
    skipEntry = false;
  }

  if (prefersReducedMotion.matches || skipEntry) {
    overlay.classList.add("is-idle");
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add("is-revealing");
      window.setTimeout(() => {
        overlay.className = "page-transition is-idle";
      }, 680);
    }));
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const destination = new URL(link.href, window.location.href);
    const destinationRoute = destination.pathname.split("/").pop();
    if (destination.origin !== window.location.origin || !routes.has(destinationRoute)) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    if (isTransitioning) return;
    isTransitioning = true;
    if (prefersReducedMotion.matches) {
      window.location.href = destination.href;
      return;
    }
    overlay.className = "page-transition is-idle";
    void overlay.offsetHeight;
    requestAnimationFrame(() => overlay.className = "page-transition is-covering");
    window.setTimeout(() => {
      window.location.href = destination.href;
    }, 620);
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
  const count = portfolioIntro.querySelector(".portfolio-intro__count");
  const startedAt = performance.now();
  const duration = prefersReducedMotion.matches ? 500 : 1100;

  const updateCount = (now) => {
    const value = Math.min(100, Math.round(((now - startedAt) / duration) * 100));
    count.textContent = String(value).padStart(2, "0");
    if (value < 100) window.requestAnimationFrame(updateCount);
  };

  window.requestAnimationFrame(updateCount);
  window.setTimeout(() => portfolioIntro.classList.add("is-entering"), duration + 100);
  window.setTimeout(() => portfolioIntro.classList.add("is-leaving"), duration + 700);
  window.setTimeout(goHome, duration + 1100);
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
  // Three coordinated members share one route, input system, and animation loop.
  const fields = [
    { x: 0, y: 0, vx: 0, vy: 0, angle: 0, intensity: 0, phase: 0, scale: 1, strength: 1, follow: 1 },
    { x: 0, y: 0, vx: 0, vy: 0, angle: 0, intensity: 0, phase: 2.75, scale: 0.78, strength: 0.74, follow: 0.72 },
    { x: 0, y: 0, vx: 0, vy: 0, angle: 0, intensity: 0, phase: 5.35, scale: 0.61, strength: 0.5, follow: 0.52 }
  ];
  const pointer = { x: 0, y: 0 };
  const route = Array.from({ length: 9 }, () => [0, 0]);
  const lightLobes = [[0, 0, 0.9], [-0.42, 0.18, 0.62], [0.34, -0.25, 0.7], [0.18, 0.38, 0.52]];
  const lightColors = [[242, 240, 232], [72, 181, 205], [185, 218, 92]];
  const contourCount = 20, samples = 48;
  const contourColors = [
    [242, 239, 232], [148, 158, 164], [215, 255, 0], [74, 183, 201],
    [65, 117, 210], [117, 173, 166]
  ];
  const contourFamilies = [0, 1, 0, 2, 0, 1, 0, 3, 0, 2, 1, 0, 4, 0, 1, 3, 0, 2, 4, 5];
  const contours = new Float32Array(contourCount * (samples + 1) * 2);
  const contourActivity = new Float32Array(contourCount);
  let width = 0, height = 0, portraitX = 0, portraitY = 0, portraitWidth = 0, portraitHeight = 0;
  let imageX = 0, imageY = 0, imageWidth = 0, imageHeight = 0;
  const name = homeHero.querySelector(".home-hero__name");
  const statement = homeHero.querySelector(".home-hero__statement");
  const textRegions = [
    { node: name, x: 0, y: 0, radius: 1, light: 0 },
    { node: statement, x: 0, y: 0, radius: 1, light: 0 }
  ];
  let frame = null, previousTime = 0, elapsed = 0, phase = 0, coast = 0;
  let inputBlend = 0;
  let activePointer = null, lastInput = -Infinity;
  let visible = true, ready = false;
  const autoTarget = { targetX: 0, targetY: 0 };

  const autoPoint = (position, output) => {
    const index = Math.floor(position), t = position - index;
    const a = route[(index + 8) % 9], b = route[index];
    const c = route[(index + 1) % 9], d = route[(index + 2) % 9];
    for (let axis = 0; axis < 2; axis += 1) {
      output[axis ? "targetY" : "targetX"] = 0.5 * (2 * b[axis] + (-a[axis] + c[axis]) * t +
        (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t +
        (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t * t * t);
    }
  };

  const resize = () => {
    if (!portrait.naturalWidth) return;
    const oldWidth = width, oldHeight = height;
    width = homeHero.clientWidth;
    height = homeHero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Layout measurements exclude the shared entrance translation.
    portraitX = portrait.offsetLeft;
    portraitY = portrait.offsetTop;
    portraitWidth = portrait.clientWidth;
    portraitHeight = portrait.clientHeight;
    overlay.width = Math.round(portraitWidth * dpr);
    overlay.height = Math.round(portraitHeight * dpr);
    maskContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(portrait);
    const scale = Math.min(portraitWidth / portrait.naturalWidth, portraitHeight / portrait.naturalHeight);
    imageWidth = portrait.naturalWidth * scale;
    imageHeight = portrait.naturalHeight * scale;
    imageX = (portraitWidth - imageWidth) / 2;
    imageY = (portraitHeight - imageHeight) * (/bottom|100%/.test(style.objectPosition) ? 1 : 0.5);

    route[0][0] = width * 0.12; route[0][1] = height * 0.16;
    route[1][0] = portraitX + imageX + imageWidth * 0.47;
    route[1][1] = portraitY + imageY + imageHeight * 0.26;
    route[2][0] = portraitX + imageX + imageWidth * 0.5;
    route[2][1] = portraitY + imageY + imageHeight * 0.43;
    route[3][0] = width * 0.51; route[3][1] = height * 0.46;
    route[4][0] = width * 0.86; route[4][1] = height * 0.43;
    route[5][0] = width * 0.86; route[5][1] = height * 0.8;
    route[6][0] = width * 0.55; route[6][1] = height * 0.85;
    route[7][0] = portraitX + imageX + imageWidth * 0.47;
    route[7][1] = portraitY + imageY + imageHeight * 0.75;
    route[8][0] = width * 0.56; route[8][1] = height * 0.16;
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      field.x = oldWidth ? field.x * width / oldWidth : route[(index * 3) % route.length][0];
      field.y = oldHeight ? field.y * height / oldHeight : route[(index * 3) % route.length][1];
      field.targetX = field.x;
      field.targetY = field.y;
    }
    pointer.x = fields[0].x; pointer.y = fields[0].y;
    for (const region of textRegions) {
      region.x = region.node.offsetLeft + region.node.offsetWidth / 2;
      region.y = region.node.offsetTop + region.node.offsetHeight / 2;
      region.radius = Math.max(region.node.offsetWidth, region.node.offsetHeight) * 0.72;
    }
    // Cache three directed contour clusters: portrait, identity flow, and lower-right metadata.
    for (let line = 0; line < contourCount; line += 1) {
      for (let point = 0; point <= samples; point += 1) {
        const t = point / samples, index = (line * (samples + 1) + point) * 2;
        if (line < 8) {
          const portraitBand = line < 4 ? 0.07 + line * 0.045 : 0.57 + (line - 4) * 0.055;
          contours[index] = width * (-0.08 + t * (0.66 + (line % 3) * 0.035) +
            0.045 * Math.sin(t * 5.2 + line * 0.72));
          contours[index + 1] = height * (portraitBand +
            0.07 * Math.sin(t * (4.2 + line * 0.04) + line * 0.48));
        } else if (line < 15) {
          const clusterLine = line - 8;
          contours[index] = width * (0.18 + t * (0.82 + (clusterLine % 2) * 0.045) +
            0.035 * Math.sin(t * 6.1 + line * 0.63));
          contours[index + 1] = height * (0.14 + t * 0.42 + clusterLine * 0.035 +
            0.075 * Math.sin(t * 5.4 + line * 0.52));
        } else {
          const clusterLine = line - 15;
          contours[index] = width * (0.37 + t * (0.72 + (clusterLine % 2) * 0.05) +
            0.045 * Math.sin(t * 5.8 + line * 0.66));
          contours[index + 1] = height * (0.64 + clusterLine * 0.055 +
            0.075 * Math.sin(t * 5.1 + line * 0.49));
        }
      }
    }
    ready = true;
    wake();
  };

  const render = (dt) => {
    const baseRadius = width < 700 ? Math.min(155, width * 0.31) : Math.min(480, Math.max(340, width * 0.25));
    const time = reduced.matches ? 0 : elapsed;
    context.clearRect(0, 0, width, height);
    // Three invisible organic light fields illuminate the hero and aligned portrait.
    maskContext.clearRect(0, 0, portraitWidth, portraitHeight);
    let portraitActive = false;
    for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
      const field = fields[fieldIndex];
      const speed = Math.hypot(field.vx, field.vy);
      const mobileSoftness = width < 700 ? 0.72 : 1;
      field.stretch = reduced.matches ? 1 : 1 + Math.min(width < 700 ? 0.24 : 0.38, speed / 2100);
      field.radius = baseRadius * field.scale * (1 + field.intensity * 0.1);
      field.cos = Math.cos(field.angle);
      field.sin = Math.sin(field.angle);
      context.save();
      context.globalCompositeOperation = "source-over";
      context.translate(field.x, field.y);
      context.rotate(field.angle);
      context.scale(field.stretch, 1 / Math.sqrt(field.stretch));
      for (let lobe = 0; lobe < lightLobes.length; lobe += 1) {
        const shape = lightLobes[lobe];
        const radius = field.radius * shape[2] * (1 + 0.075 * Math.sin(time * 1.2 + lobe * 1.8 + fieldIndex));
        const x = field.radius * shape[0], y = field.radius * shape[1];
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        const color = lightColors[fieldIndex];
        const centerAlpha = ((fieldIndex === 0 ? 0.2 : fieldIndex === 1 ? 0.13 : 0.09) + field.intensity * 0.045) * mobileSoftness;
        gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${centerAlpha * field.strength})`);
        gradient.addColorStop(0.14, `rgba(${color[0]},${color[1]},${color[2]},${centerAlpha * 0.9 * field.strength})`);
        gradient.addColorStop(0.46, `rgba(${color[0]},${color[1]},${color[2]},${centerAlpha * 0.3 * field.strength})`);
        gradient.addColorStop(0.76, `rgba(${color[0]},${color[1]},${color[2]},${centerAlpha * 0.075 * field.strength})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      context.restore();
      const intersects = field.x + field.radius * field.stretch * 1.4 > portraitX &&
        field.x - field.radius * field.stretch * 1.4 < portraitX + portraitWidth &&
        field.y + field.radius * field.stretch * 1.4 > portraitY &&
        field.y - field.radius * field.stretch * 1.4 < portraitY + portraitHeight;
      if (intersects) {
        portraitActive = true;
        maskContext.save();
        maskContext.globalCompositeOperation = "source-over";
        maskContext.translate(field.x - portraitX, field.y - portraitY);
        maskContext.rotate(field.angle);
        maskContext.scale(field.stretch, 1 / Math.sqrt(field.stretch));
        for (let lobe = 0; lobe < lightLobes.length; lobe += 1) {
          const shape = lightLobes[lobe];
          const radius = field.radius * shape[2] * (1 + 0.075 * Math.sin(time * 1.2 + lobe * 1.8 + fieldIndex));
          const x = field.radius * shape[0], y = field.radius * shape[1];
          const gradient = maskContext.createRadialGradient(x, y, 0, x, y, radius);
          const peak = (fieldIndex === 0 ? 0.68 : fieldIndex === 1 ? 0.48 : 0.3) * mobileSoftness * field.strength;
          gradient.addColorStop(0, `rgba(242,240,232,${peak})`);
          gradient.addColorStop(0.16, `rgba(242,240,232,${peak * 0.92})`);
          gradient.addColorStop(0.48, `rgba(242,240,232,${peak * 0.38})`);
          gradient.addColorStop(0.78, `rgba(242,240,232,${peak * 0.08})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          maskContext.fillStyle = gradient;
          maskContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        maskContext.restore();
      }
    }
    if (portraitActive) {
      maskContext.save();
      maskContext.globalCompositeOperation = "source-in";
      maskContext.filter = "saturate(0.78) contrast(1.06)";
      maskContext.drawImage(portrait, imageX, imageY, imageWidth, imageHeight);
      maskContext.restore();
    }
    // Broad atmospheric contours bend locally in the field's direction of travel.
    for (let line = 0; line < (width < 700 ? 12 : contourCount); line += 1) {
      context.beginPath();
      let lineActivity = 0;
      for (let point = 0; point <= samples; point += 1) {
        const index = (line * (samples + 1) + point) * 2;
        const x = contours[index], y = contours[index + 1];
        let px = x + Math.sin(time * 0.34 + line * 0.61 + point * 0.08) * (line % 3 + 1) * 0.7;
        let py = y + Math.cos(time * 0.28 + line * 0.47 + point * 0.06) * (line % 4 + 1) * 0.55;
        for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
          const field = fields[fieldIndex];
          const dx = x - field.x, dy = y - field.y;
          const along = (dx * field.cos + dy * field.sin) / field.stretch;
          const across = -dx * field.sin + dy * field.cos;
          const normalized = 1 - (along * along + across * across) / (field.radius * field.radius);
          const influence = normalized > 0 ? normalized * normalized : 0;
          lineActivity = Math.max(lineActivity, influence * field.strength);
          const displacement = influence * (32 + field.intensity * 38) * field.strength;
          px += displacement * (dx / field.radius + field.cos * 0.4);
          py += displacement * (dy / field.radius + field.sin * 0.4);
        }
        if (point) context.lineTo(px, py); else context.moveTo(px, py);
      }
      const color = contourColors[contourFamilies[line]];
      const tier = line % 5;
      const baseAlpha = tier < 2 ? 0.032 + tier * 0.012 : tier < 4 ? 0.075 + (tier - 2) * 0.018 : 0.052;
      const activityRate = lineActivity > contourActivity[line] ? 3.2 : 1.7;
      contourActivity[line] += (lineActivity - contourActivity[line]) * (1 - Math.exp(-activityRate * dt));
      const smoothActivity = contourActivity[line];
      const mobileResponse = width < 700 ? 0.72 : 1;
      const alpha = Math.min(0.25, (baseAlpha + smoothActivity * (tier === 4 ? 0.18 : 0.12) * mobileResponse) *
        (1 - smoothActivity * 0.16));
      context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      context.lineWidth = line % 4 === 0 ? 1.35 : line % 2 === 0 ? 0.85 : 0.55;
      context.stroke();
    }
    // Short, open fluid folds make the field legible away from the portrait.
    for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
      const field = fields[fieldIndex];
      context.save();
      context.translate(field.x, field.y);
      context.rotate(field.angle);
      context.scale(field.stretch, 1 / Math.sqrt(field.stretch));
      const foldCount = width < 700 ? 2 : 3;
      for (let fold = 0; fold < foldCount; fold += 1) {
        const drift = Math.sin(time * 1.4 + fold * 1.7 + fieldIndex) * field.radius * 0.09;
        context.beginPath();
        context.moveTo(-field.radius * 0.82, field.radius * (0.08 + fold * 0.13));
        context.bezierCurveTo(-field.radius * 0.55, -field.radius * 0.75 + drift,
          field.radius * 0.32, field.radius * 0.64 + drift,
          field.radius * 0.87, -field.radius * (0.16 + fold * 0.12));
        const color = contourColors[(fold + fieldIndex * 2 + 1) % contourColors.length];
        const alpha = ((fold === 1 ? 0.095 : 0.058) + field.intensity * 0.055) * field.strength *
          (width < 700 ? 0.75 : 1);
        context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        context.lineWidth = fold === 1 ? 1.15 : 0.85;
        context.stroke();
      }
      context.restore();
    }
  };

  const tick = (now) => {
    frame = null;
    if (!ready || !visible || document.hidden) return;
    const dt = Math.min(0.04, previousTime ? (now - previousTime) / 1000 : 1 / 60);
    previousTime = now;
    elapsed += dt;
    const dragging = activePointer !== null;
    const controlled = dragging || now - lastInput < 1750;
    const takeoverRate = controlled ? 3.2 : 1.25;
    inputBlend += ((controlled ? 1 : 0) - inputBlend) * (1 - Math.exp(-takeoverRate * dt));
    if (!reduced.matches && elapsed > 0.6) {
      phase = (phase + dt * 9 / 10 * (1 + 0.1 * Math.sin(elapsed * 0.9))) % 9;
    }
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      if (reduced.matches || elapsed <= 0.6) {
        field.targetX = route[(index * 3) % route.length][0];
        field.targetY = route[(index * 3) % route.length][1];
      } else {
        autoPoint((phase + field.phase) % route.length, autoTarget);
        const trail = index * 0.055;
        const pointerX = pointer.x - fields[0].vx * trail;
        const pointerY = pointer.y - fields[0].vy * trail;
        field.targetX = autoTarget.targetX + (pointerX - autoTarget.targetX) * inputBlend;
        field.targetY = autoTarget.targetY + (pointerY - autoTarget.targetY) * inputBlend;
      }
      const oldX = field.x, oldY = field.y;
      if (coast > 0 && !dragging) {
        field.x += field.vx * dt;
        field.y += field.vy * dt;
        field.vx *= Math.exp(-(6 + index * 0.8) * dt);
        field.vy *= Math.exp(-(6 + index * 0.8) * dt);
      } else {
        const rate = (dragging ? 14 : controlled ? 6.2 : 4.2) * field.follow;
        const follow = 1 - Math.exp(-rate * dt);
        field.x += (field.targetX - field.x) * follow;
        field.y += (field.targetY - field.y) * follow;
        const blend = 1 - Math.exp(-(12 - index * 1.6) * dt);
        field.vx += ((field.x - oldX) / dt - field.vx) * blend;
        field.vy += ((field.y - oldY) / dt - field.vy) * blend;
      }
      const speedLimit = width < 700 ? 760 : 1150;
      const velocity = Math.hypot(field.vx, field.vy);
      if (velocity > speedLimit) {
        field.vx *= speedLimit / velocity;
        field.vy *= speedLimit / velocity;
      }
      field.x = Math.max(0, Math.min(width, field.x));
      field.y = Math.max(0, Math.min(height, field.y));
      if (Math.hypot(field.vx, field.vy) > 8) {
        const angle = Math.atan2(field.vy, field.vx) - field.angle;
        field.angle += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-8 * dt));
      }
      field.intensity += ((dragging ? field.strength : 0) - field.intensity) * (1 - Math.exp(-8 * dt));
    }
    if (coast > 0 && !dragging) coast -= dt;
    render(dt);
    for (const region of textRegions) {
      let proximity = 0;
      let closest = fields[0];
      for (const field of fields) {
        const distance = Math.hypot(field.x - region.x, field.y - region.y);
        const influence = Math.max(0, 1 - distance / (region.radius + field.radius)) * field.strength;
        if (influence > proximity) {
          proximity = influence;
          closest = field;
        }
      }
      const textRate = proximity > region.light ? 3.6 : 2;
      region.light += (proximity - region.light) * (1 - Math.exp(-textRate * dt));
      region.node.style.setProperty("--field-light", (region.light * 0.72).toFixed(3));
      region.node.style.setProperty("--field-x", `${closest.x - region.node.offsetLeft}px`);
      region.node.style.setProperty("--field-y", `${closest.y - region.node.offsetTop}px`);
      region.node.style.setProperty("--field-shift-x", `${Math.max(-1.5, Math.min(1.5, fields[0].vx / 520)) * region.light}px`);
      region.node.style.setProperty("--field-shift-y", `${Math.max(-1.5, Math.min(1.5, fields[0].vy / 520)) * region.light}px`);
    }
    const unsettled = fields.some((field) =>
      Math.hypot(field.x - field.targetX, field.y - field.targetY) > 0.1 || field.intensity > 0.001) || coast > 0;
    if (!reduced.matches || unsettled) frame = requestAnimationFrame(tick);
  };

  function wake() {
    if (frame === null && ready && visible && !document.hidden) {
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  const updatePointer = (event) => {
    const rect = homeHero.getBoundingClientRect();
    pointer.x = Math.max(0, Math.min(width, event.clientX - rect.left));
    pointer.y = Math.max(0, Math.min(height, event.clientY - rect.top));
    lastInput = performance.now();
    coast = 0;
    wake();
  };
  let hintDismissed = false;
  const dismissHint = () => {
    if (hintDismissed) return;
    hintDismissed = true;
    homeHero.classList.add("has-interacted");
  };
  homeHero.addEventListener("pointermove", (event) => {
    if (activePointer !== null && activePointer !== event.pointerId) return;
    updatePointer(event);
    dismissHint();
  });
  homeHero.addEventListener("pointerdown", (event) => {
    if (!ready || activePointer !== null || event.button !== 0 ||
      event.target.closest("a, button, input, select, textarea")) return;
    activePointer = event.pointerId;
    dismissHint();
    homeHero.setPointerCapture(event.pointerId);
    updatePointer(event);
    event.preventDefault();
  });
  const release = (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    coast = reduced.matches ? 0 : 0.6;
    lastInput = -Infinity;
    if (homeHero.hasPointerCapture(event.pointerId)) homeHero.releasePointerCapture(event.pointerId);
    wake();
  };
  homeHero.addEventListener("pointerup", release);
  homeHero.addEventListener("pointercancel", release);
  homeHero.addEventListener("lostpointercapture", release);
  homeHero.addEventListener("pointerleave", () => {
    if (activePointer === null) lastInput = -Infinity;
  });
  const pause = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = 0;
  };
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : wake());
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake(); else pause();
    }, { threshold: 0 }).observe(homeHero);
  }
  reduced.addEventListener("change", wake);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
    initPortfolioIntro();
    initHomeHeroPointer();
    initHomeWorkPreview();
    initRevealAnimations();
  });
} else {
  initPageTransitions();
  initPortfolioIntro();
  initHomeHeroPointer();
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
