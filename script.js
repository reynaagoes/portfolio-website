const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const savedTheme = localStorage.getItem("portfolio-theme");
const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const workspaceOpening = document.querySelector(".workspace-opening");
const workspaceScrollLinks = document.querySelectorAll(".workspace-scroll, .workspace-cta, .workspace-menu");

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

const scrollToHomeMain = (event) => {
  const homeMain = document.getElementById("home-main");

  if (!homeMain) {
    return;
  }

  event.preventDefault();
  homeMain.scrollIntoView({
    behavior: prefersReducedMotion.matches ? "auto" : "smooth",
    block: "start"
  });
};

const initWorkspaceOpening = () => {
  if (!workspaceOpening || prefersReducedMotion.matches) {
    return;
  }

  let ticking = false;

  const updateScrollProgress = () => {
    const progress = Math.min(window.scrollY / Math.max(workspaceOpening.offsetHeight, 1), 1);
    workspaceOpening.style.setProperty("--scroll-progress", progress.toFixed(3));
    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateScrollProgress);
  };

  workspaceOpening.addEventListener("mousemove", (event) => {
    const rect = workspaceOpening.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const mouseY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    workspaceOpening.style.setProperty("--mouse-x", mouseX.toFixed(3));
    workspaceOpening.style.setProperty("--mouse-y", mouseY.toFixed(3));
  });

  workspaceOpening.addEventListener("mouseleave", () => {
    workspaceOpening.style.setProperty("--mouse-x", "0");
    workspaceOpening.style.setProperty("--mouse-y", "0");
  });

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  updateScrollProgress();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initRevealAnimations();
    initWorkspaceOpening();
  });
} else {
  initRevealAnimations();
  initWorkspaceOpening();
}

workspaceScrollLinks.forEach((link) => {
  link.addEventListener("click", scrollToHomeMain);
});

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
