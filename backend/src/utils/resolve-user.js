/**
 * Resolve the current username from Hono context.
 * Auth middleware already resolves identity into { sub, email, name }.
 */
export function resolveUsername(c) {
  return c.get('user')?.sub;
}
