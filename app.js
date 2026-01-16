// SMI Dummy quotes — no API

const SMI = [
  { name: "ABB", symbol: "ABBN.SW", base: 44.20 },
  { name: "Alcon", symbol: "ALCN.SW", base: 74.30 },
  { name: "Geberit", symbol: "GEBN.SW", base: 520.00 },
  { name: "Givaudan", symbol: "GIVN.SW", base: 3900.00 },
  { name: "Holcim", symbol: "HOLN.SW", base: 70.50 },
  { name: "Kuehne+Nagel", symbol: "KNIN.SW", base: 240.00 },
  { name: "Logitech", symbol: "LOGN.SW", base: 82.00 },
  { name: "Lonza", symbol: "LONN.SW", base: 430.00 },
  { name: "Nestlé", symbol: "NESN.SW", base: 98.50 },
  { name: "Novartis", symbol: "NOVN.SW", base: 92.80 },
  { name: "Partners Group", symbol: "PGHN.SW", base: 1270.00 },
  { name: "Richemont", symbol: "CFR.SW", base: 120.00 },
  { name: "Roche", symbol: "ROG.SW", base: 245.00 },
  { name: "Sika", symbol: "SIKA.SW", base: 265.00 },
  { name: "Sonova", symbol: "SOON.SW", base: 300.00 },
  { name: "Swiss Life", symbol: "SLHN.SW", base: 710.00 },
  { name: "Swiss Re", symbol: "SREN.SW", base: 105.00 },
  { name: "Swisscom", symbol: "SCMN.SW", base: 520.00 },
  { name: "UBS", symbol: "UBSG.SW", base: 28.00 },
  { name: "Zurich Insurance", symbol: "ZURN.SW", base: 455.00 },
];

const elTbody = document.getElementById("tbody");
const elStatus = document.getElementById("status");
const elLast = document.getElementById("lastUpdate");
const elFilter = document.getElementById("filter");
const elRefresh = document.getElementById("refreshBtn");
const elCount = document.getElementById("count");

function fmt(x, digits=2){
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return Number(x).toFixed(digits);
}
function pct(x, digits=2){
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return `${Number(x).toFixed(digits)}%`;
}

// Dummy generator: kleine Schwankung um base
function makeDummyQuote(base){
  // daily % change between -2.0% and +2.0%
  const dp = (Math.random() * 4) - 2;
  const c = base * (1 + dp / 100);
  const d = c - base;
  return { c, d, dp };
}

let quotes = new Map(); // symbol -> {c,d,dp}

function seedQuotes(){
  quotes.clear();
  for (const r of SMI) quotes.set(r.symbol, makeDummyQuote(r.base));
}

function render(){
  const q = (elFilter.value || "").trim().toLowerCase();
  const rows = SMI.filter(r => !q || r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q));
  elCount.textContent = String(rows.length);

  elTbody.innerHTML = rows.map(r => {
    const quote = quotes.get(r.symbol);
    const cls = quote.dp >= 0 ? "tc-pos" : "tc-neg";
    return `
      <tr>
        <td>${r.name}</td>
        <td class="tc-mono">${r.symbol}</td>
        <td class="tc-num">${fmt(quote.c)}</td>
        <td class="tc-num ${cls}">${fmt(quote.d)}</td>
        <td class="tc-num ${cls}">${pct(quote.dp)}</td>
      </tr>
    `;
  }).join("");
}

function refresh(){
  elRefresh.disabled = true;
  elStatus.textContent = "Würfle…";

  // kleine künstliche Verzögerung für “loading feel”
  setTimeout(() => {
    seedQuotes();
    render();
    elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;
    elStatus.textContent = "OK";
    elRefresh.disabled = false;
  }, 250);
}

elFilter.addEventListener("input", render);
elRefresh.addEventListener("click", refresh);

// init
seedQuotes();
render();
elLast.textContent = `Stand: ${new Date().toLocaleString("de-CH")}`;
