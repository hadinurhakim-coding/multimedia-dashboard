export type AppIdentity = { id: string; email: string; emailVerified: boolean; name?: string };
export type AppPermission = "dashboard" | "events:read" | "cctv:read" | "facilities:read" | "lpp";
export function publicProfile(user: AppIdentity) {
  return { id: user.id, email: user.email, name: user.name || "Pengguna" };
}
export function emailAllowed(email: string, allowedEmails: string) {
  return allowedEmails.split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}
// Enrollment is tied to the provider identity, never a browser-supplied role.
export function mayAccessApp(user: AppIdentity | null, allowedEmails: string, manualAccounts = "{}") {
  if (!user?.id || !user.email || !emailAllowed(user.email, allowedEmails)) return false;
  if (user.emailVerified === true) return true;
  try {
    const approved: unknown = JSON.parse(manualAccounts);
    return approved !== null && typeof approved === "object" && !Array.isArray(approved)
      && Object.hasOwn(approved, user.email.toLowerCase())
      && (approved as Record<string, unknown>)[user.email.toLowerCase()] === user.id;
  } catch { return false; }
}
export function internalPermission(permission: AppPermission) {
  return ["dashboard", "events:read", "cctv:read", "facilities:read", "lpp"].includes(permission);
}
