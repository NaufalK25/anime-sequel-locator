// Cloudflare Worker: minimal CORS proxy for the official MAL API v2.
// Deploy:  cd worker && npx wrangler secret put MAL_CLIENT_ID && npx wrangler deploy
// Get a client id at https://myanimelist.net/apiconfig (type: "other").

const ALLOWED_PATH = /^\/(users\/[^/]+\/animelist|anime\/\d+)$/;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin)
        ? origin
        : (allowed[0] ?? ""),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      Vary: "Origin",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "GET")
      return new Response("Method not allowed", { status: 405, headers: cors });

    const url = new URL(req.url);
    if (!ALLOWED_PATH.test(url.pathname))
      return new Response("Not found", { status: 404, headers: cors });

    const upstream = await fetch(
      `https://api.myanimelist.net/v2${url.pathname}${url.search}`,
      {
        headers: { "X-MAL-CLIENT-ID": env.MAL_CLIENT_ID },
        cf: { cacheTtl: 300, cacheEverything: true },
      },
    );
    const res = new Response(upstream.body, upstream);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
