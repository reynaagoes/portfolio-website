const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const savedTheme = localStorage.getItem("portfolio-theme");
const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const introScreen = document.querySelector(".intro-screen");
const INTRO_DURATION = 2200;

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

const initIntroScreen = () => {
  if (!introScreen || document.body.dataset.page !== "home") {
    initRevealAnimations();
    return;
  }

  if (prefersReducedMotion.matches) {
    introScreen.remove();
    initRevealAnimations();
    return;
  }

  introScreen.setAttribute("aria-hidden", "false");
  document.body.classList.add("intro-active");

  const cleanupIntroScreen = () => {
    if (!document.body.classList.contains("intro-active")) {
      return;
    }

    introScreen.remove();
    document.body.classList.remove("intro-active");
    initRevealAnimations();
  };

  window.setTimeout(() => {
    introScreen.classList.add("is-hidden");
  }, INTRO_DURATION);

  const handleIntroTransitionEnd = (event) => {
    if (event.target !== introScreen || event.propertyName !== "opacity") {
      return;
    }

    introScreen.removeEventListener("transitionend", handleIntroTransitionEnd);
    cleanupIntroScreen();
  };

  introScreen.addEventListener("transitionend", handleIntroTransitionEnd);
  window.setTimeout(cleanupIntroScreen, INTRO_DURATION + 500);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIntroScreen);
} else {
  initIntroScreen();
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
