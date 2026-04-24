module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const q = req.query || {};
  const type = q.type;
  const network = q.network === "testnet" ? "testnet" : "mainnet";
  const base = network === "testnet"
    ? "https://api-testnet.predict.fun/v1"
    : "https://api.predict.fun/v1";

  const INT_ID_RE = /^\d{1,20}$/;
  const SLUG_RE = /^[A-Za-z0-9_-]{1,200}$/;
  const NUM_RE  = /^\d{1,4}$/;
  const CURSOR_RE = /^[A-Za-z0-9_\-:.=]{1,256}$/;

  const rejectNonNumericId = (value, paramName) => {
    res.status(400).json({
      error: `Invalid ${paramName}`,
      message: `Predict.fun /markets/{id} requires a numeric int64 id. Got "${value}". Use type=search&q=<slug> first to resolve a slug to its numeric id.`
    });
  };

  let targetUrl;

  if (type === "book") {
    const mid = q.market_id || q.id;
    if (!mid) { res.status(400).json({ error: "Missing market_id" }); return; }
    if (!INT_ID_RE.test(mid)) { rejectNonNumericId(mid, "market_id"); return; }
    targetUrl = `${base}/markets/${encodeURIComponent(mid)}/orderbook`;
  } else if (type === "market") {
    const mid = q.id || q.market_id;
    if (!mid) { res.status(400).json({ error: "Missing id" }); return; }
    if (!INT_ID_RE.test(mid)) { rejectNonNumericId(mid, "id"); return; }
    targetUrl = `${base}/markets/${encodeURIComponent(mid)}`;
  } else if (type === "markets") {
    const qs = new URLSearchParams();
    const allowed = ["slug", "categorySlug", "status", "search", "limit", "cursor"];
    for (const key of allowed) {
      const v = q[key];
      if (v == null || v === "") continue;
      if ((key === "limit") && !NUM_RE.test(v)) {
        res.status(400).json({ error: `Invalid ${key}` }); return;
      }
      if ((key === "cursor") && !CURSOR_RE.test(v)) {
        res.status(400).json({ error: `Invalid ${key}` }); return;
      }
      if ((key === "slug" || key === "categorySlug" || key === "status") && !SLUG_RE.test(v)) {
        res.status(400).json({ error: `Invalid ${key}` }); return;
      }
      if (key === "search" && (typeof v !== "string" || v.length > 200)) {
        res.status(400).json({ error: "Invalid search" }); return;
      }
      qs.set(key, v);
    }
    const s = qs.toString();
    targetUrl = `${base}/markets${s ? "?" + s : ""}`;
  } else if (type === "search") {
    const s = q.q;
    if (!s) { res.status(400).json({ error: "Missing q" }); return; }
    if (typeof s !== "string" || s.length > 200) { res.status(400).json({ error: "Invalid q" }); return; }
    const qs = new URLSearchParams({ q: s });
    if (q.limit) {
      if (!NUM_RE.test(q.limit)) { res.status(400).json({ error: "Invalid limit" }); return; }
      qs.set("limit", q.limit);
    }
    targetUrl = `${base}/search?${qs.toString()}`;
  } else if (type === "stats") {
    const mid = q.market_id || q.id;
    if (!mid) { res.status(400).json({ error: "Missing market_id" }); return; }
    if (!INT_ID_RE.test(mid)) { rejectNonNumericId(mid, "market_id"); return; }
    targetUrl = `${base}/markets/${encodeURIComponent(mid)}/statistics`;
  } else if (type === "last_sale") {
    const mid = q.market_id || q.id;
    if (!mid) { res.status(400).json({ error: "Missing market_id" }); return; }
    if (!INT_ID_RE.test(mid)) { rejectNonNumericId(mid, "market_id"); return; }
    targetUrl = `${base}/markets/${encodeURIComponent(mid)}/last-sale`;
  } else {
    res.status(400).json({ error: "Invalid type. Use type=book|market|markets|search|stats|last_sale" });
    return;
  }

  const headers = { Accept: "application/json" };
  const apiKey = process.env.PREDICT_API_KEY;
  if (network === "mainnet" && apiKey) headers["x-api-key"] = apiKey;

  try {
    const upstream = await fetch(targetUrl, { method: "GET", headers });
    const body = await upstream.text();
    const contentType = upstream.headers.get("Content-Type") || "application/json; charset=utf-8";
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.send(body);
  } catch (error) {
    res.status(502).json({
      error: "Failed to fetch Predict API",
      message: (error && error.message) || String(error)
    });
  }
};
