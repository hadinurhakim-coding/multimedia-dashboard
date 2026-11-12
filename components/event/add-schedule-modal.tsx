"use client";

import * as React from "react";
import {
  X,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RankedMember,
  TaskCategory,
  OvertimeEvent,
  TaskType,
  Room,
  EventStatus,
  TechnicianRoles,
} from "@/types/event";

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rankedMembers: RankedMember[];
  preselectedDate?: string;
  eventToEdit?: OvertimeEvent | null;
  taskTypes: TaskType[];
  rooms: Room[];
  onSaveSchedule: (scheduleData: Partial<OvertimeEvent>) => void;
  onAddTaskType?: (name: string, category: TaskCategory) => void;
  onAddRoom?: (name: string) => void;
}

export function AddScheduleModal(props: AddScheduleModalProps) {
  if (!props.isOpen) return null;

  return (
    <AddScheduleContent
      key={props.eventToEdit?.id || props.preselectedDate || "new-schedule"}
      {...props}
    />
  );
}

function AddScheduleContent({
  onClose,
  rankedMembers,
  preselectedDate,
  eventToEdit,
  taskTypes,
  rooms,
  onSaveSchedule,
  onAddTaskType,
  onAddRoom,
}: AddScheduleModalProps) {
  const [scheduleTitle, setScheduleTitle] = React.useState(eventToEdit?.title || "");
  const [selectedTaskTypeId, setSelectedTaskTypeId] = React.useState<string>(() => {
    if (eventToEdit) {
      const matchedTt = taskTypes.find((t) => t.name === eventToEdit.taskType);
      return matchedTt ? matchedTt.id : taskTypes[0]?.id || "";
    }
    return taskTypes[0]?.id || "";
  });
  const [selectedRoomName, setSelectedRoomName] = React.useState<string>(
    eventToEdit?.room || rooms[0]?.name || ""
  );
  const [shiftDate, setShiftDate] = React.useState<string>(
    eventToEdit?.date || preselectedDate || "2026-11-12"
  );
  const [startTime, setStartTime] = React.useState(eventToEdit?.startTime || "17:00");
  const [endTime, setEndTime] = React.useState(eventToEdit?.endTime || "21:00");
  const [taskCategory, setTaskCategory] = React.useState<TaskCategory>(
    eventToEdit?.taskCategory || "Tugas Pokok"
  );
  const [status] = React.useState<EventStatus>(eventToEdit?.status || "Terjadwal");
  const [agenda, setAgenda] = React.useState(eventToEdit?.agenda || eventToEdit?.notes || "");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    eventToEdit?.assignedMemberIds || rankedMembers.slice(0, 2).map((m) => m.id)
  );
  const [technicianRoles, setTechnicianRoles] = React.useState<TechnicianRoles>(
    eventToEdit?.technicianRoles || {}
  );

  const [isAddingNewTaskType, setIsAddingNewTaskType] = React.useState(false);
  const [newTaskTypeName, setNewTaskTypeName] = React.useState("");
  const [newTaskTypeCategory, setNewTaskTypeCategory] = React.useState<TaskCategory>("Tugas Pokok");

  const [isAddingNewRoom, setIsAddingNewRoom] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");

  const [error, setError] = React.useState("");

  const handleToggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduleTitle.trim()) {
      setError("Nama kegiatan / judul agenda wajib diisi.");
      return;
    }
    if (!shiftDate) {
      setError("Tanggal pelaksanaan wajib dipilih.");
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError("Pilih minimal 1 teknisi yang ditugaskan.");
      return;
    }

    const assignedNames = selectedMemberIds
      .map((id) => rankedMembers.find((m) => m.id === id)?.name)
      .filter(Boolean) as string[];

    const matchedTask = taskTypes.find((t) => t.id === selectedTaskTypeId);

    const payload: Partial<OvertimeEvent> = {
      id: eventToEdit ? eventToEdit.id : `EVT-${Date.now()}`,
      title: scheduleTitle.trim(),
      taskType: matchedTask ? matchedTask.name : scheduleTitle.trim(),
      taskCategory,
      room: selectedRoomName.trim() || "Studio Multimedia Utama",
      date: shiftDate,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      durationHours: 4,
      agenda: agenda.trim(),
      notes: agenda.trim(),
      assignedMemberIds: selectedMemberIds,
      assignedMemberNames: assignedNames,
      technicianRoles,
      status,
      createdAt: eventToEdit ? eventToEdit.createdAt : new Date().toISOString(),
    };

    onSaveSchedule(payload);
    onClose();
  };

  const handleCreateNewTaskType = () => {
    if (!newTaskTypeName.trim()) return;
    onAddTaskType?.(newTaskTypeName.trim(), newTaskTypeCategory);
    setNewTaskTypeName("");
    setIsAddingNewTaskType(false);
  };

  const handleCreateNewRoom = () => {
    if (!newRoomName.trim()) return;
    onAddRoom?.(newRoomName.trim());
    setSelectedRoomName(newRoomName.trim());
    setNewRoomName("");
    setIsAddingNewRoom(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-zinc-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight">
              {eventToEdit ? "Edit Jadwal & Penugasan Tim" : "Jadwal Shift & Penugasan Tim"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Atur jadwal teknis, jenis tugas pekerjaan, dan personil multimedia yang bertugas.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 pt-3 text-xs">
          {/* 1. Nama / Judul Acara */}
          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Nama Kegiatan / Judul Acara *
            </label>
            <input
              type="text"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
              placeholder="Contoh: Gladi Resik Live Streaming RUPS"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white text-xs text-zinc-900 focus:outline-hidden focus:border-[#00A2E9] focus:ring-1 focus:ring-[#00A2E9]"
              required
            />
          </div>

          {/* 2. Jenis Tugas & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-800">Jenis Tugas *</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewTaskType(!isAddingNewTaskType)}
                  className="text-[10px] text-[#00A2E9] font-semibold hover:underline"
                >
                  + Tambah Jenis
                </button>
              </div>

              {isAddingNewTaskType ? (
                <div className="p-2 border border-sky-200 bg-sky-50/50 rounded-lg space-y-1.5">
                  <input
                    type="text"
                    value={newTaskTypeName}
                    onChange={(e) => setNewTaskTypeName(e.target.value)}
                    placeholder="Nama Jenis Tugas Baru"
                    className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs"
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={newTaskTypeCategory}
                      onChange={(e) => setNewTaskTypeCategory(e.target.value as TaskCategory)}
                      className="text-[10px] px-1.5 py-0.5 border rounded bg-white"
                    >
                      <option value="Tugas Pokok">Tugas Pokok</option>
                      <option value="Tugas Support">Tugas Support</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateNewTaskType}
                      className="px-2 py-0.5 bg-[#00A2E9] text-white text-[10px] rounded font-bold"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedTaskTypeId}
                  onChange={(e) => {
                    setSelectedTaskTypeId(e.target.value);
                    const t = taskTypes.find((item) => item.id === e.target.value);
                    if (t) setTaskCategory(t.category);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white text-xs text-zinc-900 cursor-pointer"
                >
                  {taskTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-800">Ruangan / Lokasi</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewRoom(!isAddingNewRoom)}
                  className="text-[10px] text-[#00A2E9] font-semibold hover:underline"
                >
                  + Tambah Ruangan
                </button>
              </div>

              {isAddingNewRoom ? (
                <div className="p-2 border border-sky-200 bg-sky-50/50 rounded-lg flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Nama Ruangan Baru"
                    className="flex-1 px-2 py-1 bg-white border border-zinc-200 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewRoom}
                    className="px-2 py-1 bg-[#00A2E9] text-white text-[10px] rounded font-bold"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <select
                  value={selectedRoomName}
                  onChange={(e) => setSelectedRoomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white text-xs text-zinc-900 cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 3. Tanggal & Jam */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-zinc-800 block mb-1">Tanggal *</label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-800 block mb-1">Jam Mulai</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="17:00"
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-800 block mb-1">Jam Selesai</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="21:00"
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
              />
            </div>
          </div>

          {/* 4. Rekomendasi & Penugasan Personil */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-[#00A2E9]" />
                <span>Teknisi yang Ditugaskan ({selectedMemberIds.length} Dipilih) *</span>
              </label>
              <span className="text-[10px] text-zinc-400">
                Pilih sesuai rekomendasi rotasi adil
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {rankedMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const isPriority = m.rank <= 2;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMember(m.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-[#00A2E9] bg-sky-50/70 shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-[#00A2E9] focus:ring-[#00A2E9]"
                      />
                      <div>
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {isPriority && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#FFD100] text-zinc-900 font-extrabold">
                              ⭐ Prioritas
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {m.totalHours} Jam ({m.totalSessions} sesi)
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-zinc-500">
                      #{m.rank}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Pembagian Peran Spesifik Multimedia */}
          <div>
            <label className="font-semibold text-zinc-800 block mb-1.5">
              Pembagian Peran Spesifik Multimedia (Opsional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">🎧 VJ Utama</span>
                <input
                  type="text"
                  placeholder="Nama teknisi"
                  value={technicianRoles.vjUtama || ""}
                  onChange={(e) =>
                    setTechnicianRoles({ ...technicianRoles, vjUtama: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">💻 Co-VJ / Zoom</span>
                <input
                  type="text"
                  placeholder="Nama teknisi"
                  value={technicianRoles.coVjZoom || ""}
                  onChange={(e) =>
                    setTechnicianRoles({ ...technicianRoles, coVjZoom: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">🎥 Kameramen</span>
                <input
                  type="text"
                  placeholder="Nama teknisi"
                  value={technicianRoles.kameramen || ""}
                  onChange={(e) =>
                    setTechnicianRoles({ ...technicianRoles, kameramen: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">🎛️ Switcher / PTZ</span>
                <input
                  type="text"
                  placeholder="Nama teknisi"
                  value={technicianRoles.switcherPtz || ""}
                  onChange={(e) =>
                    setTechnicianRoles({ ...technicianRoles, switcherPtz: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-zinc-500 block mb-0.5">📊 Operator Presentasi / Asrtot</span>
                <input
                  type="text"
                  placeholder="Nama teknisi"
                  value={technicianRoles.operatorPresentasi || ""}
                  onChange={(e) =>
                    setTechnicianRoles({ ...technicianRoles, operatorPresentasi: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 6. Agenda & Uraian Tugas */}
          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Uraian Agenda / Catatan Khusus
            </label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Rincian teknis, peralatan standby, atau koordinasi PIC..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white text-xs text-zinc-900 focus:outline-hidden"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#003B5C] hover:bg-[#002840] text-white font-bold"
            >
              {eventToEdit ? "Simpan Perubahan" : "Simpan Jadwal Shift"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
