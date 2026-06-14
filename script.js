const themeToggle = document.getElementById("themeToggle");
const currentYear = document.getElementById("currentYear");
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll("main section[id]");
const savedTheme = localStorage.getItem("portfolio-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const nextTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
    localStorage.setItem("portfolio-theme", nextTheme);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? document.querySelector(targetId) : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const setActiveLink = () => {
  let currentId = "";

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 160 && rect.bottom >= 160) {
      currentId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${currentId}`;
    link.classList.toggle("is-active", isActive);
  });
};

window.addEventListener("scroll", setActiveLink, { passive: true });
window.addEventListener("load", setActiveLink);

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
