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
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Gauge,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CCTVActivationView } from "@/components/cctv/cctv-activation-view";
import { EventView, EventSubmenuTab } from "@/components/event/event-view";

export default function DashboardShell7Page() {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "event" | "aktivasi">("event");
  const [eventSubTab, setEventSubTab] = React.useState<EventSubmenuTab>("dashboard");
  const [isEventSubmenuOpen, setIsEventSubmenuOpen] = React.useState(true);

  return (
    <SidebarProvider defaultOpen={true}>
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
                  isActive={activeTab === "dashboard"}
                  tooltip="Dashboard"
                  onClick={() => setActiveTab("dashboard")}
                  className={
                    activeTab === "dashboard"
                      ? "bg-zinc-100/90 text-zinc-900 font-medium hover:bg-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }
                >
                  <Gauge className="size-4 text-zinc-800" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible
                open={isEventSubmenuOpen}
                onOpenChange={setIsEventSubmenuOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === "event"}
                    tooltip="Event"
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
                          <span>Jadwal Shift</span>
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
      <SidebarInset className="bg-white text-zinc-900 min-w-0 flex-1 overflow-x-hidden flex flex-col min-h-svh">
        {/* Floating Top Header Bar */}
        <header className="bg-white relative z-30 mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-xl border border-zinc-200/80 px-4 sm:px-6 py-2 shadow-xs shrink-0">
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
            <Avatar className="size-8 cursor-pointer ml-1">
              <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=user7" />
              <AvatarFallback className="bg-zinc-900 text-white font-bold text-xs">
                JD
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* 3. Dedicated Content Area Wrapper (Div Khusus Konten Area) */}
        <div data-slot="content-area-container" className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 min-w-0">
            {activeTab === "aktivasi" && <CCTVActivationView />}
            {activeTab === "dashboard" && (
              <div className="py-24 text-center text-zinc-400">
                <Gauge className="size-10 mx-auto text-zinc-300 mb-3" />
                <p className="text-base font-semibold text-zinc-700">Halaman Utama Dashboard</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Area ini telah dikosongkan sesuai permintaan Anda. Klik menu Aktivasi di sidebar untuk melihat pencatatan CCTV dan Digital Twin 3D.
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
