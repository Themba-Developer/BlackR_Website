const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const header = document.querySelector("[data-header]");

function closeMenu() {
  if (!menuButton || !menu) return;
  menuButton.setAttribute("aria-expanded", "false");
  menu.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menu.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
}

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 20);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".primary-nav a[href^='#']")];

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-25% 0px -60%", threshold: [0.05, 0.25, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) closeMenu();
});
