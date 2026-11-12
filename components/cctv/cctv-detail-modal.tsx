"use client";

import React from "react";
import { CCTVUnit } from "@/types/cctv";
import {
  X,
  ShieldCheck,
  Video,
  Network,
  MapPin,
  Building,
  UserCheck,
  Phone,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CCTVDetailModalProps {
  cctv: CCTVUnit | null;
  onClose: () => void;
  onFocus3D: (id: string) => void;
}

export function CCTVDetailModal({
  cctv,
  onClose,
  onFocus3D,
}: CCTVDetailModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!cctv) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-200/80 flex items-start justify-between bg-zinc-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-200/80 text-zinc-800">
                {cctv.sn}
              </span>
              {cctv.status === "active" && (
                <Badge variant="outline" className="bg-sky-50 text-[#00A2E9] border-[#00A2E9]/30 text-xs font-semibold">
                  Online / Normal
                </Badge>
              )}
              {cctv.status === "warning" && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs font-semibold">
                  Perlu Kalibrasi
                </Badge>
              )}
              {cctv.status === "offline" && (
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-xs font-semibold">
                  Offline / Terputus
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              {cctv.name}
            </h2>
            <p className="text-xs text-zinc-500">{cctv.model}</p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Lokasi & Posisi 3D */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[#00A2E9]" />
              Informasi Lokasi & Spatial 3D
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 text-xs">
              <div>
                <span className="text-zinc-400 text-[11px]">Titik Pemasangan</span>
                <p className="font-semibold text-zinc-800">{cctv.location}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Zona & Lantai</span>
                <p className="font-semibold text-zinc-800">
                  {cctv.buildingZone} ({cctv.floor})
                </p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Koordinat Spatial 3D (X, Y, Z)</span>
                <p className="font-mono text-zinc-800 font-medium">
                  [{cctv.position3D.join(", ")}]
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => {
                    onFocus3D(cctv.id);
                    onClose();
                  }}
                  className="w-full bg-[#00A2E9] text-white hover:bg-[#008bc9] text-xs h-7.5 gap-1.5"
                >
                  <Video className="size-3.5" />
                  Lihat Posisi di Viewport 3D
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Spesifikasi Jaringan & RTSP Stream */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Network className="size-3.5 text-[#00A2E9]" />
              Profil Jaringan & Video Stream
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 text-xs">
              <div>
                <span className="text-zinc-400 text-[11px]">IP Address</span>
                <p className="font-mono text-zinc-800 font-medium">{cctv.ipAddress}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">MAC Address</span>
                <p className="font-mono text-zinc-800 font-medium">{cctv.macAddress}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Resolusi Sensor</span>
                <p className="font-medium text-zinc-800">{cctv.resolution}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">RTSP Stream URI</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-800 truncate">
                  <span className="truncate">{cctv.rtspUrl}</span>
                  <button
                    onClick={() => handleCopy(cctv.rtspUrl, "rtsp")}
                    title="Copy RTSP"
                    className="text-zinc-400 hover:text-zinc-700 shrink-0"
                  >
                    {copiedField === "rtsp" ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Informasi Pengadaan, Garansi & Mitra */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="size-3.5 text-[#00A2E9]" />
              Rekam Jejak Aktivasi & Mitra Vendor
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 text-xs">
              <div>
                <span className="text-zinc-400 text-[11px]">Tanggal Pembelian</span>
                <p className="font-medium text-zinc-800">{cctv.purchaseDate}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Tanggal Go-Live / Aktivasi</span>
                <p className="font-medium text-zinc-800">{cctv.activationDate}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Status Garansi Resmi</span>
                <p className="font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> Aktif hingga {cctv.warrantyUntil}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Mitra Penyedia (Vendor)</span>
                <p className="font-bold text-zinc-900">{cctv.partnerCompany}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">PIC Lapangan Mitra</span>
                <p className="font-medium text-zinc-800 flex items-center gap-1">
                  <UserCheck className="size-3.5 text-zinc-400" />
                  {cctv.partnerPic}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px]">Kontak Darurat / WhatsApp</span>
                <a
                  href={`tel:${cctv.partnerPhone}`}
                  className="font-medium text-[#00A2E9] hover:underline flex items-center gap-1"
                >
                  <Phone className="size-3.5" />
                  {cctv.partnerPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Catatan Operasional */}
          {cctv.notes && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
              <span className="font-semibold block mb-0.5">Catatan Pemeliharaan Lapangan:</span>
              <p>{cctv.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Terakhir disinkronkan dari database PLN Icon Plus
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs h-8 px-4"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
