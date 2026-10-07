// Backpack: serves the app (static assets) and stores one shared state in KV.
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/state') return env.ASSETS.fetch(req);

    // Cloudflare Access adds this header after login. Without it, refuse.
    if (!req.headers.get('Cf-Access-Jwt-Assertion')) return new Response('Forbidden', { status: 403 });

    const raw = await env.BACKPACK.get('state');
    const current = raw ? JSON.parse(raw) : { rev: 0, data: null };

    if (req.method === 'GET') return json(current);

    if (req.method === 'PUT') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      if (!body || typeof body.data !== 'object') return json({ error: 'bad body' }, 400);
      if (body.rev !== current.rev) return json(current, 409); // someone saved in between
      const next = { rev: current.rev + 1, data: body.data };
      await env.BACKPACK.put('state', JSON.stringify(next));
      return json({ rev: next.rev });
    }
    return new Response('Method not allowed', { status: 405 });
  }
};
