const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const savedTheme = localStorage.getItem("portfolio-theme");
const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const openingScene = document.getElementById("openingScene");
const OPENING_SCENE_ENABLED = true;
const OPENING_SCENE_KEY = "portfolio-opening-seen";
const OPENING_SCENE_DURATION = 2000;

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

applyTheme(savedTheme === "dark" ? "dark" : "light");
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

const shouldPlayOpeningScene = () => {
  if (!OPENING_SCENE_ENABLED || !openingScene) {
    return false;
  }

  if (openingScene.dataset.enabled === "false") {
    return false;
  }

  if (document.body.dataset.page !== "home") {
    return false;
  }

  if (prefersReducedMotion.matches) {
    return false;
  }

  return sessionStorage.getItem(OPENING_SCENE_KEY) !== "true";
};

const finishOpeningScene = () => {
  if (openingScene) {
    openingScene.setAttribute("aria-hidden", "true");
  }

  document.body.classList.remove("opening-active");
  initRevealAnimations();
};

const initOpeningScene = () => {
  if (!shouldPlayOpeningScene()) {
    initRevealAnimations();
    return;
  }

  sessionStorage.setItem(OPENING_SCENE_KEY, "true");
  openingScene.setAttribute("aria-hidden", "false");
  document.body.classList.add("opening-active");

  window.setTimeout(finishOpeningScene, OPENING_SCENE_DURATION);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOpeningScene);
} else {
  initOpeningScene();
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
