/** Client-safe path helpers (works with Next basePath on GitHub Pages). */

export function gamePath(id: string) {
  return `/games/view?id=${encodeURIComponent(id)}`;
}

export function teamPath(id: string) {
  return `/teams/view?id=${encodeURIComponent(id)}`;
}

export function teamEditPath(id: string) {
  return `/teams/edit?id=${encodeURIComponent(id)}`;
}
