const R2_BASE = 'https://pub-YOUR-R2-BUCKET-ID.r2.dev'; // "https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev"
const ONE_HOUR = 3600;
const ONE_DAY = 86400;
const ONE_YEAR = 31536000;

export default {
  async fetch(request, env, ctx) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname; // e.g. /latest/data.json or /data/2020-08-09.json
    const cache = caches.default;

    // Helper: seconds until next UTC midnight + 1 hour
    function secondsUntilNextMidnightPlus1h() {
      const now = new Date();
      // next day at 01:00:00 UTC
      const next = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 1, 0, 0),
      );
      const diff = Math.floor((next.getTime() - now.getTime()) / 1000);
      return Math.max(60, diff); // at least 60s
    }

    // Determine TTL
    let ttl = ONE_HOUR; // fallback default
    if (/^\/latest(\/|$)/i.test(pathname) || pathname === '/latest/data.json') {
      ttl = ONE_HOUR;
    } else if (/^\/data\/\d{4}-\d{2}-\d{2}\.json$/.test(pathname)) {
      const m = pathname.match(/^\/data\/(\d{4}-\d{2}-\d{2})\.json$/);
      const fileDate = m ? m[1] : null;
      const today = new Date().toISOString().slice(0, 10);
      if (fileDate === today) {
        ttl = ONE_HOUR;
      } else {
        ttl = ONE_YEAR; // "forever" for historical dated files
      }
    } else if (/^\/currencies\/.*$/i.test(pathname)) {
      ttl = ONE_YEAR;
    } else if (/^\/history\/.*\.json$/i.test(pathname)) {
      ttl = secondsUntilNextMidnightPlus1h();
    } else {
      // default for other paths
      ttl = ONE_HOUR;
    }

    // Try to serve from Cloudflare edge cache first
    const cached = await cache.match(request);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set('X-Cache-Status', 'HIT');
      return resp;
    }

    // Not in cache -> fetch from R2 public URL
    const r2Url = R2_BASE + pathname;
    let originResp;
    try {
      originResp = await fetch(r2Url);
    } catch (err) {
      return new Response('Error fetching from R2: ' + err.message, { status: 502 });
    }

    if (!originResp.ok) {
      // If origin 404 or other, return that status
      return new Response(`R2 returned ${originResp.status}`, { status: originResp.status });
    }

    const body = await originResp.arrayBuffer();
    const contentType = originResp.headers.get('content-type') || 'application/json';

    const responseHeaders = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': `public, max-age=${ttl}` + (ttl >= ONE_YEAR ? ', immutable' : ''),
    };

    const response = new Response(body, {
      status: originResp.status,
      headers: responseHeaders,
    });

    // Store on edge cache asynchronously
    ctx.waitUntil(cache.put(request, response.clone()));

    return response;
  },
};
