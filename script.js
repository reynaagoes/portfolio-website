const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
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
const voxelOpening = document.querySelector(".voxel-opening");
const worldLoader = document.querySelector(".world-loader");

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

applyTheme(savedTheme === "light" ? "light" : "dark");
setActiveNav();

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

const initVoxelOpening = () => {
  if (!voxelOpening) {
    return;
  }

  const scrollLinks = voxelOpening.querySelectorAll(".voxel-opening__enter, .voxel-opening__scroll, .voxel-opening__menu");
  let ticking = false;
  const enterPortfolio = (event) => {
    const target = event.currentTarget;
    const href = target.getAttribute("href") || target.dataset.href || "home.html";

    if (!href.startsWith("#")) {
      event.preventDefault();
      window.location.href = href;
      return;
    }

    const homeMain = document.querySelector(href);

    if (!homeMain) {
      return;
    }

    event.preventDefault();
    homeMain.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  };

  const updateOpening = () => {
    const rect = voxelOpening.getBoundingClientRect();
    const scrollableDistance = Math.max(voxelOpening.offsetHeight, 1);
    const progress = Math.min(Math.max(-rect.top / scrollableDistance, 0), 1);

    voxelOpening.style.setProperty("--voxel-scroll", progress.toFixed(3));
    ticking = false;
  };

  const requestOpeningUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateOpening);
  };

  scrollLinks.forEach((link) => {
    link.addEventListener("click", enterPortfolio);
  });

  if (!prefersReducedMotion.matches) {
    voxelOpening.addEventListener("mousemove", (event) => {
      const rect = voxelOpening.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const mouseY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      voxelOpening.style.setProperty("--voxel-mouse-x", mouseX.toFixed(3));
      voxelOpening.style.setProperty("--voxel-mouse-y", mouseY.toFixed(3));
    });

    voxelOpening.addEventListener("mouseleave", () => {
      voxelOpening.style.setProperty("--voxel-mouse-x", "0");
      voxelOpening.style.setProperty("--voxel-mouse-y", "0");
    });

    window.addEventListener("scroll", requestOpeningUpdate, { passive: true });
    window.addEventListener("resize", requestOpeningUpdate);
  }

  updateOpening();
};

const getWorldLoaderLabel = (progress) => {
  if (progress >= 96) {
    return "Entering world";
  }

  if (progress >= 76) {
    return "Building interface";
  }

  if (progress >= 51) {
    return "Loading projects";
  }

  if (progress >= 26) {
    return "Placing blocks";
  }

  return "Generating terrain";
};

const initWorldLoader = () => {
  if (!worldLoader) {
    return;
  }

  const label = worldLoader.querySelector(".world-loader__label");
  const percent = worldLoader.querySelector(".world-loader__percent");
  const progressBar = worldLoader.querySelector(".world-loader__progress");
  const duration = prefersReducedMotion.matches ? 120 : 2400;
  let animationFrame;
  let isHidden = false;

  const removeLoader = () => {
    if (isHidden) {
      return;
    }

    isHidden = true;
    worldLoader.remove();
  };

  const hideLoader = () => {
    worldLoader.classList.add("is-hidden");
  };

  const updateLoader = (timestamp, startTime) => {
    const elapsed = timestamp - startTime;
    const progress = Math.min(Math.round((elapsed / duration) * 100), 100);

    if (label) {
      label.textContent = getWorldLoaderLabel(progress);
    }

    if (percent) {
      percent.textContent = `${progress}%`;
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progress < 100) {
      animationFrame = window.requestAnimationFrame((nextTimestamp) => {
        updateLoader(nextTimestamp, startTime);
      });
      return;
    }

    window.setTimeout(hideLoader, prefersReducedMotion.matches ? 60 : 300);
  };

  worldLoader.addEventListener("transitionend", (event) => {
    if (event.target === worldLoader && event.propertyName === "opacity") {
      removeLoader();
    }
  });

  animationFrame = window.requestAnimationFrame((timestamp) => {
    updateLoader(timestamp, timestamp);
  });

  window.setTimeout(() => {
    window.cancelAnimationFrame(animationFrame);
    hideLoader();
    window.setTimeout(removeLoader, 700);
  }, duration + 900);
};

const initThemeAmbience = () => {
  if (voxelOpening || document.querySelector(".theme-ambience")) {
    return;
  }

  const page = document.body.dataset.page;
  const supportedPages = new Set(["home", "about", "projects", "contact"]);

  if (!supportedPages.has(page)) {
    return;
  }

  const ambience = document.createElement("div");
  ambience.className = "theme-ambience";
  ambience.setAttribute("aria-hidden", "true");
  ambience.innerHTML = `
    <div class="theme-ambience__light">
      <span class="theme-glow theme-glow--one"></span>
      <span class="theme-glow theme-glow--two"></span>
      <span class="theme-sun"></span>
      <span class="theme-cloud theme-cloud--one"></span>
      <span class="theme-cloud theme-cloud--two"></span>
      <span class="theme-cloud theme-cloud--three"></span>
      <span class="theme-block theme-block--one"></span>
      <span class="theme-block theme-block--two"></span>
      <span class="theme-birds theme-birds--one">
        <svg viewBox="0 0 120 44" focusable="false"><path d="M6 26c7-10 15-14 24-14 5 0 10 1 16 5 6-4 11-5 16-5 10 0 18 4 25 14" /></svg>
      </span>
      <span class="theme-birds theme-birds--two">
        <svg viewBox="0 0 92 38" focusable="false"><path d="M6 24c5-8 11-11 18-11 4 0 8 1 12 4 4-3 8-4 12-4 8 0 14 3 20 11" /></svg>
      </span>
      <span class="theme-particle theme-particle--one"></span>
      <span class="theme-particle theme-particle--two"></span>
      <span class="theme-particle theme-particle--three"></span>
      <span class="theme-particle theme-particle--four"></span>
    </div>
    <div class="theme-ambience__dark">
      <span class="theme-glow theme-glow--three"></span>
      <span class="theme-glow theme-glow--four"></span>
      <span class="theme-moon"></span>
      <span class="theme-cloud theme-cloud--night-one"></span>
      <span class="theme-cloud theme-cloud--night-two"></span>
      <span class="theme-block theme-block--three"></span>
      <span class="theme-block theme-block--four"></span>
      <div class="theme-stars">
        <span></span><span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <span class="theme-meteor theme-meteor--one"></span>
      <span class="theme-meteor theme-meteor--two"></span>
    </div>
  `;

  document.body.prepend(ambience);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initWorldLoader();
    initThemeAmbience();
    initRevealAnimations();
    initVoxelOpening();
  });
} else {
  initWorldLoader();
  initThemeAmbience();
  initRevealAnimations();
  initVoxelOpening();
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
