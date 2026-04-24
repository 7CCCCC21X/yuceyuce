const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  let targetUrl;

  if (type === "event") {
    const slug = url.searchParams.get("slug");
    if (!slug) return json({ error: "Missing slug" }, 400);
    if (!/^[a-z0-9-]+$/i.test(slug)) return json({ error: "Invalid slug" }, 400);
    targetUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
  } else if (type === "book") {
    const tokenId = url.searchParams.get("token_id");
    if (!tokenId) return json({ error: "Missing token_id" }, 400);
    if (!/^[a-z0-9_-]{10,200}$/i.test(tokenId)) return json({ error: "Invalid token_id" }, 400);
    targetUrl = `https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`;
  } else {
    return json({ error: "Invalid type. Use type=event or type=book" }, 400);
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return json(
      { error: "Failed to fetch Polymarket API", message: (error && error.message) || String(error) },
      502
    );
  }
}
