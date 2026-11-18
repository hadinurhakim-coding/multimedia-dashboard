import { normalizeDraftDateFilterValue } from "./date-range";

export type LppScreen = "editor" | "drafts";

export type LppNavigationState = {
  screen: LppScreen;
  folderId: string | null;
  monthFilter: string;
  templateId: string | null;
  draftId: string | null;
};

const STORAGE_PREFIX = "pln-lpp-view-state-v1:";

export const DEFAULT_LPP_NAVIGATION_STATE: LppNavigationState = {
  screen: "editor",
  folderId: null,
  monthFilter: "all",
  templateId: null,
  draftId: null,
};

function isOpaqueId(value: unknown, uuidOnly = false): value is string {
  if (typeof value !== "string" || !value) return false;
  return uuidOnly ? /^[a-f0-9-]{36}$/.test(value) : value.length <= 128 && !/[\s/\\]/.test(value);
}

/** Parses untrusted JSON from localStorage into a safe LPP navigation state. */
export function parseLppNavigationState(raw: string | null): LppNavigationState {
  if (!raw) return DEFAULT_LPP_NAVIGATION_STATE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_LPP_NAVIGATION_STATE;
    }
    const screen: LppScreen = parsed.screen === "drafts" ? "drafts" : "editor";
    const folderId = isOpaqueId(parsed.folderId) ? parsed.folderId : null;
    const monthFilter = folderId ? normalizeDraftDateFilterValue(parsed.monthFilter) : "all";
    const templateId = isOpaqueId(parsed.templateId) ? parsed.templateId : null;
    const draftId = isOpaqueId(parsed.draftId, true) ? parsed.draftId : null;
    return { screen, folderId, monthFilter, templateId, draftId };
  } catch {
    return DEFAULT_LPP_NAVIGATION_STATE;
  }
}

export function lppNavigationStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readLppNavigationState(userId: string): LppNavigationState {
  try {
    return parseLppNavigationState(window.localStorage.getItem(lppNavigationStorageKey(userId)));
  } catch {
    return DEFAULT_LPP_NAVIGATION_STATE;
  }
}

export function writeLppNavigationState(userId: string, state: LppNavigationState): void {
  try {
    window.localStorage.setItem(lppNavigationStorageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage quota or private-browsing blocks.
  }
}

export function clearLppNavigationState(userId: string): void {
  try {
    window.localStorage.removeItem(lppNavigationStorageKey(userId));
  } catch {
    // Ignore storage access errors during sign-out.
  }
}
