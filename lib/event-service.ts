import {
  Member,
  OvertimeEvent,
  RankedMember,
  FairnessMetrics,
  OvertimeApiResponse,
  PriorityStatus,
  TaskType,
  Room,
} from "@/types/event";
import { getEffectiveEventStatus } from "@/lib/schedule-utils";

export const DEFAULT_TASK_TYPES: TaskType[] = [
  { id: "tt-1", name: "Pemeliharaan Studio Multimedia", category: "Tugas Pokok" },
  { id: "tt-2", name: "Lembur GR (Gladi Resik)", category: "Tugas Pokok" },
  { id: "tt-3", name: "Live Streaming BOD / RUPS", category: "Tugas Pokok" },
  { id: "tt-4", name: "Lembur Support Agenda", category: "Tugas Support" },
  { id: "tt-5", name: "Bantuan Teknis Vicon Gandul", category: "Tugas Support" },
  { id: "tt-6", name: "Standby Insidental Lintas Divisi", category: "Tugas Support" },
];

export const DEFAULT_ROOMS: Room[] = [
  { id: "rm-1", name: "Studio Multimedia Utama" },
  { id: "rm-2", name: "Auditorium PLN Icon Plus" },
  { id: "rm-3", name: "Ruang Rapat Direksi (BOD)" },
  { id: "rm-4", name: "Command Center & NOC" },
  { id: "rm-5", name: "Ruang Vicon Gandul" },
  { id: "rm-6", name: "Meeting Room VIP" },
];

export const SEED_MEMBERS: Member[] = [
  {
    id: "1",
    name: "Hadi",
    email: "hadi@iconpln.co.id",
    role: "Engineer Multimedia",
    totalHours: 4,
    totalSessions: 1,
    lastOvertimeDate: "2026-11-09",
    createdAt: "2026-11-10T02:51:15.539Z",
  },
  {
    id: "2",
    name: "Ari",
    email: "ari@iconpln.co.id",
    role: "Engineer Multimedia",
    totalHours: 4,
    totalSessions: 1,
    lastOvertimeDate: "2026-11-09",
    createdAt: "2026-11-10T02:51:15.539Z",
  },
  {
    id: "3",
    name: "Alfen",
    email: "alfen@iconpln.co.id",
    role: "Engineer Multimedia",
    totalHours: 4,
    totalSessions: 1,
    lastOvertimeDate: "2026-11-10",
    createdAt: "2026-11-10T02:51:15.539Z",
  },
  {
    id: "4",
    name: "Fiqri",
    email: "fiqri@iconpln.co.id",
    role: "Engineer Multimedia",
    totalHours: 4,
    totalSessions: 1,
    lastOvertimeDate: "2026-11-10",
    createdAt: "2026-11-10T02:51:15.539Z",
  },
  {
    id: "5",
    name: "Rizky",
    email: "rizky@iconpln.co.id",
    role: "Engineer Multimedia",
    totalHours: 0,
    totalSessions: 0,
    lastOvertimeDate: null,
    createdAt: "2026-11-10T02:51:15.539Z",
  },
];

export const SEED_EVENTS: OvertimeEvent[] = [
  {
    id: "EVT-1794287745561",
    title: "Lembur GR (Gladi Resik)",
    date: "2026-11-09",
    startTime: "17:00",
    endTime: "21:00",
    time: "17:00 - 21:00",
    taskCategory: "Tugas Pokok",
    taskType: "Lembur GR (Gladi Resik)",
    room: "Auditorium PLN Icon Plus",
    agenda: "Operator FOH & Live Audio Visual",
    durationHours: 4,
    assignedMemberIds: ["1", "2"],
    assignedMemberNames: ["Hadi", "Ari"],
    status: "Selesai",
    technicianRoles: {
      vjUtama: "Hadi",
      kameramen: "Ari",
    },
    notes: "Operator FOH Utama",
    createdAt: "2026-11-10T05:15:45.561Z",
  },
  {
    id: "EVT-1794288608636",
    title: "Lembur Support Agenda",
    date: "2026-11-10",
    startTime: "17:00",
    endTime: "21:00",
    time: "17:00 - 21:00",
    taskCategory: "Tugas Pokok",
    taskType: "Lembur Support Agenda",
    room: "Auditorium PLN Icon Plus",
    agenda: "Team Operator Multimedia",
    durationHours: 4,
    assignedMemberIds: ["3", "4"],
    assignedMemberNames: ["Alfen", "Fiqri"],
    status: "Selesai",
    technicianRoles: {
      coVjZoom: "Alfen",
      switcherPtz: "Fiqri",
    },
    notes: "Team Operator Multimedia",
    createdAt: "2026-11-10T05:30:08.636Z",
  },
  {
    id: "EVT-1794289900123",
    title: "Live Streaming BOD / RUPS",
    date: "2026-11-12",
    startTime: "17:00",
    endTime: "21:00",
    time: "17:00 - 21:00",
    taskCategory: "Tugas Pokok",
    taskType: "Live Streaming BOD / RUPS",
    room: "Ruang Rapat Direksi (BOD)",
    agenda: "Broadcast Multi-kamera PTZ & Switcher",
    durationHours: 4,
    assignedMemberIds: ["5", "1"],
    assignedMemberNames: ["Rizky", "Hadi"],
    status: "Terjadwal",
    technicianRoles: {
      vjUtama: "Rizky",
      coVjZoom: "Hadi",
    },
    notes: "Standby 30 menit sebelum acara",
    createdAt: "2026-11-11T08:00:00.000Z",
  },
  {
    id: "EVT-1794290123456",
    title: "Standby Insidental Lintas Divisi",
    date: "2026-11-14",
    startTime: "18:00",
    endTime: "22:00",
    time: "18:00 - 22:00",
    taskCategory: "Tugas Support",
    taskType: "Standby Insidental Lintas Divisi",
    room: "Command Center & NOC",
    agenda: "Support Emergency Display Wall",
    durationHours: 4,
    assignedMemberIds: ["5", "2"],
    assignedMemberNames: ["Rizky", "Ari"],
    status: "Terjadwal",
    technicianRoles: {
      switcherPtz: "Rizky",
      operatorPresentasi: "Ari",
    },
    notes: "Koordinasi dengan PIC NOC",
    createdAt: "2026-11-11T09:00:00.000Z",
  },
];

export function isOvertimeEvent(
  eventOrTitle: Partial<OvertimeEvent> | { taskType?: string; title?: string } | string
): boolean {
  if (typeof eventOrTitle === "string") {
    return /lembur|gladi\s*resik|\bgr\b|streaming/i.test(eventOrTitle);
  }
  const taskType = eventOrTitle?.taskType;
  if (taskType) {
    return /lembur|gladi\s*resik|\bgr\b|streaming/i.test(taskType);
  }
  const title = eventOrTitle?.title || "";
  return /lembur|gladi\s*resik|\bgr\b|streaming/i.test(title);
}

export function computeRankedMembers(members: Member[]): RankedMember[] {
  const sorted = [...members].sort((a, b) => {
    if (a.totalHours !== b.totalHours) {
      return a.totalHours - b.totalHours;
    }
    if (a.totalSessions !== b.totalSessions) {
      return a.totalSessions - b.totalSessions;
    }
    if (a.lastOvertimeDate === null && b.lastOvertimeDate !== null) return -1;
    if (a.lastOvertimeDate !== null && b.lastOvertimeDate === null) return 1;
    if (a.lastOvertimeDate && b.lastOvertimeDate) {
      if (a.lastOvertimeDate !== b.lastOvertimeDate) {
        return a.lastOvertimeDate.localeCompare(b.lastOvertimeDate);
      }
    }
    return a.name.localeCompare(b.name);
  });

  return sorted.map((member, index) => {
    let statusLabel: PriorityStatus = "Antrean";
    if (index === 0 || index === 1) {
      statusLabel = "Kandidat Utama";
    } else if (index === 2) {
      statusLabel = "Cadangan 1";
    } else if (index === 3) {
      statusLabel = "Cadangan 2";
    }

    let reasoning = `Total ${member.totalHours} Jam (${index === 0 ? "Paling Sedikit" : "Prioritas " + (index + 1)})`;
    if (member.lastOvertimeDate) {
      reasoning += ` • Terakhir: ${member.lastOvertimeDate}`;
    } else {
      reasoning += ` • Belum pernah lembur`;
    }

    return {
      ...member,
      rank: index + 1,
      statusLabel,
      reasoning,
    };
  });
}

export function computeFairnessMetrics(members: Member[], events: OvertimeEvent[]): FairnessMetrics {
  const activeMembersCount = members.length;
  const hoursArray = members.map((m) => m.totalHours);
  const totalDistributedHours = hoursArray.reduce((acc, h) => acc + h, 0);

  const maxHours = hoursArray.length > 0 ? Math.max(...hoursArray) : 0;
  const minHours = hoursArray.length > 0 ? Math.min(...hoursArray) : 0;
  const maxDiffHours = Math.round((maxHours - minHours) * 10) / 10;

  let fairnessRating: FairnessMetrics["fairnessRating"] = "Keadilan Sempurna";
  let fairnessColor = "#005596";

  if (maxDiffHours > 8) {
    fairnessRating = "Perlu Penyeimbangan";
    fairnessColor = "#DC2626";
  } else if (maxDiffHours > 4) {
    fairnessRating = "Wajar";
    fairnessColor = "#D97706";
  } else if (maxDiffHours > 0) {
    fairnessRating = "Sangat Seimbang";
    fairnessColor = "#059669";
  }

  return {
    totalMembers: activeMembersCount,
    totalDistributedHours,
    totalEvents: events.length,
    maxDiffHours,
    minHours,
    maxHours,
    fairnessRating,
    fairnessColor,
  };
}

export function recalculateMemberHours(
  members: Member[],
  events: OvertimeEvent[],
  referenceTime?: Date
): Member[] {
  // Map of hours and last date
  const hoursMap: Record<string, number> = {};
  const sessionsMap: Record<string, number> = {};
  const lastDateMap: Record<string, string | null> = {};

  members.forEach((m) => {
    hoursMap[m.id] = 0;
    sessionsMap[m.id] = 0;
    lastDateMap[m.id] = null;
  });

  events.forEach((evt) => {
    // Only count completed or ongoing overtime events
    const effStatus = getEffectiveEventStatus(evt, referenceTime);
    if (effStatus === "Batal") return;

    if (isOvertimeEvent(evt)) {
      const hours = evt.durationHours || 4;
      evt.assignedMemberIds.forEach((mId) => {
        hoursMap[mId] = (hoursMap[mId] || 0) + hours;
        sessionsMap[mId] = (sessionsMap[mId] || 0) + 1;
        if (
          !lastDateMap[mId] ||
          (evt.date && evt.date > (lastDateMap[mId] as string))
        ) {
          lastDateMap[mId] = evt.date;
        }
      });
    }
  });

  return members.map((m) => ({
    ...m,
    totalHours: hoursMap[m.id] ?? 0,
    totalSessions: sessionsMap[m.id] ?? 0,
    lastOvertimeDate: lastDateMap[m.id] ?? null,
  }));
}

export function buildOvertimeResponse(
  members: Member[],
  events: OvertimeEvent[],
  taskTypes: TaskType[] = DEFAULT_TASK_TYPES,
  rooms: Room[] = DEFAULT_ROOMS,
  referenceTime?: Date
): OvertimeApiResponse {
  const recalculatedMembers = recalculateMemberHours(members, events, referenceTime);
  const rankedMembers = computeRankedMembers(recalculatedMembers);
  const metrics = computeFairnessMetrics(recalculatedMembers, events);

  return {
    members: recalculatedMembers,
    rankedMembers,
    topCandidates: rankedMembers.slice(0, 2),
    backupCandidates: rankedMembers.slice(2, 4),
    events: events.map((e) => ({
      ...e,
      status: getEffectiveEventStatus(e, referenceTime),
    })),
    metrics,
    taskTypes,
    rooms,
  };
}

export function getInitialEventData(
  referenceTime: Date = new Date(2026, 10, 12, 12, 0, 0)
): OvertimeApiResponse {
  return buildOvertimeResponse(
    SEED_MEMBERS,
    SEED_EVENTS,
    DEFAULT_TASK_TYPES,
    DEFAULT_ROOMS,
    referenceTime
  );
}
