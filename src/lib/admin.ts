const DEFAULT_ADMINS = ["kekekim75@gmail.com"];

/** Comma/space-separated emails that can edit public history clubs. */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const fromEnv = raw
    .split(/[,;\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMINS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const needle = email.trim().toLowerCase();
  return adminEmails().includes(needle);
}
