const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll(".nav-links a");
const savedTheme = localStorage.getItem("portfolio-theme");

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
