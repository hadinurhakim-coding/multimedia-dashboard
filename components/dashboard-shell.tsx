"use client";

import * as React from "react";
import Image from "next/image";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth/client";
import { useAppUser } from "@/components/auth/session-boundary";
import {
  Home,
  Calendar,
  Zap,
  ChevronRight,
  ChevronDown,
  Search,
  Share2,
  Languages,
  Activity,
  Bell,
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Users,
  FileSpreadsheet,
  FolderClosed,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CCTVActivationView } from "@/components/cctv/cctv-activation-view";
import { EventView, EventSubmenuTab } from "@/components/event/event-view";
import { LppView } from "@/components/lpp/lpp-view";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";

export default function DashboardShell7Page() {
  const user = useAppUser();
  const [signingOut, setSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState("");
  const [preferences, setPreference] = useSidebarPreferences();
  const { activeTab, eventSubTab, eventOpen: isEventSubmenuOpen } = preferences;
  const [lppDirty, setLppDirty] = React.useState(false);
  function setActiveTab(tab: typeof activeTab) {
    if (activeTab === "lpp" && tab !== "lpp" && lppDirty && !window.confirm("Perubahan LPP belum disimpan. Tinggalkan halaman?")) return;
    if (tab !== "lpp") setLppDirty(false);
    setPreference("activeTab", tab);
  }
  const setEventSubTab = (tab: EventSubmenuTab) => setPreference("eventSubTab", tab);
  const setIsEventSubmenuOpen = (open: boolean) => setPreference("eventOpen", open);

  return (
    <SidebarProvider
      open={preferences.sidebarOpen}
      onOpenChange={(open) => setPreference("sidebarOpen", open)}
      openMobile={preferences.mobileOpen}
      onOpenMobileChange={(open) => setPreference("mobileOpen", open)}
    >
      {/* 1. Sidebar collapsible="icon" */}
      <Sidebar
        collapsible="icon"
        className="border-r border-zinc-200/80 bg-[#FAFAFA] text-zinc-800"
      >
        {/* Workspace Switcher Header with PLN Logo */}
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton
                size="lg"
                className="gap-3 hover:bg-zinc-100 text-zinc-900 rounded-xl transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <div className="size-8 w-8 h-8 aspect-square rounded-[6px] overflow-hidden flex items-center justify-center shrink-0 shadow-xs bg-[#FFD100]">
                  <Image
                    src="/images/pln-logo.png"
                    alt="Logo PLN Petir"
                    width={32}
                    height={32}
                    className="size-8 w-8 h-8 aspect-square object-contain rounded-[6px]"
                    priority
                  />
                </div>
                <div className="flex flex-col items-start leading-tight truncate group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold text-zinc-900 tracking-tight truncate">
                    PLN Icon Plus
                  </span>
                  <span className="text-xs text-zinc-500 font-normal truncate">
                    Multimedia Studio
                  </span>
                </div>
                <ChevronRight className="ml-auto size-4 text-zinc-400 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Navigation Content */}
        <SidebarContent className="px-2 py-2">
          <SidebarGroup className="p-0">
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "home" || activeTab === "dashboard"}
                  tooltip="Home"
                  onClick={() => setActiveTab("home")}
                  className={
                    activeTab === "home" || activeTab === "dashboard"
                      ? "bg-zinc-100/90 text-zinc-900 font-medium hover:bg-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }
                >
                  <Home className="size-4 text-zinc-800" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <WorkReportsMenu active={activeTab === "lpp"} open={preferences.reportsOpen} onOpenChange={(open) => setPreference("reportsOpen", open)} onSelectLpp={() => setActiveTab("lpp")} />
              <Collapsible
                open={isEventSubmenuOpen}
                onOpenChange={setIsEventSubmenuOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === "event"}
                    tooltip="Event"
                    aria-expanded={isEventSubmenuOpen}
                    onClick={() => {
                      setActiveTab("event");
                      setIsEventSubmenuOpen(true);
                    }}
                    className={
                      activeTab === "event"
                        ? "bg-zinc-100/90 text-zinc-900 font-medium hover:bg-zinc-100"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                    }
                  >
                    <Calendar className="size-4 text-zinc-700" />
                    <span>Event</span>
                    <ChevronDown
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEventSubmenuOpen(!isEventSubmenuOpen);
                      }}
                      className={cn(
                        "ml-auto size-3.5 text-zinc-400 transition-transform duration-200 group-data-[collapsible=icon]:hidden cursor-pointer",
                        isEventSubmenuOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  <CollapsibleContent>
                    <SidebarMenuSub className="py-1">
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={activeTab === "event" && eventSubTab === "dashboard"}
                          onClick={() => {
                            setActiveTab("event");
                            setEventSubTab("dashboard");
                          }}
                          className={cn(
                            "cursor-pointer text-xs font-normal py-1.5",
                            activeTab === "event" && eventSubTab === "dashboard"
                              ? "bg-[#00A2E9]/10 text-[#003B5C] font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          )}
                        >
                          <LayoutDashboard className="size-3.5 text-zinc-500" />
                          <span>Dashboard</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={activeTab === "event" && eventSubTab === "upcoming"}
                          onClick={() => {
                            setActiveTab("event");
                            setEventSubTab("upcoming");
                          }}
                          className={cn(
                            "cursor-pointer text-xs font-normal py-1.5",
                            activeTab === "event" && eventSubTab === "upcoming"
                              ? "bg-[#00A2E9]/10 text-[#003B5C] font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          )}
                        >
                          <CalendarDays className="size-3.5 text-zinc-500" />
                          <span>Penjadwalan & Event</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={activeTab === "event" && eventSubTab === "assigned"}
                          onClick={() => {
                            setActiveTab("event");
                            setEventSubTab("assigned");
                          }}
                          className={cn(
                            "cursor-pointer text-xs font-normal py-1.5",
                            activeTab === "event" && eventSubTab === "assigned"
                              ? "bg-[#00A2E9]/10 text-[#003B5C] font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          )}
                        >
                          <Trophy className="size-3.5 text-zinc-500" />
                          <span>Peringkat & Antrean</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={activeTab === "event" && eventSubTab === "team"}
                          onClick={() => {
                            setActiveTab("event");
                            setEventSubTab("team");
                          }}
                          className={cn(
                            "cursor-pointer text-xs font-normal py-1.5",
                            activeTab === "event" && eventSubTab === "team"
                              ? "bg-[#00A2E9]/10 text-[#003B5C] font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          )}
                        >
                          <Users className="size-3.5 text-zinc-500" />
                          <span>Kelola Tim</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "aktivasi"}
                  tooltip="Aktivasi"
                  onClick={() => setActiveTab("aktivasi")}
                  className={
                    activeTab === "aktivasi"
                      ? "bg-zinc-100/90 text-zinc-900 font-medium hover:bg-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }
                >
                  <Zap className="size-4 text-zinc-500" />
                  <span>Aktivasi</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* 2. Main Content Area with Header */}
      <SidebarInset className="bg-white text-zinc-900 min-w-0 flex-1 overflow-x-clip flex flex-col min-h-svh [--app-sidebar-offset:0px] md:[--app-sidebar-offset:var(--sidebar-width)] md:peer-data-[state=collapsed]:[--app-sidebar-offset:var(--sidebar-width-icon)]">
        {/* Floating Top Header Bar */}
        <header className="fixed top-3 right-4 left-[calc(var(--app-sidebar-offset)+1rem)] z-30 mx-auto flex h-[3.125rem] max-w-7xl items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-4 sm:px-6 py-2 shadow-xs transition-[left] duration-200 ease-linear">
          <div className="flex items-center gap-2 sm:gap-4">
            <SidebarTrigger className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 p-1.5 rounded-lg [&_svg]:size-5" />
            <div className="hidden sm:block h-4 w-px bg-zinc-200" />
            <div className="w-full max-w-72 hidden sm:block">
              <button
                type="button"
                className="text-zinc-400 w-full flex items-center bg-transparent px-1 py-1 text-sm font-normal cursor-pointer hover:text-zinc-600"
              >
                <Search className="size-4 mr-2 text-zinc-400" />
                <span>Cari unit CCTV, SN, atau mitra...</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
            >
              <Languages className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
            >
              <Activity className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg relative"
            >
              <Bell className="size-4" />
              <span className="bg-[#00A2E9] absolute top-1.5 right-1.5 size-1.5 rounded-full" />
            </Button>
            <Avatar className="ml-1 size-8" title={user.email}>
              <AvatarFallback className="bg-zinc-900 text-white font-bold text-xs">
                {user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" disabled={signingOut} aria-label="Keluar dari aplikasi" onClick={async () => {
              if (lppDirty && !window.confirm("Perubahan LPP belum disimpan. Keluar dari aplikasi?")) return;
              setSigningOut(true); setSignOutError("");
              try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.replace("/"); }
              catch { setSignOutError("Gagal keluar. Silakan coba kembali."); setSigningOut(false); }
            }}><LogOut className="size-4" /><span className="hidden sm:inline">{signingOut ? "Keluar…" : "Keluar"}</span></Button>
          </div>
        </header>
        <div aria-hidden="true" className="h-[3.875rem] shrink-0" />

        {/* 3. Dedicated Content Area Wrapper (Div Khusus Konten Area) */}
        <div data-slot="content-area-container" className="flex-1 w-full min-w-0 max-w-full overflow-x-clip">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 min-w-0">
            {signOutError && <p role="alert" className="mb-4 text-sm text-red-700">{signOutError}</p>}
            {activeTab === "aktivasi" && <CCTVActivationView />}
            {activeTab === "lpp" && <LppView onDirtyChange={setLppDirty} />}
            {(activeTab === "home" || activeTab === "dashboard") && (
              <div className="flex items-center justify-center min-h-[50vh] w-full text-center py-20">
                <p className="text-base sm:text-lg font-medium text-zinc-600">
                  Halaman ini untuk company profile
                </p>
              </div>
            )}
            {activeTab === "event" && (
              <React.Suspense
                fallback={
                  <div className="py-24 text-center text-zinc-400">
                    <Calendar className="size-10 mx-auto text-zinc-300 mb-3 animate-pulse" />
                    <p className="text-base font-semibold text-zinc-700">Memuat Jadwal & Event...</p>
                  </div>
                }
              >
                <EventView
                  activeSubTab={eventSubTab}
                  onSubTabChange={setEventSubTab}
                />
              </React.Suspense>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function WorkReportsMenu({ active, open, onOpenChange: setOpen, onSelectLpp }: { active: boolean; open: boolean; onOpenChange: (open: boolean) => void; onSelectLpp: () => void }) {
  const { state, isMobile, setOpen: setSidebarOpen, setOpenMobile } = useSidebar();
  const submenuId = React.useId();
  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuButton
          isActive={active}
          tooltip="Laporan Pekerjaan"
          aria-expanded={open && (isMobile || state === "expanded")}
          aria-controls={open ? submenuId : undefined}
          onClick={() => {
            if (!isMobile && state === "collapsed") {
              setSidebarOpen(true);
              setOpen(true);
            } else setOpen(!open);
          }}
        >
          <FolderClosed className="size-4" />
          <span>Laporan Pekerjaan</span>
          <ChevronDown className={cn("ml-auto size-3.5 text-zinc-400 transition-transform duration-200 group-data-[collapsible=icon]:hidden", open && "rotate-180")} />
        </SidebarMenuButton>
        <CollapsibleContent id={submenuId}>
          <SidebarMenuSub className="py-1">
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                render={<button type="button" />}
                isActive={active}
                aria-current={active ? "page" : undefined}
                onClick={() => { onSelectLpp(); if (isMobile) setOpenMobile(false); }}
                className={cn("cursor-pointer text-xs py-1.5", active ? "bg-pln-cyan/10 text-pln-navy font-semibold" : "text-zinc-600 hover:text-zinc-900")}
              >
                <FileSpreadsheet className="size-3.5" /><span>LPP</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
