const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const savedTheme = localStorage.getItem("portfolio-theme");
const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const voxelOpening = document.querySelector(".voxel-opening");
const worldLoader = document.querySelector(".world-loader");

const applyTheme = (theme) => {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-theme", isDark);

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
    const href = target.getAttribute("href") || "index.html";

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initWorldLoader();
    initRevealAnimations();
    initVoxelOpening();
  });
} else {
  initWorldLoader();
  initRevealAnimations();
  initVoxelOpening();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem("portfolio-theme", nextTheme);
  });
}

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
