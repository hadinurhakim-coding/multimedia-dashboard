"use client";

import * as React from "react";
import { DashboardSubheader } from "@/components/event/dashboard-subheader";
import { StatCardsRow } from "@/components/event/stat-cards-row";
import { TeamContributionHeatmap } from "@/components/event/team-contribution-heatmap";
import { MonthlyCalendarView } from "@/components/event/monthly-calendar-view";
import { UpcomingListView } from "@/components/event/upcoming-list-view";
import { LeaderboardTab } from "@/components/event/leaderboard-tab";
import { AddScheduleModal } from "@/components/event/add-schedule-modal";
import { ManageTeamDialog } from "@/components/event/manage-team-dialog";
import {
  getInitialEventData,
  buildOvertimeResponse,
} from "@/lib/event-service";
import {
  OvertimeApiResponse,
  OvertimeEvent,
  Member,
  TaskType,
  Room,
  TaskCategory,
  EventStatus,
} from "@/types/event";
import { Users, UserPlus, Clock } from "lucide-react";

export type EventSubmenuTab = "dashboard" | "upcoming" | "assigned" | "team";

interface EventViewProps {
  activeSubTab?: EventSubmenuTab;
  onSubTabChange?: (tab: EventSubmenuTab) => void;
}

export function EventView({
  activeSubTab = "dashboard",
}: EventViewProps) {
  const [data, setData] = React.useState<OvertimeApiResponse>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pln_event_store_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          return buildOvertimeResponse(
            parsed.members,
            parsed.events,
            parsed.taskTypes,
            parsed.rooms,
            new Date(2026, 10, 12, 12, 0, 0)
          );
        }
      } catch {
        // Fallback
      }
    }
    return getInitialEventData(new Date(2026, 10, 12, 12, 0, 0));
  });

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = React.useState(false);
  const [preselectedDate, setPreselectedDate] = React.useState<string | undefined>(undefined);
  const [eventToEdit, setEventToEdit] = React.useState<OvertimeEvent | null>(null);

  // Sync to localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "pln_event_store_data",
          JSON.stringify({
            members: data.members,
            events: data.events,
            taskTypes: data.taskTypes,
            rooms: data.rooms,
          })
        );
      } catch {
        // Storage full or unavailable
      }
    }
  }, [data]);

  // Fetch initial events & members from Neon cloud database
  React.useEffect(() => {
    let isMounted = true;
    async function fetchEventsFromNeon() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.events) && json.events.length > 0) {
          if (isMounted) {
            setData((prev) =>
              buildOvertimeResponse(
                json.members && json.members.length > 0 ? json.members : prev.members,
                json.events,
                prev.taskTypes,
                prev.rooms,
                new Date(2026, 10, 12, 12, 0, 0)
              )
            );
          }
        }
      } catch (err) {
        console.warn("Neon events API fetch fallback to local:", err);
      }
    }
    fetchEventsFromNeon();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAddModal = (dateStr?: string) => {
    setEventToEdit(null);
    setPreselectedDate(dateStr);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (event: OvertimeEvent) => {
    setEventToEdit(event);
    setPreselectedDate(event.date);
    setIsAddModalOpen(true);
  };

  const handleSaveSchedule = (payload: Partial<OvertimeEvent>) => {
    let newEvents: OvertimeEvent[];
    const exists = data.events.some((e) => e.id === payload.id);

    if (exists) {
      newEvents = data.events.map((e) =>
        e.id === payload.id ? ({ ...e, ...payload } as OvertimeEvent) : e
      );
    } else {
      newEvents = [payload as OvertimeEvent, ...data.events];
    }

    const updatedResponse = buildOvertimeResponse(
      data.members,
      newEvents,
      data.taskTypes,
      data.rooms
    );
    setData(updatedResponse);
  };

  const handleDeleteSchedule = (event: OvertimeEvent) => {
    const newEvents = data.events.filter((e) => e.id !== event.id);
    const updatedResponse = buildOvertimeResponse(
      data.members,
      newEvents,
      data.taskTypes,
      data.rooms
    );
    setData(updatedResponse);
  };

  const handleStatusChange = (event: OvertimeEvent, newStatus: EventStatus) => {
    const newEvents = data.events.map((e) =>
      e.id === event.id ? { ...e, status: newStatus } : e
    );
    const updatedResponse = buildOvertimeResponse(
      data.members,
      newEvents,
      data.taskTypes,
      data.rooms
    );
    setData(updatedResponse);
  };

  const handleTeamUpdated = (newMembers: Member[]) => {
    const updatedResponse = buildOvertimeResponse(
      newMembers,
      data.events,
      data.taskTypes,
      data.rooms
    );
    setData(updatedResponse);
  };

  const handleAddTaskType = (name: string, category: TaskCategory) => {
    const newTt: TaskType = {
      id: `tt-${Date.now()}`,
      name,
      category,
      createdAt: new Date().toISOString(),
    };
    const newTaskTypes = [...(data.taskTypes || []), newTt];
    setData({
      ...data,
      taskTypes: newTaskTypes,
    });
  };

  const handleAddRoom = (name: string) => {
    const newRm: Room = {
      id: `rm-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };
    const newRooms = [...(data.rooms || []), newRm];
    setData({
      ...data,
      rooms: newRooms,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "ID_Jadwal",
      "Nama_Kegiatan",
      "Tanggal",
      "Jam_Operasional",
      "Agenda_Kegiatan",
      "Teknisi_Bertugas",
      "Status",
    ];
    const rows = data.events.map((e) => [
      e.id,
      `"${e.title}"`,
      e.date,
      `"${e.time || "17:00 - 21:00"}"`,
      `"${e.agenda || e.notes || "-"}"`,
      `"${e.assignedMemberNames.join(", ")}"`,
      `"${e.status === "Completed" ? "Selesai" : e.status === "In Progress" ? "Sedang Berjalan" : "Terjadwal"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `jadwal_shift_multimedia_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Subheader: Dashboard Penjadwalan & Event (No HeaderNav, Clean Inline) */}
      <DashboardSubheader />

      {/* 2. Stat Cards Row (4 KPI Cards: Jam Lembur, Pemerataan Beban Kerja, Sesi Shift, Personil) */}
      <StatCardsRow
        metrics={data.metrics}
        memberCount={data.members.length}
      />

      {/* 3. Heatmap Dot Kontribusi (Tupoksi vs Support) - Shown in Dashboard Submenu */}
      {activeSubTab === "dashboard" && (
        <TeamContributionHeatmap
          members={data.members}
          events={data.events}
          onOpenAddSchedule={() => handleOpenAddModal()}
        />
      )}

      {/* 4. Content Area Based on Active Submenu */}
      {activeSubTab === "dashboard" && (
        <MonthlyCalendarView
          events={data.events}
          onOpenAddModal={handleOpenAddModal}
          onEditSchedule={handleOpenEditModal}
          onDeleteSchedule={handleDeleteSchedule}
          onSelectEventDetail={handleOpenEditModal}
          onExportCSV={handleExportCSV}
        />
      )}

      {activeSubTab === "upcoming" && (
        <UpcomingListView
          events={data.events}
          onOpenAddSchedule={() => handleOpenAddModal()}
          onEditSchedule={handleOpenEditModal}
          onDeleteSchedule={handleDeleteSchedule}
          onStatusChange={handleStatusChange}
          onExportCSV={handleExportCSV}
        />
      )}

      {activeSubTab === "assigned" && (
        <LeaderboardTab
          data={data}
          onOpenManageTeam={() => setIsManageTeamOpen(true)}
          onOpenAddSchedule={() => handleOpenAddModal()}
        />
      )}

      {activeSubTab === "team" && (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[#00A2E9]" />
                <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight">
                  Manajemen Tim Multimedia ({data.members.length} Personil)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Kelola nama teknisi, peran spesifik, dan akumulasi jam kerja rotasi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsManageTeamOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A2E9] hover:bg-[#0086c4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              <span>Kelola Personil / Tambah</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.rankedMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:border-sky-200 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-[#003B5C] to-[#00A2E9] text-white font-black flex items-center justify-center text-sm shadow-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">{member.name}</h4>
                      <p className="text-[11px] text-zinc-400">{member.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#003B5C] border border-sky-200">
                    #{member.rank} {member.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100">
                  <div className="flex items-center gap-1 text-zinc-600">
                    <Clock className="size-3 text-[#00A2E9]" />
                    <span>{member.totalHours} Jam</span>
                  </div>
                  <div className="text-right text-zinc-400 text-[11px]">
                    {member.totalSessions} sesi kerja
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Schedule Modal */}
      <AddScheduleModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEventToEdit(null);
        }}
        rankedMembers={data.rankedMembers}
        preselectedDate={preselectedDate}
        eventToEdit={eventToEdit}
        taskTypes={data.taskTypes || []}
        rooms={data.rooms || []}
        onSaveSchedule={handleSaveSchedule}
        onAddTaskType={handleAddTaskType}
        onAddRoom={handleAddRoom}
      />

      {/* Manage Team Dialog */}
      <ManageTeamDialog
        isOpen={isManageTeamOpen}
        onClose={() => setIsManageTeamOpen(false)}
        members={data.members}
        onTeamUpdated={handleTeamUpdated}
      />
    </div>
  );
}
