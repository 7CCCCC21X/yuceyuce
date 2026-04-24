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

  const { type, slug, token_id } = req.query || {};
  let targetUrl;

  if (type === "event") {
    if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }
    if (!/^[a-z0-9-]+$/i.test(slug)) { res.status(400).json({ error: "Invalid slug" }); return; }
    targetUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
  } else if (type === "book") {
    if (!token_id) { res.status(400).json({ error: "Missing token_id" }); return; }
    if (!/^[a-z0-9_-]{10,200}$/i.test(token_id)) { res.status(400).json({ error: "Invalid token_id" }); return; }
    targetUrl = `https://clob.polymarket.com/book?token_id=${encodeURIComponent(token_id)}`;
  } else {
    res.status(400).json({ error: "Invalid type. Use type=event or type=book" });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const body = await upstream.text();
    const contentType = upstream.headers.get("Content-Type") || "application/json; charset=utf-8";
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.send(body);
  } catch (error) {
    res.status(502).json({
      error: "Failed to fetch Polymarket API",
      message: (error && error.message) || String(error)
    });
  }
};
