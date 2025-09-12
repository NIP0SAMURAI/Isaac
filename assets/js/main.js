// Enable clicking the Popular Science stat to filter publications
document.addEventListener("DOMContentLoaded", function () {
  var statLink = document.getElementById("popular-science-stat-link");
  var pubType = document.getElementById("publication-type");
  if (statLink && pubType) {
    statLink.addEventListener("click", function (e) {
      e.preventDefault();
      // Set filter to 'Popular science' (case-insensitive match)
      for (var i = 0; i < pubType.options.length; i++) {
        if (pubType.options[i].text.toLowerCase().includes("popular science")) {
          pubType.selectedIndex = i;
          break;
        }
      }
      // Trigger filter and scroll
      if (typeof filterAndRenderPublications === "function")
        filterAndRenderPublications();
      var pubSection = document.getElementById("publications");
      if (pubSection) pubSection.scrollIntoView({ behavior: "smooth" });
    });
  }
});
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

let allPublications = [];
async function fetchAndRenderPublications() {
  try {
    const res = await fetch(PUBLICATIONS_CSV_URL);
    if (!res.ok) throw new Error("Failed to fetch publications CSV");
    const csv = await res.text();
    const data = parseCSV(csv);
    allPublications = data;
    populatePublicationFilterYears(data);
    populatePublicationFilterTypes(data);
    renderPublicationCards(data);
    setupPublicationFilters();
  } catch (e) {
    console.error("Error loading publications from Google Sheets:", e);
  }
}

function populatePublicationFilterYears(publications) {
  const yearSelect = document.getElementById("publication-year");
  if (!yearSelect) return;
  const years = Array.from(
    new Set(publications.map((pub) => pub["year"]).filter(Boolean))
  ).sort((a, b) => b - a);
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

function populatePublicationFilterTypes(publications) {
  const typeSelect = document.getElementById("publication-type");
  if (!typeSelect) return;
  // Remove all but the first option
  while (typeSelect.options.length > 1) typeSelect.remove(1);
  const types = Array.from(
    new Set(
      publications
        .map((pub) => (pub["type of publication"] || "").trim())
        .filter(Boolean)
    )
  ).sort();
  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
}

function setupPublicationFilters() {
  const form = document.getElementById("publication-filter-form");
  if (!form) return;
  form.addEventListener("input", function () {
    filterAndRenderPublications();
  });
}

function filterAndRenderPublications() {
  let filtered = allPublications;
  const search = document
    .getElementById("publication-search")
    .value.trim()
    .toLowerCase();
  const type = document.getElementById("publication-type").value;
  const year = document.getElementById("publication-year").value;
  const importance = document.getElementById("publication-importance").value;
  if (search) {
    filtered = filtered.filter((pub) =>
      Object.values(pub).some((val) =>
        (val || "").toLowerCase().includes(search)
      )
    );
  }
  if (type) {
    filtered = filtered.filter(
      (pub) =>
        (pub["type of publication"] || "").trim().toLowerCase() ===
        type.trim().toLowerCase()
    );
  }
  if (year) {
    filtered = filtered.filter((pub) => (pub["year"] || "") === year);
  }
  if (importance === "first") {
    filtered = filtered.filter((pub) => {
      const authors = (pub["authors"] || "").split(",");
      return (
        (authors.length && authors[0].toLowerCase().includes("løge")) ||
        authors[0].toLowerCase().includes("loge")
      );
    });
  }
  renderPublicationCards(filtered);
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
    const doiLink = pub["doi link"] ? pub["doi link"] : null;
    list.innerHTML += `
      <li class="publication-list-item" style="${i > 2 ? "display:none;" : ""}">
        <article class="publication-card" style="position:relative;" data-doi="${
          doiLink ? encodeURIComponent(doiLink) : ""
        }">
          ${
            doiLink
              ? `<div class="publication-card-bg-link" style="position:absolute;inset:0;z-index:1;cursor:pointer;"></div>`
              : ""
          }
          <div class="flex flex-wrap items-center gap-2" style="position:relative;z-index:2;">
            <span class="inline-flex items-center rounded-full border border-neutral-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">${
              pub["type of publication"] || ""
            }</span>
            ${tags}
            <span class="ml-auto text-xs text-neutral-500">${
              pub["year"] || ""
            }</span>
          </div>
          <h3 class="mt-3 text-lg md:text-xl font-semibold" style="position:relative;z-index:2;">${
            pub["title"] || ""
          }</h3>
          <p class="mt-1 text-sm leading-relaxed text-neutral-700" style="position:relative;z-index:2;">${
            pub["authors"] || ""
          } <span class="text-neutral-500">(${pub["year"] || ""}).</span></p>
          <div class="mt-4 flex flex-wrap gap-2" style="position:relative;z-index:2;">
            ${
              doiLink
                ? `<a href='${doiLink}' class='inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50' target='_blank' rel='noopener noreferrer'>DOI</a>`
                : ""
            }
            <button class="btn-copy-citation inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50" data-citation="${
              pub["copy citation text"] || ""
            }">Copy citation</button>
          </div>
          <span style="position:absolute; bottom:1rem; right:1.2rem; font-size:12px; color:#386939; font-weight:600;z-index:2;">${
            pub["number of citations"] && pub["number of citations"] !== "0"
              ? `Citations: ${pub["number of citations"]}`
              : ""
          }</span>
        </article>
      </li>
    `;
  });
  // Add or update the Show more button with dynamic count
  let btn = document.getElementById("show-more-publications");
  const hiddenCount = publications.length - 3;
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "show-more-publications";
    btn.className =
      "px-4 py-2 rounded-full border border-brand/30 text-brand font-semibold hover:bg-brand/5 text-sm mt-8";
    btn.style.display = "block";
    btn.style.margin = "0 auto";
    list.parentNode.insertBefore(btn, list.nextSibling);
  }
  if (publications.length > 3) {
    btn.style.display = "block";
    btn.textContent = `Show more (+${hiddenCount})`;
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
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.citation || "");
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy citation"), 1400);
      } catch {}
    });
  });

  // Make only the background of the publication card clickable if DOI link exists
  document.querySelectorAll(".publication-card[data-doi]").forEach((card) => {
    const doi = card.getAttribute("data-doi");
    if (doi) {
      const bgLink = card.querySelector(".publication-card-bg-link");
      if (bgLink) {
        bgLink.addEventListener("click", function (e) {
          window.open(decodeURIComponent(doi), "_blank");
        });
        // Allow text selection on the rest of the card
        bgLink.addEventListener("mousedown", function (e) {
          // Only trigger if not selecting text
          if (e.detail > 1) e.preventDefault();
        });
      }
    }
  });
}

function formatPeriod(period) {
  if (!period) return "";
  // Try to match ranges like 'Jun 2025 – Jun 2027' or 'Feb 2021 - Jul 2021'
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
    // Always show a dash between the dates
    return `<span>${format(parts[0])}</span> - <span>${format(
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
    // Group tags into paragraphs of 4
    const tagArr = (proj["science tags"] || "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
    let tags = "";
    for (let i = 0; i < tagArr.length; i += 4) {
      tags +=
        `<p class='flex flex-wrap gap-2 mt-0 mb-0'>` +
        tagArr
          .slice(i, i + 4)
          .map(
            (t) =>
              `<span class='inline-flex rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-semibold'>${t}</span>`
          )
          .join(" ") +
        `</p>`;
    }
    const dois = (proj["doi to articles that came out of the project"] || "")
      .split(";")
      .filter(Boolean)
      .map(
        (doi) =>
          `<a href='${doi}' class='inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50' target='_blank' rel='noopener noreferrer'>DOI</a>`
      )
      .join(" ");
    // image: prefer 'images' column, then 'image', then 'image url'
    const imgUrl = (
      proj["images"] ||
      proj["image"] ||
      proj["image url"] ||
      ""
    ).trim();
    console.log("Project:", proj["title"], "| Image URL:", imgUrl);
    const imageHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${(proj["title"] || "").replace(
          /"/g,
          ""
        )}" loading="lazy" class="w-full h-full object-cover">`
      : `<img src="assets/images/template.jpg" alt="Project image" loading="lazy" class="w-full h-full object-cover">`;

    // Add a background link if 'project link' field exists
    const projectLink = proj["project link"] || "";
    list.innerHTML += `
        <article class="project-card rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-soft relative">
          ${
            projectLink
              ? `<div class="project-card-bg-link" style="position:absolute;inset:0;z-index:2;cursor:pointer;"></div>`
              : ""
          }
          <div class="aspect-[16/10] overflow-hidden">${imageHtml}</div>
          <div class="p-5">
            <div class="flex flex-col items-start gap-0">
              <h3 class="text-lg font-semibold">${proj["title"] || ""}</h3>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-neutral-500">${
                proj["role"] || ""
              }</span>
              <span class="text-xs text-neutral-500">${
                proj["budget"] || ""
              }</span>
            </div>
            <div class="mt-2 text-sm text-neutral-700">${
              proj["very short description"] || ""
            }</div>
            <div class="mt-2 text-xs text-neutral-500">${
              proj["tl;dr"] || ""
            }</div>
            <div class="mt-3 flex flex-wrap gap-2">${tags}</div>
            <div class="mt-4 flex flex-wrap gap-2">${dois}</div>
            <span class="absolute bottom-4 right-5 text-[10px] text-neutral-400">${formatPeriod(
              proj["period"] || ""
            )}</span>
          </div>
        </article>
      `;
    // Make only the background of the project card clickable if project link exists
    document
      .querySelectorAll(".project-card-bg-link")
      .forEach((bgLink, idx) => {
        const card = bgLink.closest(".project-card");
        // Find the corresponding project from the rendered list
        const project = projects[idx];
        if (project && project["project link"]) {
          bgLink.addEventListener("click", function (e) {
            window.open(project["project link"], "_blank");
          });
          // Allow text selection on the rest of the card
          bgLink.addEventListener("mousedown", function (e) {
            if (e.detail > 1) e.preventDefault();
          });
        }
      });
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
