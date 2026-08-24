const state = {
  families: [],
  activeCategory: "All",
  query: "",
  meta: null,
};

const resultsEl = document.getElementById("results");
const searchEl = document.getElementById("search");
const chipsEl = document.getElementById("chips");
const statusEl = document.getElementById("status");
const detailEl = document.getElementById("detail");
const detailBodyEl = document.getElementById("detailBody");
const closeDetailEl = document.getElementById("closeDetail");

function flattenItems() {
  const items = [];
  for (const fam of state.families) {
    for (const variant of fam.variants) {
      items.push({ fam, variant });
    }
  }
  return items;
}

function expandedColors(item) {
  const legend = (state.meta && state.meta.colorLegend) || {};
  return (item.variant.colors || []).map((c) => legend[c] || c);
}

function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [
    item.variant.catalogNumber,
    item.variant.description,
    fam_title(item),
    item.fam.category,
    item.fam.subcategory,
    (item.variant.colors || []).join(" "),
    expandedColors(item).join(" "),
    item.variant.nema ? `NEMA ${item.variant.nema}` : "",
    item.variant.voltage,
    item.variant.amps ? `${item.variant.amps}A ${item.variant.amps} amp` : "",
  ].join(" ").toLowerCase();

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => hay.includes(term));
}

function fam_title(item) {
  return item.fam.title;
}

function matchesCategory(item, cat) {
  if (cat === "All") return true;
  return item.fam.category === cat;
}

function render() {
  const items = flattenItems().filter(
    (it) => matchesQuery(it, state.query) && matchesCategory(it, state.activeCategory)
  );

  resultsEl.innerHTML = "";
  if (items.length === 0) {
    resultsEl.innerHTML = `<div class="empty">No matches. Try a different catalog number or keyword.</div>`;
    return;
  }

  for (const item of items.slice(0, 200)) {
    const card = document.createElement("div");
    card.className = "card";
    const colors = (item.variant.colors || []).join(", ");
    const ratingBits = [];
    if (item.variant.amps) ratingBits.push(`${item.variant.amps}A`);
    if (item.variant.voltage) ratingBits.push(item.variant.voltage);
    if (item.variant.nema) ratingBits.push(`NEMA ${item.variant.nema}`);

    card.innerHTML = `
      <div class="card-top">
        <span class="card-cat">${item.fam.category}${item.fam.subcategory ? " · " + item.fam.subcategory : ""}</span>
      </div>
      <div class="card-sku">${item.variant.catalogNumber}</div>
      <div class="card-desc">${item.variant.description}</div>
      <div class="card-meta">
        ${ratingBits.map((b) => `<span class="tag">${b}</span>`).join("")}
        ${colors ? `<span class="tag">${colors}</span>` : ""}
      </div>
    `;
    card.addEventListener("click", () => openDetail(item));
    resultsEl.appendChild(card);
  }
}

function specSection(title, obj) {
  if (!obj || Object.keys(obj).length === 0) return "";
  const rows = Object.entries(obj)
    .map(([k, v]) => `<div class="spec-row"><span class="k">${k}</span><span class="v">${v}</span></div>`)
    .join("");
  return `<div class="spec-section"><h3>${title}</h3>${rows}</div>`;
}

function openDetail(item) {
  const fam = item.fam;
  const v = item.variant;

  const otherVariants = fam.variants.filter((x) => x !== v);

  detailBodyEl.innerHTML = `
    <h2>${v.catalogNumber}</h2>
    <div class="sub">${fam.title} — ${v.description}</div>

    ${specSection("Rating", {
      ...(v.amps ? { Amperage: `${v.amps}A` } : {}),
      ...(v.voltage ? { Voltage: v.voltage } : {}),
      ...(v.nema ? { "NEMA Config": v.nema } : {}),
      ...(v.poles ? { Poles: v.poles } : {}),
      ...(v.colors ? { Colors: v.colors.join(", ") } : {}),
      ...(v.upc ? { UPC: v.upc } : {}),
    })}

    ${specSection("Electrical", fam.electrical)}
    ${specSection("Mechanical", fam.mechanical)}
    ${specSection("Connectivity", fam.connectivity)}
    ${specSection("Environmental", fam.environmental)}
    ${specSection("Materials", fam.materials)}
    ${fam.dimensions ? specSection("Dimensions", { "": fam.dimensions }) : ""}
    ${fam.warranty ? specSection("Warranty", { Coverage: fam.warranty }) : ""}
    ${fam.notes ? `<div class="spec-section"><h3>Notes</h3><div class="spec-row"><span class="v" style="text-align:left;flex:1">${fam.notes}</span></div></div>` : ""}

    ${fam.certifications && fam.certifications.length ? `
      <div class="spec-section">
        <h3>Certifications</h3>
        ${fam.certifications.map((c) => `<div class="spec-row"><span class="v" style="text-align:left;flex:1">${c}</span></div>`).join("")}
      </div>` : ""}

    <div class="spec-section">
      <h3>Other colors/variants in this family (${otherVariants.length})</h3>
      <div class="variant-list">
        ${otherVariants.map((ov) => `<div class="variant-row"><span class="sku">${ov.catalogNumber}</span><span>${(ov.colors || []).join(", ")}</span></div>`).join("")}
      </div>
    </div>

    <div class="source-box">
      Sourced from official Legrand/Pass &amp; Seymour spec sheet <strong>${fam.docNumber}</strong>
      (${fam.docDate}). Verify against the source before quoting.<br>
      <a href="${fam.sourceUrl}" target="_blank" rel="noopener">${fam.sourceUrl}</a>
    </div>
  `;

  detailEl.classList.remove("hidden");
}

closeDetailEl.addEventListener("click", () => detailEl.classList.add("hidden"));
detailEl.addEventListener("click", (e) => {
  if (e.target === detailEl) detailEl.classList.add("hidden");
});

function buildChips() {
  const cats = ["All", ...new Set(state.families.map((f) => f.category))];
  chipsEl.innerHTML = "";
  for (const cat of cats) {
    const chip = document.createElement("div");
    chip.className = "chip" + (cat === state.activeCategory ? " active" : "");
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      state.activeCategory = cat;
      buildChips();
      render();
    });
    chipsEl.appendChild(chip);
  }
}

searchEl.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

async function init() {
  try {
    const res = await fetch("data/ps-data.json");
    const data = await res.json();
    state.families = data.families;
    state.meta = data.meta;
    buildChips();
    render();
    const totalSkus = flattenItems().length;
    statusEl.textContent = `${totalSkus} catalog numbers · ${state.families.length} families · data as of ${data.meta.generated}`;
  } catch (err) {
    statusEl.textContent = "Failed to load data: " + err.message;
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

init();
