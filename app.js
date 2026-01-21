function openDetail(symbol) {
  const r = SMI.find(x => x.symbol === symbol);
  if (!r) return;

  const quote = quotes.get(r.symbol) || makeDummyQuote(r.base);

  // scenario multipliers (dummy)
  const scenarios = {
    base: { fv: r.fairValue, growth: r.growth, margin: r.margin },
    bull: { fv: r.fairValue * 1.10, growth: r.growth + 1.5, margin: r.margin + 1.0 },
    bear: { fv: r.fairValue * 0.90, growth: Math.max(0.5, r.growth - 1.5), margin: Math.max(1, r.margin - 1.0) },
  };

  let active = "base";

  // elements
  const elDetail = document.getElementById("detail");
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

  const elSparkPath = document.getElementById("sparkPath");

  function setScenario(scn) {
    active = scn;
    const sc = scenarios[active];

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

    // Market vs Fair + Upside
    elDetailMvFv.textContent = `${fmt(quote.c)} vs ${fmt(sc.fv)} CHF`;
    const upside = ((sc.fv - quote.c) / quote.c) * 100;
    elDetailUpside.textContent = pct(upside);

    // Update active tab UI
    document.querySelectorAll(".tc-tab").forEach(b => {
      b.classList.toggle("is-active", b.getAttribute("data-scn") === active);
    });
  }

  // sparkline
  const series = makeSparkSeries(quote.c, 30);
  if (elSparkPath) elSparkPath.setAttribute("d", sparkPath(series));

  // show
  elDetail.style.display = "block";
  elDetail.scrollIntoView({ behavior: "smooth", block: "start" });

  // wire tabs (once per open)
  document.querySelectorAll(".tc-tab").forEach(btn => {
    btn.onclick = () => setScenario(btn.getAttribute("data-scn"));
  });

  // set default
  setScenario("base");
}
