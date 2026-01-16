let smi = [];
let selected = null;

function fmtMoney(x, ccy = "CHF") {
  if (x === null || x === undefined || !isFinite(x) || x === 0) return "—";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 0,
  }).format(x);
}

function fmtPct(x) {
  if (x === null || x === undefined || !isFinite(x) || x === 0) return "—";
  const v = Math.round(x * 10) / 10;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}

function badgeClass(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("unter")) return "badge badge-green";
  if (l.includes("über")) return "badge badge-red";
  if (l.includes("fair")) return "badge badge-yellow";
  return "badge badge-gray";
}

function pctClass(x) {
  if (!isFinite(x) || x === 0) return "";
  return x > 0 ? "pct-pos" : "pct-neg";
}

function safeNum(x) {
  const v = Number(x);
  return isFinite(v) ? v : 0;
}

function renderTable() {
  const tbody = document.getElementById("list");
  tbody.innerHTML = "";

  // Sort: most undervalued first (highest upside)
  const rows = [...smi].sort((a, b) => safeNum(b.upsidePct) - safeNum(a.upsidePct));

  rows.forEach((s) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => {
      selected = s.symbol;
      renderDetail();
    };

    const ccy = s.currency || "CHF";
    const price = safeNum(s.price);
    const fv = safeNum(s.fairValueBase);
    const up = safeNum(s.upsidePct);
    const label = s.valuationLabel || "unbekannt";

    tr.innerHTML = `
      <td>
        <strong>${s.name}</strong><span class="sym">(${s.symbol})</span>
      </td>
      <td>${fmtMoney(price, ccy)}</td>
      <td>${fmtMoney(fv, ccy)}</td>
      <td class="${pctClass(up)}">${fmtPct(up)}</td>
      <td><span class="${badgeClass(label)}">${label}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

function renderDetail() {
  const el = document.getElementById("detail");
  const s = smi.find((x) => x.symbol === selected);

  if (!s) {
    el.innerHTML = `<div class="muted">Bitte in der Tabelle einen Titel auswählen.</div>`;
    return;
  }

  const ccy = s.currency || "CHF";
  const price = safeNum(s.price);
  const low = safeNum(s.fairValueLow);
  const base = safeNum(s.fairValueBase);
  const high = safeNum(s.fairValueHigh);
  const up = safeNum(s.upsidePct);
  const label = s.valuationLabel || "unbekannt";
  const updated = s.lastUpdatedUtc || "—";

  el.innerHTML = `
    <div>
      <strong>${s.name}</strong> <span class="muted">(${s.symbol})</span>
    </div>

    <div class="kv">
      <div class="muted">Kurs</div><div>${fmtMoney(price, ccy)}</div>
      <div class="muted">Fair Value (low)</div><div>${fmtMoney(low, ccy)}</div>
      <div class="muted">Fair Value (base)</div><div>${fmtMoney(base, ccy)}</div>
      <div class="muted">Fair Value (high)</div><div>${fmtMoney(high, ccy)}</div>
      <div class="muted">Upside</div><div class="${pctClass(up)}">${fmtPct(up)}</div>
      <div class="muted">Ampel</div><div><span class="${badgeClass(label)}">${label}</span></div>
      <div class="muted">Letztes Update (UTC)</div><div class="muted small">${updated}</div>
    </div>

    <hr />

    <p class="muted small">
      Hinweis: Fair Values basieren auf DCF-Annahmen und den im Repo gepflegten Fundamentals (FCF/Net Cash/Shares).
    </p>
  `;
}

async function load() {
  // IMPORTANT: Do NOT use localStorage anymore for the main view,
  // because we want the canonical data from smi.json.
  const res = await fetch("./smi.json", { cache: "no-store" });
  smi = await res.json();

  renderTable();
  renderDetail();
}

load();
