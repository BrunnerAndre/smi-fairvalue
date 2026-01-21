// Theo Capital — SMI Dummy + Detail Panel (ARK-ish)
// Step A: Sorting + Selected Row + Deep-link (?symbol=) + URL updates.

const QUOTE_API = "https://<DEIN-WORKER>.workers.dev/api/quotes";


const SMI = [
  { name: "ABB", symbol: "ABBN.SW", base: 44.20, fairValue: 50.00, growth: 6.0, margin: 9.5 },
  { name: "Alcon", symbol: "ALCN.SW", base: 74.30, fairValue: 82.00, growth: 7.0, margin: 14.0 },
  { name: "Geberit", symbol: "GEBN.SW", base: 520.00, fairValue: 560.00, growth: 5.0, margin: 18.0 },
  { name: "Givaudan", symbol: "GIVN.SW", base: 3900.00, fairValue: 4100.00, growth: 6.5, margin: 12.5 },
  { name: "Holcim", symbol: "HOLN.SW", base: 70.50, fairValue: 78.00, growth: 4.5, margin: 8.0 },
  { name: "Kuehne+Nagel", symbol: "KNIN.SW", base: 240.00, fairValue: 255.00, growth: 5.5, margin: 10.0 },
  { name: "Logitech", symbol: "LOGN.SW", base: 82.00, fairValue: 90.00, growth: 8.0, margin: 12.0 },
  { name: "Lonza", symbol: "LONN.SW", base: 430.00, fairValue: 470.00, growth: 7.5, margin: 16.0 },
  { name: "Nestlé", symbol: "NESN.SW", base: 98.50, fairValue: 110.00, growth: 4.0, margin: 11.0 },
  { name: "Novartis", symbol: "NOVN.SW", base: 92.80, fairValue: 105.00, growth: 5.0, margin: 19.0 },
  { name: "Partners Group", symbol: "PGHN.SW", base: 1270.00, fairValue: 1350.00, growth: 9.0, margin: 22.0 },
  { name: "Richemont", symbol: "CFR.SW", base: 120.00, fairValue: 132.00, growth: 7.0, margin: 16.0 },
  { name: "Roche", symbol: "ROG.SW", base: 245.00, fairValue: 260.00, growth: 4.5, margin: 18.5 },
  { name: "Sika", symbol: "SIKA.SW", base: 265.00, fairValue: 290.00, growth: 7.5, margin: 12.5 },
  { name: "Sonova", symbol: "SOON.SW", base: 300.00, fairValue: 320.00, growth: 6.0, margin: 14.5 },
  { name: "Swiss Life", symbol: "SLHN.SW", base: 710.00, fairValue: 760.00, growth: 5.0, margin: 9.0 },
  { name: "Swiss Re", symbol: "SREN.SW", base: 105.00, fairValue: 112.00, growth: 4.0, margin: 7.5 },
  { name: "Swisscom", symbol: "SCMN.SW", base: 520.00, fairValue: 545.00, growth: 2.5, margin: 12.0 },
  { name: "UBS", symbol: "UBSG.SW", base: 28.00, fairValue: 32.00, growth: 5.5, margin: 10.5 },
  { name: "Zurich Insurance", symbol: "ZURN.SW", base: 455.00, fairValue: 500.00, growth: 4.0, margin: 8.5 },
];

function fmt(x, digits = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return Number(x).toFixed(digits);
}
function pct(x, digits = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${Number(x).toFixed(digits)}%`;
}
function makeDummyQuote(base) {
  const dp = (Math.random() * 4) - 2;
  const c = base * (1 + dp / 100);
  const d = c - base;
  return { c, d, dp };
}
function discountPct(price, fairValue) {
  return ((fairValue - price) / fairValue) * 100;
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function makeSparkSeries(anchor, n = 30) {
  let v = anchor;
  const out = [];
  for (let i = 0; i < n; i++) {
    const step = (Math.random() - 0.5) * 0.9;
    v = Math.max(0.1, v * (1 + step / 100));
    out.push(v);
  }
  return out;
}
function sparkPath(values, w = 160, h = 46, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = (max - min) || 1;
  const xStep = (w - pad * 2) / (values.length - 1);

  return values.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}
function impliedFromPrice(price, fairValue, baseGrowth, baseMargin) {
  const disc = ((fairValue - price) / fairValue) * 100;
  const g = clamp(baseGrowth - disc * 0.12, 0.5, 15);
  const m = clamp(baseMargin - disc * 0.08, 1, 35);
  return { disc, g, m };
}
function narrative({ disc, growth, margin }) {
  if (disc >= 0) {
    return `Die Aktie handelt mit einem Discount zum Fair Value. Das deutet darauf hin, dass der Markt konservativere Annahmen einpreist — z.B. geringeres zukünftiges Wachstum (≈ ${growth.toFixed(1)}% p.a.) oder Margendruck (Net income margin ≈ ${margin.toFixed(1)}%). Ein Re-Rating wäre möglich, falls Wachstum/Margen stabiler ausfallen oder das Risiko sinkt.`;
  }
  return `Die Aktie handelt mit einem Premium zum Fair Value. Der Markt preist damit überdurchschnittliche Erwartungen ein — typischerweise höheres Wachstum (≈ ${growth.toFixed(1)}% p.a.) und/oder robuste Margen (Net income margin ≈ ${margin.toFixed(1)}%). Wichtig ist, ob diese Annahmen nachhaltig sind; bei Enttäuschungen droht Multiple-Compression.`;
}

// --- State (Step A) ---
let sortKey = "disc";
let sortDir = "desc"; // default: biggest discount first
let selectedSymbol = null;

window.addEventListener("DOMContentLoaded", () => {
  const elTbody = document.getElementById("tbody");
  const elStatus = document.getElementById("status");
  const elLast = document.getElementById("lastUpdate");
  const elFilter = document.getElementById("filter");
  const elRefresh = document.getElementById("refreshBtn");
  const elCount = document.getElementById("count");
  const elDetail = document.getElementById("detail");
  const elDetailCloseBtn = document.getElementById("detailCloseBtn");
  const elTable = document.getElementById("smiTable");

  if (!elTbody || !elTable) return;

  let quotes = new Map();

  function seedQuotes() {
    quotes.clear();
    for (const r of SMI) quotes.set(r.symbol, makeDummyQuote(r.base));
  }

  function getRowComputed(r) {
    const q = quotes.get(r.symbol);
    const disc = discountPct(q.c, r.fairValue);
    return {
      ...r,
      quote: q,
      disc,
      delta: q.d,
      deltaPct: q.dp,
      price: q.c
    };
  }

  function compare(a, b) {
    const dir = sortDir === "asc" ? 1 : -1;
    const va = a[sortKey];
    const vb = b[sortKey];

    // string sort
    if (typeof va === "string" || typeof vb === "string") {
      return dir * String(va).localeCompare(String(vb), "de", { sensitivity: "base" });
    }
    // number sort
    return dir * ((va ?? 0) - (vb ?? 0));
  }

  function render() {
    const q = (elFilter?.value || "").trim().toLowerCase();
    let rows = SMI
      .filter(r => !q || r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q))
      .map(getRowComputed);

    rows.sort(compare);

    elCount.textContent = rows.length;

    elTbody.innerHTML = rows.map(r => {
      const moveCls = r.deltaPct >= 0 ? "tc-pos" : "tc-neg";
      const discCls = r.disc >= 0 ? "tc-discount" : "tc-premium";
      const selectedCls = r.symbol === selectedSymbol ? "is-selected" : "";

      return `
        <tr data-symbol="${r.symbol}" class="${selectedCls}">
          <td>${r.name}</td>
          <td class="tc-mono">${r.symbol}</td>
          <td class="tc-num">${fmt(r.price)}</td>
          <td class="tc-num">${fmt(r.fairValue)}</td>
          <td><span class="tc-badge2 ${discCls}">${pct(r.disc)}</span></td>
          <td class="tc-num ${moveCls}">${fmt(r.delta)}</td>
          <td class="tc-num ${moveCls}">${pct(r.deltaPct)}</td>
        </tr>
      `;
    }).join("");
  }

  function setScenario(r, quote, scenarios, active) {
    const sc = scenarios[active];

    const elDetailTitle = document.getElementById("detailTitle");
    const elDetailSubtitle = document.getElementById("detailSubtitle");
    const elDetailPrice = document.getElementById("detailPrice");
    const elDetailFairValue = document.getElementById("detailFairValue");
    const elDetailDiscPrem = document.getElementById("detailDiscPrem");
    const elDetailGrowth = document.getElementById("detailGrowth");
    const elDetailMargin = document.getElementById("detailMargin");
    const elDetailNarrative = document.getElementById("detailNarrative");
    const elDetailImplied = document.getElementById("detailImplied");
    const elDetailMvFv = document.getElementById("detailMvFv");
    const elDetailUpside = document.getElementById("detailUpside");

    const disc = ((sc.fv - quote.c) / sc.fv) * 100;
    const cls = disc >= 0 ? "tc-discount" : "tc-premium";

    elDetailTitle.textContent = r.name;
    elDetailSubtitle.textContent = `${r.symbol} • Scenario: ${active.toUpperCase()} (dummy)`;

    elDetailPrice.textContent = `${fmt(quote.c)} CHF`;
    elDetailFairValue.textContent = `${fmt(sc.fv)} CHF`;
    elDetailDiscPrem.innerHTML = `Discount / Premium: <span class="tc-badge2 ${cls}">${pct(disc)}</span>`;

    elDetailGrowth.textContent = `${fmt(sc.growth, 1)}% p.a.`;
    elDetailMargin.textContent = `${fmt(sc.margin, 1)}%`;

    const impl = impliedFromPrice(quote.c, sc.fv, sc.growth, sc.margin);
    elDetailImplied.textContent =
      `Ausgehend vom aktuellen Kurs impliziert der Markt grob ein Wachstum von ca. ${impl.g.toFixed(1)}% p.a. ` +
      `und eine Net-Income-Marge von ca. ${impl.m.toFixed(1)}% (Dummy-Heuristik).`;

    elDetailNarrative.textContent = narrative({ disc, growth: sc.growth, margin: sc.margin });

    elDetailMvFv.textContent = `${fmt(quote.c)} vs ${fmt(sc.fv)} CHF`;
    const upside = ((sc.fv - quote.c) / quote.c) * 100;
    elDetailUpside.textContent = pct(upside);

    document.querySelectorAll(".tc-tab").forEach(b => {
      b.classList.toggle("is-active", b.getAttribute("data-scn") === active);
    });
  }

  function openDetail(symbol, { pushUrl = true } = {}) {
    const r = SMI.find(x => x.symbol === symbol);
    if (!r) return;

    const quote = quotes.get(r.symbol) || makeDummyQuote(r.base);

    // mark selected
    selectedSymbol = r.symbol;
    render();

    // update URL
    if (pushUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("symbol", r.symbol);
      history.pushState({ symbol: r.symbol }, "", url);
    }

    // sparkline
    const elSparkPath = document.getElementById("sparkPath");
    const series = makeSparkSeries(quote.c, 30);
    if (elSparkPath) elSparkPath.setAttribute("d", sparkPath(series));

    const scenarios = {
      base: { fv: r.fairValue, growth: r.growth, margin: r.margin },
      bull: { fv: r.fairValue * 1.10, growth: r.growth + 1.5, margin: r.margin + 1.0 },
      bear: { fv: r.fairValue * 0.90, growth: Math.max(0.5, r.growth - 1.5), margin: Math.max(1, r.margin - 1.0) },
    };

    // show panel
    elDetail.style.display = "block";
    elDetail.scrollIntoView({ behavior: "smooth", block: "start" });

    // tabs
    document.querySelectorAll(".tc-tab").forEach(btn => {
      btn.onclick = () => setScenario(r, quote, scenarios, btn.getAttribute("data-scn"));
    });

    setScenario(r, quote, scenarios, "base");
  }

  function closeDetail({ clearUrl = true } = {}) {
    elDetail.style.display = "none";
    selectedSymbol = null;
    render();

    if (clearUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("symbol");
      history.pushState({}, "", url);
    }
  }

  function refresh() {
    elStatus.textContent = "Refreshing…";
    elRefresh.disabled = true;

    setTimeout(() => {
      seedQuotes();
      render();
      elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;
      elStatus.textContent = "OK";
      elRefresh.disabled = false;
      closeDetail({ clearUrl: false }); // keep URL unless you want to clear it
    }, 150);
  }

  // --- Events ---
  elTbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-symbol]");
    if (!tr) return;
    openDetail(tr.getAttribute("data-symbol"));
  });

  elDetailCloseBtn.addEventListener("click", () => closeDetail());

  elFilter.addEventListener("input", () => {
    // if filter hides selected row, keep selection but it won’t show in table; OK for MVP
    render();
  });

  elRefresh.addEventListener("click", refresh);

  // sort header clicks
  elTable.querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;

    const key = th.getAttribute("data-sort");
    if (sortKey === key) {
      sortDir = (sortDir === "asc") ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = (key === "disc") ? "desc" : "asc"; // sensible defaults
    }
    render();
  });

  // back/forward handling
  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    const sym = url.searchParams.get("symbol");
    if (sym) openDetail(sym, { pushUrl: false });
    else closeDetail({ clearUrl: false });
  });

  // init
  seedQuotes();
  render();
  elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;

  // deep-link open
  const url = new URL(window.location.href);
  const sym = url.searchParams.get("symbol");
  if (sym) openDetail(sym, { pushUrl: false });
});
