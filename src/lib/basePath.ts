// ─────────────────────────────────────────────────────────────────────────────
// The path the app is served under (NEXT_PUBLIC_BASE_PATH, e.g. "/inventaire"
// behind nginx; empty in local dev). Mirrors next.config.ts, which feeds the
// same variable to Next's own `basePath`.
//
// Next rewrites app-absolute paths for <Link>, useRouter and next/image on its
// own. It does NOT rewrite anything the browser resolves itself — a
// `window.location` assignment, a plain <img src="/…">, a <link href="/…">. Those
// are the cases this helper exists for: without it they resolve against the
// SERVER ROOT, which behind nginx belongs to a different application entirely.
// ─────────────────────────────────────────────────────────────────────────────

/** Configured base path, normalised to "" or "/segment" (no trailing slash). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/**
 * Prefixes an app-absolute path with BASE_PATH.
 *
 * Use for raw browser navigations and for static assets referenced outside
 * next/image — NOT for <Link>/router paths, which Next already prefixes and
 * which would end up doubled.
 */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
