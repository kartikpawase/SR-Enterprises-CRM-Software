/**
 * Cloudflare Pages Edge Function: API Reverse Proxy
 * Dynamically proxies all /api/* requests to the configured backend API host
 * Preserves HTTP method, headers (including cookies and auth tokens), and request body
 */

interface Env {
  BACKEND_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const defaultBackend = 'https://sr-enterprises-crm-software.onrender.com';
  const backendBase = (context.env.BACKEND_URL || defaultBackend).replace(/\/+$/, '');

  const incomingUrl = new URL(context.request.url);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendBase);

  // Clone headers and preserve client IP & host
  const headers = new Headers(context.request.headers);
  headers.set('X-Forwarded-Host', incomingUrl.host);
  headers.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''));

  const isBodyAllowed = !['GET', 'HEAD'].includes(context.request.method);

  const proxyRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers,
    body: isBodyAllowed ? context.request.body : undefined,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);

    // Clone response headers to enable CORS if needed
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'EDGE_PROXY_ERROR',
          message: `Cloudflare edge proxy could not reach backend API at ${backendBase}: ${err?.message || 'Network error'}`,
        },
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
