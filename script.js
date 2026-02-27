/* Interactions for portfolio site (no build step). */

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function $(sel, root) {
  return (root || document).querySelector(sel);
}

function $all(sel, root) {
  return Array.from((root || document).querySelectorAll(sel));
}

function normalizeTags(raw) {
  return String(raw || "")
    .split(/[\s,]+/g)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function initCursorSpotlight() {
  if (prefersReducedMotion()) return;
  const isFinePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!isFinePointer) return;
  const root = document.documentElement;
  let raf = 0;
  let last = { x: 0, y: 0 };

  const apply = () => {
    raf = 0;
    root.style.setProperty("--mx", `${last.x}px`);
    root.style.setProperty("--my", `${last.y}px`);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      last = { x: e.clientX, y: e.clientY };
      if (raf) return;
      raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );
}

function showToast({ title, text, iconClass = "fa-solid fa-check" }, opts = {}) {
  const region = document.getElementById("toastRegion");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");

  toast.innerHTML = `
    <i class="${iconClass}" aria-hidden="true"></i>
    <div>
      <p class="toast-title"></p>
      <p class="toast-text"></p>
    </div>
    <button class="toast-close" type="button" aria-label="Schliessen">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  const titleEl = toast.querySelector(".toast-title");
  const textEl = toast.querySelector(".toast-text");
  if (titleEl) titleEl.textContent = title || "";
  if (textEl) textEl.textContent = text || "";

  const close = () => {
    toast.remove();
  };

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  region.appendChild(toast);

  const ttl = typeof opts.ttlMs === "number" ? opts.ttlMs : 2400;
  if (ttl > 0) setTimeout(close, ttl);
}

function inferTagsFromCard(card) {
  const tags = new Set(normalizeTags(card.dataset.tags));
  const text = (card.innerText || "").toLowerCase();
  const hrefs = Array.from(card.querySelectorAll("a"))
    .map((a) => a.getAttribute("href") || "")
    .join(" ")
    .toLowerCase();
  const blob = `${text} ${hrefs}`;

  if (blob.includes("tableau")) tags.add("tableau");
  if (blob.includes("amplitude")) tags.add("amplitude");
  if (blob.includes("bigquery")) tags.add("bigquery"), tags.add("sql");
  if (blob.includes("sql")) tags.add("sql");
  if (blob.includes("python") || blob.includes("jupyter")) tags.add("python");
  if (blob.includes("databricks")) tags.add("databricks"), tags.add("sql");
  if (blob.includes("google sheets") || blob.includes("spreadsheets")) tags.add("sheets");

  return Array.from(tags);
}

function initThemeToggle() {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");
  if (!toggleBtn) return;

  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }

  toggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

function initRevealOnScroll() {
  const items = $all("header.hero, section, footer");
  if (!items.length) return;

  if (prefersReducedMotion()) {
    items.forEach((el) => el.classList.add("reveal", "in-view"));
    return;
  }

  items.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );
  items.forEach((el) => io.observe(el));
}

function initCertificatesPopup() {
  $all(".cert-popup-parent").forEach((parent) => {
    parent.addEventListener("click", (e) => {
      document.querySelectorAll(".cert-popup-parent.active").forEach((opened) => {
        if (opened !== parent) opened.classList.remove("active");
      });
      parent.classList.toggle("active");
      e.stopPropagation();
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".cert-popup-parent.active").forEach((opened) => opened.classList.remove("active"));
  });

  ["#experience", "#education", "#certificates", "#projects", "#hobbies"].forEach((selector) => {
    const section = document.querySelector(selector);
    if (!section) return;
    section.addEventListener("mouseenter", () => {
      document.querySelectorAll(".cert-popup-parent.active").forEach((opened) => opened.classList.remove("active"));
    });
  });
}

function initScrollToTop() {
  const scrollBtn = document.getElementById("scrollToTopBtn");
  if (!scrollBtn) return;

  scrollBtn.style.opacity = "0";
  scrollBtn.style.pointerEvents = "none";

  const toggleVisibility = () => {
    if (window.scrollY > 200) {
      scrollBtn.style.opacity = "1";
      scrollBtn.style.pointerEvents = "auto";
    } else {
      scrollBtn.style.opacity = "0";
      scrollBtn.style.pointerEvents = "none";
    }
  };

  window.addEventListener("scroll", toggleVisibility, { passive: true });
  toggleVisibility();

  scrollBtn.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } catch {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  });
}

function initCvDownloadTracking() {
  const cvButton = document.querySelector(".cv-download-button");
  if (!cvButton) return;

  cvButton.addEventListener("click", (event) => {
    event.preventDefault();

    const href = cvButton.href;
    const downloadAttr = cvButton.getAttribute("download") || "";

    if (typeof window.gtag === "function") {
      window.gtag("event", "cv_download", { cv_language: "Deutsch" });
    }

    showToast({ title: "Download", text: "Lebenslauf wird heruntergeladen…", iconClass: "fa-solid fa-file-arrow-down" });

    setTimeout(() => {
      const tempLink = document.createElement("a");
      tempLink.href = href;
      tempLink.setAttribute("download", downloadAttr);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    }, 400);
  });
}

function initGa4GlobalClickTracking() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest(
      "a, button, .skill-tile, .project-card, .experience-item, .education-item, .skill-card, .cv-download-button, .chip, .location-chip, .filter-btn, .quick-view-btn"
    );
    if (!target) return;

    const tagName = (target.tagName || "").toLowerCase();
    const text = ((target.innerText || target.getAttribute("aria-label") || "").trim()).slice(0, 100);
    const id = target.id || "";
    const classes = (target.className || "").toString().slice(0, 150);
    const href = target.href || "";

    const sectionEl = target.closest("section, header, footer, nav");
    let sectionName = "page";
    if (sectionEl) sectionName = sectionEl.id ? sectionEl.id : sectionEl.tagName.toLowerCase();

    let elementType = "other";
    if (target.classList.contains("cv-download-button")) elementType = "cv_download_button";
    else if (target.classList.contains("skill-tile")) elementType = "skill_tile";
    else if (target.classList.contains("project-card")) elementType = "project_card";
    else if (target.classList.contains("quick-view-btn")) elementType = "project_quick_view";
    else if (target.classList.contains("filter-btn")) elementType = "project_filter";
    else if (target.classList.contains("experience-item")) elementType = "experience_item";
    else if (target.classList.contains("education-item")) elementType = "education_item";
    else if (target.classList.contains("skill-card")) elementType = "hobby_card";
    else if (tagName === "a") elementType = "link";
    else if (tagName === "button") elementType = "button";

    let isOutbound = false;
    if (href && href.startsWith("http")) {
      try {
        const linkHost = new URL(href).hostname;
        const currentHost = window.location.hostname;
        isOutbound = linkHost !== currentHost;
      } catch {
        isOutbound = false;
      }
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", "site_click", {
        section: sectionName,
        element_type: elementType,
        element_text: text,
        element_id: id,
        element_classes: classes,
        link_url: href,
        is_outbound: isOutbound,
      });
    }
  });
}

function initProjectsInteractions() {
  const cards = $all(".project-card");
  if (!cards.length) return;

  const filterButtons = $all(".filter-btn");
  const searchInput = document.getElementById("projectSearch");
  const countEl = document.getElementById("projectCount");

  const modal = document.getElementById("projectModal");
  const modalBody = document.getElementById("projectModalBody");
  const modalClose = modal ? modal.querySelector('[data-close="true"]') : null;

  let currentFilter = "all";
  let currentQuery = "";
  let lastFocusEl = null;

  const getCardTitle = (card) => {
    const h3a = card.querySelector(".project-info h3 a");
    return (h3a ? h3a.textContent : card.querySelector(".project-info h3")?.textContent || "").trim();
  };

  const getPrimaryLink = (card) => {
    const h3a = card.querySelector(".project-info h3 a");
    const imgA = card.querySelector("a[href]");
    return (h3a && h3a.getAttribute("href")) || (imgA && imgA.getAttribute("href")) || "";
  };

  const getImage = (card) => {
    const img = card.querySelector("img");
    return img
      ? { src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "Projekt" }
      : { src: "", alt: "Projekt" };
  };

  const getDescriptionNodes = (card) => {
    const ps = Array.from(card.querySelectorAll(".project-info p"));
    return ps.slice(0, 3); // description + business value usually
  };

  const openModal = (card, triggerEl) => {
    if (!modal || !modalBody) return;

    lastFocusEl = triggerEl || document.activeElement;

    const title = getCardTitle(card);
    const link = getPrimaryLink(card);
    const { src, alt } = getImage(card);
    const tags = inferTagsFromCard(card);
    const descNodes = getDescriptionNodes(card);

    const tagsHtml = tags.length
      ? `<div class="modal__meta">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
      : "";

    modalBody.innerHTML = `
      <h3 class="modal__title">${title}</h3>
      ${tagsHtml}
      ${src ? `<img class="modal__img" src="${src}" alt="${alt}">` : ""}
      <div class="modal__text"></div>
      <div class="modal__actions">
        ${link ? `<a class="primary" href="${link}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Öffnen</a>` : ""}
        <a href="#projects" data-close="true"><i class="fa-solid fa-check" aria-hidden="true"></i> Schliessen</a>
      </div>
    `;

    const textWrap = modalBody.querySelector(".modal__text");
    if (textWrap && descNodes.length) {
      descNodes.forEach((p) => textWrap.appendChild(p.cloneNode(true)));
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const closeBtn = modal.querySelector(".modal__close");
    if (closeBtn) closeBtn.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusEl && typeof lastFocusEl.focus === "function") lastFocusEl.focus();
    lastFocusEl = null;
  };

  const applyFilters = () => {
    let visible = 0;
    cards.forEach((card) => {
      const tags = inferTagsFromCard(card);
      const title = getCardTitle(card).toLowerCase();
      const text = (card.innerText || "").toLowerCase();

      const matchesFilter = currentFilter === "all" ? true : tags.includes(currentFilter);
      const q = currentQuery.trim().toLowerCase();
      const matchesQuery = !q ? true : title.includes(q) || text.includes(q);

      const show = matchesFilter && matchesQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });

    if (countEl) countEl.textContent = `${visible} / ${cards.length}`;
  };

  // Inject "Quick view" buttons
  cards.forEach((card) => {
    card.tabIndex = 0;
    if (card.querySelector(".quick-view-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-view-btn";
    btn.textContent = "Details";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(card, btn);
    });
    card.appendChild(btn);

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement === card) {
        e.preventDefault();
        openModal(card, card);
      }
    });
  });

  // Filters
  filterButtons.forEach((b) => {
    b.addEventListener("click", () => {
      filterButtons.forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      currentFilter = b.dataset.filter || "all";
      applyFilters();
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentQuery = searchInput.value || "";
      applyFilters();
    });
  }

  // Modal close handlers
  if (modal) {
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.matches('[data-close="true"]') || t.closest('[data-close="true"]')) {
        e.preventDefault();
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // close modal + certificates
      closeModal();
      document.querySelectorAll(".cert-popup-parent.active").forEach((opened) => opened.classList.remove("active"));
    }
  });

  applyFilters();
}

function initHeroStats() {
  const projectsEl = document.getElementById("statProjects");
  const skillsEl = document.getElementById("statSkills");
  const certsEl = document.getElementById("statCerts");
  const hero = document.querySelector("header.hero");
  if (!hero || (!projectsEl && !skillsEl && !certsEl)) return;

  const counts = {
    projects: $all(".project-card").length,
    skills: $all("#skills .skill-tile").length,
    certs: $all("#certificates .cert-popup-parent").length,
  };

  if (projectsEl) projectsEl.dataset.count = String(counts.projects);
  if (skillsEl) skillsEl.dataset.count = String(counts.skills);
  if (certsEl) certsEl.dataset.count = String(counts.certs);

  const animate = (el) => {
    const target = Number(el.dataset.count || "0") || 0;
    const duration = prefersReducedMotion() ? 0 : 900;
    const start = performance.now();

    const tick = (t) => {
      const p = duration === 0 ? 1 : clamp((t - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const els = [projectsEl, skillsEl, certsEl].filter(Boolean);
  els.forEach((el) => (el.textContent = "0"));

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries.find((e) => e.isIntersecting);
      if (!entry) return;
      els.forEach(animate);
      io.disconnect();
    },
    { threshold: 0.4 }
  );
  io.observe(hero);
}

function initTiltEffects() {
  if (prefersReducedMotion()) return;
  const isFinePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!isFinePointer) return;

  const targets = $all(".project-card, .skill-tile, .stat");
  if (!targets.length) return;

  targets.forEach((el) => {
    let raf = 0;
    let rect = null;
    let last = { x: 0, y: 0 };

    const apply = () => {
      raf = 0;
      if (!rect) return;
      const px = (last.x - rect.left) / rect.width;
      const py = (last.y - rect.top) / rect.height;
      const rx = (0.5 - py) * 5;
      const ry = (px - 0.5) * 6;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    el.addEventListener("pointerenter", () => {
      rect = el.getBoundingClientRect();
    });

    el.addEventListener(
      "pointermove",
      (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        last = { x: e.clientX, y: e.clientY };
        if (raf) return;
        raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    el.addEventListener("pointerleave", () => {
      rect = null;
      el.style.transform = "";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCursorSpotlight();
  initThemeToggle();
  initRevealOnScroll();

  initCertificatesPopup();
  initScrollToTop();
  initCvDownloadTracking();
  initGa4GlobalClickTracking();

  initProjectsInteractions();
  initHeroStats();
  initTiltEffects();
});

