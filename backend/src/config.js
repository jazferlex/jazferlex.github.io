export const OWNER_EMAIL = 'jazferlex@gmail.com';
function origin(value, allowLocal = false) {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' || (parsed.protocol !== 'https:' && !(allowLocal && parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname)))) throw new Error('Invalid application origin');
  return parsed.origin;
}
export function configFromEnv(env = process.env) {
  if (env.ADMIN_EMAIL && env.ADMIN_EMAIL !== OWNER_EMAIL) throw new Error('ADMIN_EMAIL must match the fixed owner allowlist');
  const authUrl = origin(env.BETTER_AUTH_URL || 'http://localhost:3000', env.NODE_ENV !== 'production');
  const publicOrigin = origin(env.PUBLIC_SITE_URL || 'https://jazferlex.github.io', env.NODE_ENV !== 'production');
  const authSecret = env.BETTER_AUTH_SECRET;
  return {databaseUrl: env.DATABASE_URL, authUrl, authOrigin: authUrl, publicOrigin, authSecret, googleClientId: env.GOOGLE_CLIENT_ID, googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    authReady: Boolean(authSecret?.length >= 32 && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)};
}
