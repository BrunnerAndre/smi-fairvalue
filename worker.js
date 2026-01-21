export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (pathname === "/api/quotes") {
      const symbolsParam = url.searchParams.get("symbols") || "";
      const symbols = symbolsParam
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 50); // safety

      if (symbols.length === 0) {
        return json({ error: "Missing symbols" }, request, 400);
      }

      // Stooq “quote CSV” style endpoint is commonly used:
      // https://stooq.com/q/l/?s={code}&f=sd2t2ohlcvn&h&e=csv  :contentReference[oaicite:2]{index=2}
      // We'll fetch one-by-one (simple MVP). Later: batch + cache.
      const results = {};
      for (const sym of symbols) {
        try {
          const stooqCode = toStooqCode(sym);
          const stooqUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqCode)}&f=sd2t2ohlcvn&h&e=csv`;
          const resp = await fetch(stooqUrl, { cf: { cacheTtl: 30, cacheEverything: true } });
          if (!resp.ok) throw new Error(`Upstream ${resp.status}`);

          const text = await resp.text();
          const parsed = parseStooqQuoteCsv(text);

          // parsed: { close, delta, deltaPct, ts }
          results[sym] = parsed;
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

/**
 * Very small mapping helper:
 * Your symbols are like "NESN.SW"
 * Stooq codes are often lowercased like "nesn.ch" (Swiss = .ch on Stooq in many cases)
 * This is MVP mapping. We’ll maintain a map for reliability.
 */
function toStooqCode(symbol) {
  // Minimal safe approach: explicit map for SMI (recommended)
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

/**
 * Stooq quote CSV (header + 1 row):
 * Symbol,Date,Time,Open,High,Low,Close,Volume,Name
 * We compute delta vs open (or previous close isn't provided).
 * For MVP: delta = close - open; deltaPct = delta/open*100
 */
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

  return {
    c: close,
    d: delta,
    dp: deltaPct,
    ts,
  };
}
