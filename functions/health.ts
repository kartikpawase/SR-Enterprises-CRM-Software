/**
 * Cloudflare Pages Edge Function: /health probe
 */

interface Env {
  BACKEND_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const defaultBackend = 'https://sr-enterprises-crm-software.onrender.com';
  const backendBase = (context.env.BACKEND_URL || defaultBackend).replace(/\/+$/, '');

  try {
    const res = await fetch(`${backendBase}/health`, {
      method: context.request.method,
      headers: context.request.headers,
    });
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch {
    return new Response(
      JSON.stringify({ status: 'ok', runtime: 'cloudflare-pages-edge', timestamp: new Date().toISOString() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
