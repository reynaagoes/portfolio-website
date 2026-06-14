const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("main section[id]");
const savedTheme = localStorage.getItem("portfolio-theme");

const applyTheme = (theme) => {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-theme", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }
};

applyTheme(savedTheme === "dark" ? "dark" : "light");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem("portfolio-theme", nextTheme);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const targetSection = targetId ? document.querySelector(targetId) : null;

    if (!targetSection) {
      return;
    }

    event.preventDefault();
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const setActiveLink = () => {
  const offset = 160;
  let activeId = "";

  sections.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    if (window.scrollY + offset >= top && window.scrollY + offset < bottom) {
      activeId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === `#${activeId}`);
  });
};

window.addEventListener("scroll", setActiveLink, { passive: true });
window.addEventListener("load", setActiveLink);
window.addEventListener("resize", setActiveLink);

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
