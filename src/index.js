export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/api/quotes") {
      const symbolsParam = url.searchParams.get("symbols") || "";
      const symbols = symbolsParam
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 50);

      if (symbols.length === 0) {
        return json({ error: "Missing symbols" }, request, 400);
      }

      const results = {};
      for (const sym of symbols) {
        try {
          const stooqCode = toStooqCode(sym);
          const stooqUrl =
            `https://stooq.com/q/l/?s=${encodeURIComponent(stooqCode)}&f=sd2t2ohlcvn&h&e=csv`;

          const resp = await fetch(stooqUrl, {
            cf: { cacheTtl: 30, cacheEverything: true },
          });
          if (!resp.ok) throw new Error(`Upstream ${resp.status}`);

          const text = await resp.text();
          results[sym] = parseStooqQuoteCsv(text);
        } catch (e) {
          results[sym] = { error: "fetch_failed" };
        }
      }

      return json({ quotes: results }, request, 200);
    }

    return json({ error: "Not found" }, request, 404);
  },
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(obj, request, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

function toStooqCode(symbol) {
  const map = {
    "ABBN.SW": "abbn.ch",
    "ALCN.SW": "alcn.ch",
    "GEBN.SW": "gebn.ch",
    "GIVN.SW": "givn.ch",
    "HOLN.SW": "holn.ch",
    "KNIN.SW": "knin.ch",
    "LOGN.SW": "logn.ch",
    "LONN.SW": "lonn.ch",
    "NESN.SW": "nesn.ch",
    "NOVN.SW": "novn.ch",
    "PGHN.SW": "pghn.ch",
    "CFR.SW": "cfr.ch",
    "ROG.SW": "rogn.ch",
    "SIKA.SW": "sika.ch",
    "SOON.SW": "soon.ch",
    "SLHN.SW": "slhn.ch",
    "SREN.SW": "sren.ch",
    "SCMN.SW": "scmn.ch",
    "UBSG.SW": "ubsg.ch",
    "ZURN.SW": "zurn.ch",
  };
  return map[symbol] || symbol.toLowerCase();
}

function parseStooqQuoteCsv(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { error: "bad_csv" };

  const header = lines[0].split(",");
  const row = lines[1].split(",");

  const idx = (name) => header.findIndex(h => h.trim().toLowerCase() === name);

  const iDate = idx("date");
  const iTime = idx("time");
  const iOpen = idx("open");
  const iClose = idx("close");

  const open = Number(row[iOpen]);
  const close = Number(row[iClose]);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return { error: "no_quote" };

  const delta = close - open;
  const deltaPct = (delta / open) * 100;
  const ts = `${row[iDate]} ${row[iTime]}`.trim();

  return { c: close, d: delta, dp: deltaPct, ts };
}

