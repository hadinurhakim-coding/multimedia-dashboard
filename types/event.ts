export interface Member {
  id: string;
  name: string;
  email?: string;
  role: string;
  totalHours: number;
  totalSessions: number;
  lastOvertimeDate: string | null; // ISO or YYYY-MM-DD
  createdAt: string;
}

export type PriorityStatus = "Kandidat Utama" | "Cadangan 1" | "Cadangan 2" | "Antrean";

export interface RankedMember extends Member {
  rank: number;
  statusLabel: PriorityStatus;
  reasoning: string;
}

export type TaskCategory = "Tugas Pokok" | "Tugas Support";

export type EventStatus =
  | "Terjadwal"
  | "Selesai"
  | "Batal"
  | "Berubah"
  | "Upcoming Session"
  | "In Progress"
  | "Completed";

export interface TechnicianRoles {
  vjUtama?: string; // VJ Utama
  coVjZoom?: string; // Co-VJ / Host Zoom
  kameramen?: string; // Kameramen
  switcherPtz?: string; // Switcher / Pilot Kamera PTZ
  operatorPresentasi?: string; // Operator Presentasi / Asrtot
}

export interface OvertimeEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "17:00"
  endTime?: string; // e.g. "21:00"
  time?: string; // e.g. "17:00 - 21:00"
  taskCategory?: TaskCategory; // 'Tugas Pokok' vs 'Tugas Support'
  agenda?: string; // Agenda / Kegiatan detail
  country?: string;
  flightNumber?: string;
  returneesCount?: number;
  durationHours: number; // default 4 for incidental shifts
  assignedMemberIds: string[];
  assignedMemberNames: string[];
  passMemberIds?: string[];
  technicianRoles?: TechnicianRoles;
  status?: EventStatus;
  notes?: string;
  room?: string; // Ruangan / Lokasi kegiatan
  taskType?: string; // Jenis Tugas
  pdfFileName?: string;
  pdfFileKey?: string;
  pdfFileSize?: number;
  pdfUploadedAt?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskType {
  id: string;
  name: string;
  category: TaskCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface OvertimeStore {
  members: Member[];
  events: OvertimeEvent[];
  taskTypes?: TaskType[];
  rooms?: Room[];
}

export interface FairnessMetrics {
  totalMembers: number;
  totalDistributedHours: number;
  totalEvents: number;
  maxDiffHours: number;
  minHours?: number;
  maxHours?: number;
  fairnessRating: "Keadilan Sempurna" | "Sangat Seimbang" | "Wajar" | "Perlu Penyeimbangan";
  fairnessColor: string;
}

export interface OvertimeApiResponse {
  members: Member[];
  rankedMembers: RankedMember[];
  topCandidates: RankedMember[];
  backupCandidates: RankedMember[];
  events: OvertimeEvent[];
  metrics: FairnessMetrics;
  taskTypes?: TaskType[];
  rooms?: Room[];
}
