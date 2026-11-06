/**
 * Sent with every page and API response from the server. Only `frame-ancestors`-style rules
 * are in the CSP: a script policy would have to track Neon Auth and Vercel Analytics by hand.
 */
export const SECURITY_HEADERS = {
  "content-security-policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

/** A copy with the headers added: responses from the framework can be immutable. */
export function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value);
  return secured;
}
