import "server-only";
export function accessConfig() {
  return {
    allowedEmails: process.env.APP_ALLOWED_EMAILS ?? process.env.LPP_ALLOWED_EMAILS ?? "",
    manualAccounts: process.env.APP_MANUALLY_APPROVED_ACCOUNTS ?? process.env.LPP_MANUALLY_APPROVED_ACCOUNTS ?? "{}",
    disabled: process.env.APP_ACCESS_DISABLED === "true",
    sessionsValidAfter: process.env.APP_SESSIONS_VALID_AFTER || "",
  };
}
