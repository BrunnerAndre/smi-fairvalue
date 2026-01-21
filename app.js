// Theo Capital — SMI Dummy quotes (no API)
// Robust init: waits for DOMContentLoaded + basic diagnostics.

const SMI = [
  { name: "ABB", symbol: "ABBN.SW", base: 44.20, fairValue: 50.00 },
  { name: "Alcon", symbol: "ALCN.SW", base: 74.30, fairValue: 82.00 },
  { name: "Geberit", symbol: "GEBN.SW", base: 520.00, fairValue: 560.00 },
  { name: "Givaudan", symbol: "GIVN.SW", base: 3900.00, fairValue: 4100.00 },
  { name: "Holcim", symbol: "HOLN.SW", base: 70.50, fairValue: 78.00 },
  { name: "Kuehne+Nagel", symbol: "KNIN.SW", base: 240.00, fairValue: 255.00 },
  { name: "Logitech", symbol: "LOGN.SW", base: 82.00, fairValue: 90.00 },
  { name: "Lonza", symbol: "LONN.SW", base: 430.00, fairValue: 470.00 },
  { name: "Nestlé", symbol: "NESN.SW", base: 98.50, fairValue: 110.00 },
  { name: "Novartis", symbol: "NOVN.SW", base: 92.80, fairValue: 105.00 },
  { name: "Partners Group", symbol: "PGHN.SW", base: 1270.00, fairValue: 1350.00 },
  { name: "Richemont", symbol: "CFR.SW", base: 120.00, fairValue: 132.00 },
  { name: "Roche", symbol: "ROG.SW", base: 245.00, fairValue: 260.00 },
  { name: "Sika", symbol: "SIKA.SW", base: 265.00, fairValue: 290.00 },
  { name: "Sonova", symbol: "SOON.SW", base: 300.00, fairValue: 320.00 },
  { name: "Swiss Life", symbol: "SLHN.SW", base: 710.00, fairValue: 760.00 },
  { name: "Swiss Re", symbol: "SREN.SW", base: 105.00, fairValue: 112.00 },
  { name: "Swisscom", symbol: "SCMN.SW", base: 520.00, fairValue: 545.00 },
  { name: "UBS", symbol: "UBSG.SW", base: 28.00, fairValue: 32.00 },
  { name: "Zurich Insurance", symbol: "ZURN.SW", base: 455.00, fairValue: 500.00 },
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
  const dp = (Math.random() * 4) - 2; // -2%..+2%
  const c = base * (1 + dp / 100);
  const d = c - base;
  return { c, d, dp };
}

function discountPct(price, fairValue) {
  return ((fairValue - price) / fairValue) * 100; // + = discount
}

window.addEventListener("DOMContentLoaded", () => {
  // Grab DOM nodes AFTER DOM is ready
  const elTbody = document.getElementById("tbody");
  const elStatus = document.getElementById("status");
  const elLast = document.getElementById("lastUpdate");
  const elFilter = document.getElementById("filter");
  const elRefresh = document.getElementById("refreshBtn");
  const elCount = document.getElementById("count");

  // Hard fail early if markup doesn't match
  if (!elTbody) {
    console.error("[TheoCapital] #tbody not found. Check index.html has <tbody id='tbody'></tbody>.");
    return;
  }

  // Diagnostics: confirms app.js is loaded
  console.log("[TheoCapital] app.js loaded. Rendering rows:", SMI.length);

  let quotes = new Map(); // symbol -> {c,d,dp}

  function seedQuotes() {
    quotes.clear();
    for (const r of SMI) quotes.set(r.symbol, makeDummyQuote(r.base));
  }

  function render() {
    const q = (elFilter?.value || "").trim().toLowerCase();
    const rows = SMI.filter(r =>
      !q || r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q)
    );

    if (elCount) elCount.textContent = String(rows.length);

    elTbody.innerHTML = rows.map(r => {
      const quote = quotes.get(r.symbol) || makeDummyQuote(r.base);
      const clsMove = quote.dp >= 0 ? "tc-pos" : "tc-neg";

      const disc = discountPct(quote.c, r.fairValue);
      const badgeCls = disc >= 0 ? "tc-discount" : "tc-premium";

      return `
        <tr>
          <td>${r.name}</td>
          <td class="tc-mono">${r.symbol}</td>
          <td class="tc-num">${fmt(quote.c)}</td>
          <td class="tc-num">${fmt(r.fairValue)}</td>
          <td><span class="tc-badge2 ${badgeCls}">${pct(disc)}</span></td>
          <td class="tc-num ${clsMove}">${fmt(quote.d)}</td>
          <td class="tc-num ${clsMove}">${pct(quote.dp)}</td>
        </tr>
      `;
    }).join("");
  }

  function refresh() {
    if (elRefresh) elRefresh.disabled = true;
    if (elStatus) elStatus.textContent = "Refreshing…";

    setTimeout(() => {
      seedQuotes();
      render();
      if (elLast) elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;
      if (elStatus) elStatus.textContent = "OK";
      if (elRefresh) elRefresh.disabled = false;
    }, 150);
  }

  // Wire events
  if (elFilter) elFilter.addEventListener("input", render);
  if (elRefresh) elRefresh.addEventListener("click", refresh);

  // Init
  seedQuotes();
  render();
  if (elLast) elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;
});
