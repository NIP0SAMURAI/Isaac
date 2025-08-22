const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobile-nav");
if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const isOpen = !mobileNav.classList.contains("hidden");
    mobileNav.classList.toggle("hidden");
    menuBtn.setAttribute("aria-expanded", String(!isOpen));
  });
}
// ...existing code...
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// Count-up on scroll into view for elements with [data-countup]
function setupCountUps() {
  const els = document.querySelectorAll("[data-countup]");
  if (!els.length) return;
  // Ease-out cubic
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const formatInt = (n) => Math.round(n).toString();
  const animate = (el) => {
    const target = parseFloat(el.getAttribute("data-countup")) || 0;
    const duration = 2400; // ms (doubled from 1200)
    const startTime = performance.now();
    const startVal = 0;
    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const val = startVal + (target - startVal) * easeOutCubic(t);
      el.textContent = formatInt(val);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatInt(target);
    }
    requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  els.forEach((el) => io.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCountUps, { once: true });
} else {
  setupCountUps();
}

// Load official brand icons into footer placeholders
async function loadBrandIcons() {
  const nodes = document.querySelectorAll(".brand-icon[data-icon]");
  if (!nodes.length) return;
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const name = el.getAttribute("data-icon");
      try {
        const res = await fetch(`https://cdn.simpleicons.org/${name}`);
        if (!res.ok) return;
        const svgText = await res.text();
        // Inject SVG and make it inherit text color and size
        el.innerHTML = svgText
          .replace("<svg", '<svg width="22" height="22"')
          .replace(/fill=".*?"/g, 'fill="currentColor"');
      } catch {}
    })
  );
}
loadBrandIcons();

// --- Google Sheets CSV import for publications and projects (separate CSVs) ---
const PUBLICATIONS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpy8UGMjNjCFR8st9O_evmj6raZZ7oLxX1J8likDojqbowDqkRD7m28v3_RX62p3e1mw0OD3DZckAl/pub?gid=0&single=true&output=csv";
const PROJECTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpy8UGMjNjCFR8st9O_evmj6raZZ7oLxX1J8likDojqbowDqkRD7m28v3_RX62p3e1mw0OD3DZckAl/pub?gid=339520638&single=true&output=csv";

// Robust CSV parser that handles quoted fields and commas
function parseCSV(text) {
  const rows = [];
  let cur = "",
    inQuotes = false,
    row = [];
  for (let i = 0; i < text.length; ++i) {
    const c = text[i],
      next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        ++i;
      } else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (cur !== "" || row.length > 0) {
        row.push(cur);
        rows.push(row);
        cur = "";
        row = [];
      }
      if (c === "\r" && next === "\n") ++i;
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] ? r[i].trim() : ""));
    return obj;
  });
}

async function fetchAndRenderPublications() {
  try {
    const res = await fetch(PUBLICATIONS_CSV_URL);
    if (!res.ok) throw new Error("Failed to fetch publications CSV");
    const csv = await res.text();
    const data = parseCSV(csv);
    renderPublicationCards(data);
  } catch (e) {
    console.error("Error loading publications from Google Sheets:", e);
  }
}

async function fetchAndRenderProjects() {
  try {
    const res = await fetch(PROJECTS_CSV_URL);
    if (!res.ok) throw new Error("Failed to fetch projects CSV");
    const csv = await res.text();
    const data = parseCSV(csv);
    renderProjectCards(data);
  } catch (e) {
    console.error("Error loading projects from Google Sheets:", e);
  }
}

function renderPublicationCards(publications) {
  const list = document.querySelector(".publication-list");
  if (!list) return;
  list.innerHTML = "";
  // Only show first 3, hide the rest
  publications.forEach((pub, i) => {
    const tags = (pub["research topic"] || "")
      .split(";")
      .map(
        (t) =>
          `<span class='inline-flex rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-semibold'>${t}</span>`
      )
      .join(" ");
    list.innerHTML += `
      <li class=\"publication-list-item\" style=\"${
        i > 2 ? "display:none;" : ""
      }\">\n        <article class=\"publication-card\">\n          <div class=\"flex flex-wrap items-center gap-2\">\n            <span class=\"inline-flex items-center rounded-full border border-neutral-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600\">${
      pub["type of publication"] || ""
    }</span>\n            ${tags}\n            <span class=\"ml-auto text-xs text-neutral-500\">${
      pub["year"] || ""
    }</span>\n          </div>\n          <h3 class=\"mt-3 text-lg md:text-xl font-semibold\">${
      pub["title"] || ""
    }</h3>\n          <p class=\"mt-1 text-sm leading-relaxed text-neutral-700\">${
      pub["authors"] || ""
    } <span class=\"text-neutral-500\">(${
      pub["year"] || ""
    }).</span></p>\n          <div class=\"mt-4 flex flex-wrap gap-2\">\n            ${
      pub["doi link"]
        ? `<a href='${pub["doi link"]}' class='inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50' target='_blank' rel='noopener noreferrer'>DOI</a>`
        : ""
    }\n            <button class=\"btn-copy-citation inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50\" data-citation=\"${
      pub["copy citation text"] || ""
    }\">Copy citation</button>\n          </div>\n        </article>\n      </li>\n    `;
  });
  // Add or update the See more button
  let btn = document.getElementById("show-more-publications");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "show-more-publications";
    btn.className =
      "px-4 py-2 rounded-full border border-brand/30 text-brand font-semibold hover:bg-brand/5 text-sm mt-8";
    btn.style.display = "block";
    btn.style.margin = "0 auto";
    const hiddenCount = publications.length - 3;
    btn.textContent = `Show more (${hiddenCount})`;
    list.parentNode.insertBefore(btn, list.nextSibling);
  }
  if (publications.length > 3) {
    btn.style.display = "block";
    btn.onclick = function () {
      list.querySelectorAll(".publication-list-item").forEach((item, i) => {
        if (i > 2) item.style.display = "";
      });
      btn.style.display = "none";

      // Create and show the See less button
      let lessBtn = document.getElementById("see-less-publications");
      if (!lessBtn) {
        lessBtn = document.createElement("button");
        lessBtn.id = "see-less-publications";
        lessBtn.className =
          "px-4 py-2 rounded-full border border-brand/30 text-brand font-semibold hover:bg-brand/5 text-sm mt-8";
        lessBtn.style.display = "block";
        lessBtn.style.margin = "0 auto";
        lessBtn.textContent = "Show less";
        btn.parentNode.insertBefore(lessBtn, btn.nextSibling);
      } else {
        lessBtn.style.display = "block";
      }
      lessBtn.onclick = function () {
        list.querySelectorAll(".publication-list-item").forEach((item, i) => {
          if (i > 2) item.style.display = "none";
        });
        btn.style.display = "block";
        lessBtn.style.display = "none";
      };
    };
    // Hide See less button initially
    let lessBtn = document.getElementById("see-less-publications");
    if (lessBtn) lessBtn.style.display = "none";
  } else {
    btn.style.display = "none";
    let lessBtn = document.getElementById("see-less-publications");
    if (lessBtn) lessBtn.style.display = "none";
  }
  // Re-attach copy citation listeners
  document.querySelectorAll(".btn-copy-citation").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.citation || "");
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy citation"), 1400);
      } catch {}
    });
  });
}

function formatPeriod(period) {
  if (!period) return "";
  // Try to match ranges like 'Jun 2025 – Jun 2027' or 'Feb 2021 – Jul 2021'
  const parts = period.split(/–|-/).map((p) => p.trim());
  const format = (str) => {
    // Match e.g. 'Jun 2025', 'Jul. 2021', 'Jun. 21', 'Jun 21', 'Jun.2021'
    const m = str.match(/([A-Za-z]{3,})\.?\s*(\d{2,4})/);
    if (!m) return str;
    let [_, month, year] = m;
    // Convert month name to number
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    let mIdx = months.findIndex((mn) => month.toLowerCase().startsWith(mn));
    if (mIdx === -1) return str;
    let y = year.length === 4 ? year.slice(2) : year;
    return `${(mIdx + 1).toString().padStart(2, "0")}.${y}`;
  };
  if (parts.length === 2) {
    return `<span>${format(parts[0])}</span><br><span>${format(
      parts[1]
    )}</span>`;
  } else {
    return `<span>${format(parts[0])}</span>`;
  }
}

function renderProjectCards(projects) {
  const list = document.querySelector(".project-list");
  if (!list) return;
  list.innerHTML = "";
  projects.forEach((proj) => {
    const tags = (proj["science tags"] || "")
      .split(";")
      .map(
        (t) =>
          `<span class='inline-flex rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-semibold'>${t}</span>`
      )
      .join(" ");
    const dois = (proj["doi to articles that came out of the project"] || "")
      .split(";")
      .filter(Boolean)
      .map(
        (doi) =>
          `<a href='${doi}' class='inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50' target='_blank' rel='noopener noreferrer'>DOI</a>`
      )
      .join(" ");
    // image: prefer 'image' or 'image url' column from CSV
    const imgUrl = (proj["image"] || proj["image url"] || "").trim();
    const imageHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${(proj["title"] || "").replace(
          /"/g,
          ""
        )}" loading="lazy" class="w-full h-full object-cover">`
      : `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" class="w-full h-full object-cover">
            <defs>
              <linearGradient id="gradA" x1="0" x2="1">
                <stop offset="0%" stop-color="#386939" />
                <stop offset="100%" stop-color="#4e8b52" />
              </linearGradient>
            </defs>
            <rect width="1600" height="1000" fill="url(#gradA)" />
            <g fill="white" font-family="Inter, system-ui, sans-serif" text-anchor="middle">
              <text x="800" y="520" font-size="220" font-weight="800" opacity="0.95">QDG</text>
            </g>
          </svg>`;

    list.innerHTML += `
        <article class="project-card rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-soft relative">\n        <div class="aspect-[16/10] overflow-hidden">${imageHtml}</div>\n        <div class="p-5">\n          <div class="flex flex-col items-start gap-0">\n            <h3 class="text-lg font-semibold">${
      proj["title"] || ""
    }</h3>\n          </div>\n          <div class="flex items-center justify-between mt-1">\n            <span class="text-xs text-neutral-500">${
      proj["role"] || ""
    }</span>\n            <span class="text-xs text-neutral-500">${
      proj["budget"] || ""
    }</span>\n          </div>\n          <div class="mt-2 text-sm text-neutral-700">${
      proj["very short description"] || ""
    }</div>\n          <div class="mt-2 text-xs text-neutral-500">${
      proj["tl;dr"] || ""
    }</div>\n          <div class="mt-3 flex flex-wrap gap-2">${tags}</div>\n          <div class="mt-4 flex flex-wrap gap-2">${dois}</div>\n          <span class="absolute bottom-4 right-5 text-[10px] text-neutral-400">${formatPeriod(
      proj["period"] || ""
    )}</span>\n        </div>\n      </article>\n    `;
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      fetchAndRenderPublications();
      fetchAndRenderProjects();
    },
    { once: true }
  );
} else {
  fetchAndRenderPublications();
  fetchAndRenderProjects();
}
