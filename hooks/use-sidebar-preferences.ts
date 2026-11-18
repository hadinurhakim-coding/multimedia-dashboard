"use client";

import { useSyncExternalStore } from "react";

type ActiveTab = "home" | "event" | "aktivasi" | "dashboard" | "lpp";
type EventTab = "dashboard" | "upcoming" | "assigned" | "team";

type SidebarPreferences = {
  sidebarOpen: boolean;
  mobileOpen: boolean;
  reportsOpen: boolean;
  eventOpen: boolean;
  activeTab: ActiveTab;
  eventSubTab: EventTab;
};

const STORAGE_KEY = "pln-sidebar-preferences-v1";
const defaults: SidebarPreferences = {
  sidebarOpen: true,
  mobileOpen: false,
  reportsOpen: false,
  eventOpen: false,
  activeTab: "home",
  eventSubTab: "dashboard",
};

function readPreferences(): SidebarPreferences {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;
    return {
      sidebarOpen: typeof saved.sidebarOpen === "boolean" ? saved.sidebarOpen : defaults.sidebarOpen,
      mobileOpen: typeof saved.mobileOpen === "boolean" ? saved.mobileOpen : defaults.mobileOpen,
      reportsOpen: typeof saved.reportsOpen === "boolean" ? saved.reportsOpen : defaults.reportsOpen,
      eventOpen: typeof saved.eventOpen === "boolean" ? saved.eventOpen : defaults.eventOpen,
      activeTab: ["home", "event", "aktivasi", "dashboard", "lpp"].includes(saved.activeTab) ? saved.activeTab : defaults.activeTab,
      eventSubTab: ["dashboard", "upcoming", "assigned", "team"].includes(saved.eventSubTab) ? saved.eventSubTab : defaults.eventSubTab,
    };
  } catch {
    return defaults;
  }
}

let snapshot: SidebarPreferences | undefined;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function getSnapshot() {
  // Read once per page load: another tab must not navigate away from an unsaved form.
  return snapshot ??= readPreferences();
}
function getServerSnapshot() {
  return defaults;
}
function setPreference<K extends keyof SidebarPreferences>(key: K, value: SidebarPreferences[K]) {
  const current = getSnapshot();
  if (current[key] === value) return;
  snapshot = { ...current, [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Navigation still works when browser storage is unavailable or full.
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarPreferences() {
  // The server and initial hydration share the defaults, then restore browser preferences.
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [preferences, setPreference] as const;
}
