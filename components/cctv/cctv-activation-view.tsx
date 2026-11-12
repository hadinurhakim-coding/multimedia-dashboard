"use client";

import React, { useState, useMemo } from "react";
import {
  CCTVUnit,
  FacilityLocationId,
  FACILITY_LOCATIONS,
  getCCTVDataByLocation,
} from "@/types/cctv";
import { CCTV3DLocator } from "./cctv-3d-locator";
import { CCTVTable } from "./cctv-table";
import { CCTVDetailModal } from "./cctv-detail-modal";
import {
  Video,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  Server,
  Plus,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CCTVActivationView() {
  const [selectedLocationId, setSelectedLocationId] =
    useState<FacilityLocationId>("gi-gandul");

  const currentLocation =
    FACILITY_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    FACILITY_LOCATIONS[0];

  const cctvList = useMemo(
    () => getCCTVDataByLocation(selectedLocationId),
    [selectedLocationId]
  );

  const [selectedCCTVId, setSelectedCCTVId] = useState<string | null>(null);
  const [modalCCTV, setModalCCTV] = useState<CCTVUnit | null>(null);

  // Derive active CCTV: if selectedCCTVId is present in current location list, use it; else fallback to first item
  const activeCCTVId = useMemo(() => {
    if (selectedCCTVId && cctvList.some((c) => c.id === selectedCCTVId)) {
      return selectedCCTVId;
    }
    return cctvList[0]?.id || null;
  }, [selectedCCTVId, cctvList]);

  const totalCount = cctvList.length;
  const activeCount = cctvList.filter((c) => c.status === "active").length;
  const warningCount = cctvList.filter((c) => c.status === "warning").length;
  const offlineCount = cctvList.filter((c) => c.status === "offline").length;

  const handleSelectCCTV = (id: string) => {
    setSelectedCCTVId(id);
  };

  const handleOpenDetail = (cctv: CCTVUnit) => {
    setModalCCTV(cctv);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0">
      {/* 1. Page Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              Aktivasi Layanan CCTV & IoT Digital Twin
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#00A2E9] border border-[#00A2E9]/20">
              Surveillance as a Service
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {currentLocation.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 text-zinc-700 border-zinc-200 gap-1.5"
            onClick={() => {
              const dataStr =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(cctvList, null, 2));
              const downloadAnchor = document.createElement("a");
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute(
                "download",
                `pln-cctv-${selectedLocationId}-data.json`
              );
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
          >
            <Download className="size-3.5" />
            Ekspor Data JSON
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 bg-[#00A2E9] text-white hover:bg-[#008bc9] gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            Tambah Aktivasi CCTV Baru
          </Button>
        </div>
      </div>

      {/* 2. Top Metric KPI Chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-zinc-400">Total Unit Terdaftar</span>
            <p className="text-xl font-bold text-zinc-900">{totalCount} Unit</p>
          </div>
          <div className="size-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <Video className="size-4.5" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-zinc-400">Online & Siap Operasi</span>
            <p className="text-xl font-bold text-[#00A2E9]">{activeCount} Unit</p>
          </div>
          <div className="size-9 rounded-lg bg-sky-50 text-[#00A2E9] flex items-center justify-center">
            <ShieldCheck className="size-4.5" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-zinc-400">Perlu Kalibrasi</span>
            <p className="text-xl font-bold text-amber-600">{warningCount} Unit</p>
          </div>
          <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="size-4.5" />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-zinc-400">Jalur Putus / Offline</span>
            <p className="text-xl font-bold text-rose-600">{offlineCount} Unit</p>
          </div>
          <div className="size-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <WifiOff className="size-4.5" />
          </div>
        </div>
      </div>

      {/* 3. BAGIAN ATAS: 3D Spatial Digital Twin Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-[#00A2E9]" />
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              Peta Lokasi Spatial 3D ({currentLocation.name})
            </h2>
          </div>
          <span className="text-xs text-zinc-500 hidden sm:flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#00A2E9]" />
            Klik 2x pada peta untuk aktifkan navigasi 3D • Bebas scroll halaman
          </span>
        </div>

        <CCTV3DLocator
          cctvList={cctvList}
          selectedCCTVId={activeCCTVId}
          onSelectCCTV={handleSelectCCTV}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(locId) => {
            setSelectedLocationId(locId);
            setSelectedCCTVId(null);
          }}
        />
      </div>

      {/* 4. BAGIAN BAWAH: Tabel Pencatatan Aktivasi CCTV */}
      <div className="space-y-2">
        <CCTVTable
          cctvList={cctvList}
          selectedCCTVId={activeCCTVId}
          onSelectCCTV={handleSelectCCTV}
          onOpenDetail={handleOpenDetail}
        />
      </div>

      {/* 5. Detail Modal */}
      <CCTVDetailModal
        cctv={modalCCTV}
        onClose={() => setModalCCTV(null)}
        onFocus3D={(id) => {
          setSelectedCCTVId(id);
        }}
      />
    </div>
  );
}
