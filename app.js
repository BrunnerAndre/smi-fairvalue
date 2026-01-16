let smi = [];
let selected = null;

function pct(id) {
  return (parseFloat(document.getElementById(id).value) || 0) / 100.0;
}
function num(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function dcfPerShare({ fcf0, g1, gT, r, years, netCash, shares }) {
  if (!isFinite(fcf0) || fcf0 <= 0 || !isFinite(shares) || shares <= 0) return null;
  if (!isFinite(r) || !isFinite(gT) || r <= gT) return null; // schützt vor explodierendem TV

  let pv = 0;
  let fcf = fcf0;

  for (let t = 1; t <= years; t++) {
    const g = t <= 5 ? g1 : gT;
    fcf = fcf * (1 + g);
    pv += fcf / Math.pow(1 + r, t);
  }

  // Terminal Value am Ende von "years" via Gordon Growth
  const tv = (fcf * (1 + gT)) / (r - gT);
  const pvTv = tv / Math.pow(1 + r, years);

  const equityValue = pv + pvTv + (netCash || 0);
  return equityValue / shares;
}

function fairValueBand(stock, params) {
  const base = dcfPerShare({
    fcf0: stock.fcf,
    netCash: stock.netCash,
    shares: stock.shares,
    g1: params.g1,
    gT: params.gT,
    r: params.r,
    years: params.years,
  });

  const low = dcfPerShare({
    fcf0: stock.fcf,
    netCash: stock.netCash,
    shares: stock.shares,
    g1: Math.max(params.g1 - 0.015, 0),
    gT: Math.max(params.gT - 0.005, 0),
    r: params.r + 0.01,
    years: params.years,
  });

  const high = dcfPerShare({
    fcf0: stock.fcf,
    netCash: stock.netCash,
    shares: stock.shares,
    g1: params.g1 + 0.015,
    gT: params.gT + 0.005,
    r: Math.max(params.r - 0.01, params.gT + 0.01),
    years: params.years,
  });

  return { low, base, high };
}

function fmt(x, ccy = "CHF") {
  if (x === null || !isFinite(x)) return "—";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 0,
  }).format(x);
}

function currentParams() {
  return {
    g1: pct("g1"),
    gT: pct("gT"),
    r: pct("r"),
    years: Math.max(5, Math.floor(num("years") || 10)),
  };
}

function renderList() {
  const params = currentParams();
  const el = document.getElementById("list");
  el.innerHTML = "";

  smi.forEach((s) => {
    const band = fairValueBand(s, params);

    const item = document.createElement("div");
    item.className = "item";
    item.onclick = () => {
      selected = s.symbol;
      renderDetail();
    };

    const left = document.createElement("div");
    left.innerHTML = `
      <div><strong>${s.name}</strong> <span class="muted">(${s.symbol})</span></div>
      <div class="muted small">FCF: ${s.fcf ? s.fcf.toLocaleString("de-CH") : "—"} | Shares: ${s.shares ? s.shares.toLocaleString("de-CH") : "—"}</div>
    `;

    const right = document.createElement("div");
    right.innerHTML = `<span class="badge">${fmt(band.base, s.currency)}</span>`;

    item.appendChild(left);
    item.appendChild(right);
    el.appendChild(item);
  });
}

function renderDetail() {
  const params = currentParams();
  const s = smi.find((x) => x.symbol === selected);
  const el = document.getElementById("detail");

  if (!s) {
    el.innerHTML = `<div class="muted">Bitte links einen Titel auswählen.</div>`;
    return;
  }

  const band = fairValueBand(s, params);

  el.innerHTML = `
    <div><strong>${s.name}</strong> <span class="muted">(${s.symbol})</span></div>

    <div class="kv">
      <div class="muted">Fair Value (low)</div><div>${fmt(band.low, s.currency)}</div>
      <div class="muted">Fair Value (base)</div><div>${fmt(band.base, s.currency)}</div>
      <div class="muted">Fair Value (high)</div><div>${fmt(band.high, s.currency)}</div>
    </div>

    <hr />

    <div class="form-grid">
      <label>FCF (jährlich, in ${s.currency})
        <input id="fcf" type="number" step="1" value="${s.fcf || 0}" />
      </label>

      <label>Net Cash (+) / Net Debt (−)
        <input id="netCash" type="number" step="1" value="${s.netCash || 0}" />
      </label>

      <label>Shares Outstanding
        <input id="shares" type="number" step="1" value="${s.shares || 0}" />
      </label>
    </div>

    <div class="row">
      <button id="save">Speichern</button>
      <button id="clear">Zurücksetzen (Titel)</button>
    </div>

    <p class="muted small">
      Tipp: Trage FCF/Net Cash/Shares ein. Ohne FCF & Shares wird kein Fair Value berechnet.
    </p>
  `;

  document.getElementById("save").onclick = () => {
    s.fcf = parseFloat(document.getElementById("fcf").value) || 0;
    s.netCash = parseFloat(document.getElementById("netCash").value) || 0;
    s.shares = parseFloat(document.getElementById("shares").value) || 0;
    persist();
    renderList();
    renderDetail();
  };

  document.getElementById("clear").onclick = () => {
    s.fcf = 0;
    s.netCash = 0;
    s.shares = 0;
    persist();
    renderList();
    renderDetail();
  };
}

function persist() {
  localStorage.setItem("smiFairValueData", JSON.stringify(smi));
}

async function load() {
  const stored = localStorage.getItem("smiFairValueData");
  if (stored) {
    smi = JSON.parse(stored);
  } else {
    const res = await fetch("./smi.json");
    smi = await res.json();
  }
  renderList();
  renderDetail();
}

document.getElementById("recalc").onclick = () => {
  renderList();
  renderDetail();
};

document.getElementById("reset").onclick = () => {
  document.getElementById("g1").value = 3.5;
  document.getElementById("gT").value = 1.5;
  document.getElementById("r").value = 7.5;
  document.getElementById("years").value = 10;
  renderList();
  renderDetail();
};

load();
