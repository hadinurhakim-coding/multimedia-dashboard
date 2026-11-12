"use client";

import React, { useState, useMemo } from "react";
import { CCTVUnit } from "@/types/cctv";
import {
  Search,
  Crosshair,
  Info,
  Copy,
  Check,
  Phone,
  ShieldCheck,
  Building2,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CCTVTableProps {
  cctvList: CCTVUnit[];
  selectedCCTVId: string | null;
  onSelectCCTV: (id: string) => void;
  onOpenDetail: (cctv: CCTVUnit) => void;
}

export function CCTVTable({
  cctvList,
  selectedCCTVId,
  onSelectCCTV,
  onOpenDetail,
}: CCTVTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSN, setCopiedSN] = useState<string | null>(null);

  const filteredCCTV = useMemo(() => {
    return cctvList.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.sn.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.partnerCompany.toLowerCase().includes(q) ||
        item.partnerPic.toLowerCase().includes(q)
      );
    });
  }, [cctvList, searchQuery]);

  const handleCopySN = (sn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sn);
    setCopiedSN(sn);
    setTimeout(() => setCopiedSN(null), 1800);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-xs overflow-hidden flex flex-col w-full max-w-full min-w-0">
      {/* Table Header Control Bar */}
      <div className="p-4 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-[#00A2E9]/10 text-[#00A2E9] flex items-center justify-center font-bold shrink-0">
            <Building2 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
              Pencatatan Data Aktivasi CCTV
            </h3>
            <p className="text-xs text-zinc-500">
              Menampilkan {filteredCCTV.length} dari {cctvList.length} total unit terpasang
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SN, lokasi, atau mitra..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00A2E9] focus:border-[#00A2E9] transition-all"
          />
        </div>
      </div>

      {/* Responsive Dense Table */}
      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200/80 bg-zinc-100/60 text-zinc-600 font-medium select-none">
              <th className="py-2.5 px-4 font-semibold">Serial Number (SN)</th>
              <th className="py-2.5 px-4 font-semibold">Unit & Model Kamera</th>
              <th className="py-2.5 px-4 font-semibold">Tgl Beli</th>
              <th className="py-2.5 px-4 font-semibold">Tgl Aktif & Garansi</th>
              <th className="py-2.5 px-4 font-semibold">Lokasi Pemasangan</th>
              <th className="py-2.5 px-4 font-semibold">Kontak Mitra Vendor</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredCCTV.map((cctv) => {
              const isSelected = cctv.id === selectedCCTVId;

              return (
                <tr
                  key={cctv.id}
                  onClick={() => onSelectCCTV(cctv.id)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-sky-50/70 hover:bg-sky-50"
                      : "hover:bg-zinc-50/80"
                  }`}
                >
                  {/* 1. SN with Copy Button */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                        {cctv.sn}
                      </span>
                      <button
                        onClick={(e) => handleCopySN(cctv.sn, e)}
                        title="Salin SN"
                        className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors"
                      >
                        {copiedSN === cctv.sn ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* 2. Unit Name & Model */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-zinc-900 leading-tight">
                        {cctv.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[200px]">
                        {cctv.model}
                      </p>
                    </div>
                  </td>

                  {/* 3. Tanggal Beli */}
                  <td className="py-3 px-4 text-zinc-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="size-3 text-zinc-400" />
                      <span>{cctv.purchaseDate}</span>
                    </div>
                  </td>

                  {/* 4. Tanggal Aktif & Garansi */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-zinc-900">{cctv.activationDate}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 font-medium">
                        <ShieldCheck className="size-3" /> Garansi s/d {cctv.warrantyUntil}
                      </span>
                    </div>
                  </td>

                  {/* 5. Lokasi Pemasangan */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-zinc-800 leading-tight">
                        {cctv.location}
                      </p>
                      <span className="text-[11px] text-zinc-400">{cctv.floor}</span>
                    </div>
                  </td>

                  {/* 6. Kontak Mitra Vendor */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-zinc-900 leading-tight">
                        {cctv.partnerCompany}
                      </p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Phone className="size-3 text-zinc-400" />
                        <span>{cctv.partnerPic} ({cctv.partnerPhone})</span>
                      </p>
                    </div>
                  </td>

                  {/* 7. Status Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {cctv.status === "active" && (
                      <Badge variant="outline" className="bg-sky-50 text-[#00A2E9] border-[#00A2E9]/30 text-[11px] font-semibold gap-1">
                        <span className="size-1.5 rounded-full bg-[#00A2E9]" />
                        Online
                      </Badge>
                    )}
                    {cctv.status === "warning" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] font-semibold gap-1">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Kalibrasi
                      </Badge>
                    )}
                    {cctv.status === "offline" && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[11px] font-semibold gap-1">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        Offline
                      </Badge>
                    )}
                  </td>

                  {/* 8. Action Buttons */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCCTV(cctv.id);
                        }}
                        className={`h-7 px-2.5 text-[11px] font-medium gap-1 rounded-md transition-all ${
                          isSelected
                            ? "bg-[#00A2E9] text-white hover:bg-[#008bc9]"
                            : "text-zinc-700 hover:text-zinc-900 border-zinc-200"
                        }`}
                      >
                        <Crosshair className="size-3" />
                        Fokus 3D
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(cctv);
                        }}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md"
                        title="Buka Detail Lengkap"
                      >
                        <Info className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredCCTV.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  Tidak ada data CCTV yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
