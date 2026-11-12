"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Member } from "@/types/event";
import { Users, UserPlus, Edit2, Trash2, Check, AlertCircle } from "lucide-react";

interface ManageTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onTeamUpdated: (members: Member[]) => void;
}

export function ManageTeamDialog({
  isOpen,
  onClose,
  members,
  onTeamUpdated,
}: ManageTeamDialogProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editRole, setEditRole] = React.useState("");

  const [newName, setNewName] = React.useState("");
  const [newRole, setNewRole] = React.useState("Engineer Multimedia");
  const [error, setError] = React.useState("");

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setError("");
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      setError("Nama personil tidak boleh kosong.");
      return;
    }

    const updated = members.map((m) =>
      m.id === id ? { ...m, name: editName.trim(), role: editRole.trim() || "Engineer Multimedia" } : m
    );
    onTeamUpdated(updated);
    setEditingId(null);
    setError("");
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Nama anggota tim baru wajib diisi.");
      return;
    }

    const newMember: Member = {
      id: `MEM-${Date.now()}`,
      name: newName.trim(),
      email: `${newName.toLowerCase().replace(/\s+/g, ".")}@iconpln.co.id`,
      role: newRole.trim() || "Engineer Multimedia",
      totalHours: 0,
      totalSessions: 0,
      lastOvertimeDate: null,
      createdAt: new Date().toISOString(),
    };

    onTeamUpdated([...members, newMember]);
    setNewName("");
    setNewRole("Engineer Multimedia");
    setError("");
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (!confirm(`Hapus ${name} dari daftar tim? Data jam yang bersangkutan akan terhapus.`)) {
      return;
    }

    const updated = members.filter((m) => m.id !== id);
    onTeamUpdated(updated);
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-[#00A2E9]">
              <Users className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-[#003B5C]">
                Kelola Anggota Tim
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Ubah personil tim atau tambahkan anggota baru secara dinamis ke roster multimedia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Member List */}
          <div className="space-y-2">
            <label className="font-semibold text-zinc-800">
              Daftar Personil Tim ({members.length} Orang):
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50"
                >
                  {editingId === member.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nama"
                        className="h-7 text-xs flex-1"
                        autoFocus
                      />
                      <Input
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="Peran"
                        className="h-7 text-xs w-32"
                      />
                      <Button
                        size="icon"
                        className="size-7 bg-[#00A2E9] hover:bg-[#0086c4] text-white"
                        onClick={() => handleSaveEdit(member.id)}
                      >
                        <Check className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{member.name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-zinc-300">
                          {member.role}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        Akumulasi: {member.totalHours} Jam ({member.totalSessions} sesi)
                      </span>
                    </div>
                  )}

                  {editingId !== member.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-zinc-500 hover:text-zinc-900"
                        onClick={() => handleStartEdit(member)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-zinc-500 hover:text-rose-600"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form to add a new member */}
          <form onSubmit={handleAddMember} className="border-t border-zinc-100 pt-3 space-y-2">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <UserPlus className="size-3.5 text-[#00A2E9]" />
              <span>Tambah Anggota Baru ke Tim</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              <Input
                type="text"
                placeholder="Nama Lengkap"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3 h-8 text-xs"
                required
              />
              <Input
                type="text"
                placeholder="Role / Divisi"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="col-span-2 h-8 text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="w-full gap-1.5 h-8 text-xs mt-1 bg-[#003B5C] hover:bg-[#002840] text-white font-semibold cursor-pointer shadow-xs"
            >
              <UserPlus className="size-3.5" />
              <span>Simpan Personil Baru</span>
            </Button>
          </form>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
