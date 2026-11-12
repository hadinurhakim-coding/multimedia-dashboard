"use client";

import * as React from "react";
import {
  Radio,
  Tv,
  Mic2,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
  Film,
  Sliders,
  Clock,
  MapPin,
  Mail,
} from "lucide-react";

interface MultimediaComproViewProps {
  onNavigateToEvent?: () => void;
  onNavigateToAktivasi?: () => void;
}

export function MultimediaComproView({
  onNavigateToEvent,
  onNavigateToAktivasi,
}: MultimediaComproViewProps) {
  const [selectedFacilityTab, setSelectedFacilityTab] = React.useState<"studio-a" | "studio-b" | "ob-van">("studio-a");
  const [selectedServiceCategory, setSelectedServiceCategory] = React.useState<"all" | "broadcast" | "production" | "audio" | "spatial">("all");

  const services = [
    {
      id: "srv-1",
      category: "broadcast",
      title: "Live Corporate Broadcasting & Webcast",
      tagline: "Penyiaran Hybrid Multi-Platform Berstandar TV Nasional",
      description:
        "Layanan siaran langsung untuk Rapat Umum Pemegang Saham (RUPS), Townhall BOD/BOC, Press Conference, dan peluncuran produk dengan transmisi terenkripsi berlatensi ultra-rendah.",
      icon: Radio,
      badge: "Broadcasting Unggulan",
      features: [
        "Multi-kamera 4K dengan switcher Blackmagic ATEM Constellation",
        "Redundansi jalur uplink SRT, RTMP, dan koneksi satelit/fiber Icon+",
        "Integrasi Zoom Webinar Enterprise & tata suara anti-feedback",
        "Custom live graphics (lower thirds, real-time polling, opening bumper)",
      ],
      stats: "500+ Sesi Berhasil",
    },
    {
      id: "srv-2",
      category: "production",
      title: "Video Production, TVC & Motion Graphics",
      tagline: "Karya Visual Sinematik untuk Narasi Korporasi Modern",
      description:
        "Produksi video profil perusahaan, dokumenter proyek strategis nasional, iklan komersial, motion graphic 2D/3D, dan sinematografi udara (drone 4K) dengan alur kerja pasca-produksi profesional.",
      icon: Film,
      badge: "Creative Production",
      features: [
        "Kamera bioskop Sony FX series dengan lensa sinema G-Master",
        "Animasi 3D teknik ketenagalistrikan (Gardu Induk, PLTS, Transmisi)",
        "Color grading profesional Davinci Resolve Studio",
        "Sinematografi udara (aerial drone) pilot bersertifikasi",
      ],
      stats: "150+ Proyek Video",
    },
    {
      id: "srv-3",
      category: "audio",
      title: "Podcast Studio & Sound Engineering",
      tagline: "Akustik Ruang Kedap Suara & Tata Suara Jernih",
      description:
        "Fasilitas perekaman podcast multi-host, voiceover narasi korporat, produksi sound design, jingle promosi, dan rekaman audio berkualitas tinggi dengan perangkat berstandar industri musik dan penyiaran.",
      icon: Mic2,
      badge: "Acoustic Audio Suite",
      features: [
        "Ruang kedap suara akustik dengan Noise Criterion NC-25",
        "Mikrofon siaran legendaris Shure SM7B & Rode PodMic",
        "Audio production console Rodecaster Pro II & DSP processing",
        "Layanan voiceover multitalenta (bahasa Indonesia & Inggris)",
      ],
      stats: "80+ Episode Podcast",
    },
    {
      id: "srv-4",
      category: "spatial",
      title: "Spatial 3D & Digital Twin Visualization",
      tagline: "Simulasi Visual Aset Ketenagalistrikan & Telematika",
      description:
        "Pemodelan spatial interaktif 3D untuk gardu induk digital twin, pemetaan posisi CCTV & IoT sensor, serta visualisasi aset real-time berbasis WebGL yang terintegrasi langsung pada dashboard operasional.",
      icon: Layers,
      badge: "Next-Gen Spatial Tech",
      features: [
        "Visualisasi 3D WebGL real-time interaktif tanpa plugin tambahan",
        "Pemetaan titik presisi perangkat CCTV Gardu Induk (Digital Twin GI Gandul)",
        "Integrasi status telemetri operasional aktif (Online, Kalibrasi, Siaga)",
        "Dukungan eksplorasi orbit kamera 360° & interaktivitas spasial",
      ],
      stats: "100% In-House WebGL",
    },
  ];

  const filteredServices = selectedServiceCategory === "all"
    ? services
    : services.filter((s) => s.category === selectedServiceCategory);

  const facilities = {
    "studio-a": {
      name: "Studio Utama & Broadcasting Stage",
      location: "Gedung Kantor Pusat PLN Icon Plus, Lantai 3",
      specs: [
        { label: "Kamera Utama", value: "4x Sony FX6 & FX3 Cinema Line 4K HDR" },
        { label: "Switcher & Mixer", value: "Blackmagic ATEM Constellation 8K + 2 M/E Advanced Panel" },
        { label: "Tata Cahaya", value: "Aputure Nova P300c DMX Ceiling Rail System" },
        { label: "Audio Mixer", value: "Yamaha TF5 32-Channel Digital Console" },
        { label: "Interkom Kru", value: "Hollyland Solidcom C1 Pro 8-Person Full-Duplex" },
        { label: "Background", value: "Motorized Cyclorama Green Screen & LED Video Wall P1.8" },
      ],
      suitableFor: "Live Streaming RUPS, Townhall Direksi, Peluncuran Produk, TV Program, Press Conference.",
    },
    "studio-b": {
      name: "Podcast & Voiceover Acoustic Suite",
      location: "Ruang Produksi Kreatif B, Multimedia Studio",
      specs: [
        { label: "Mikrofon", value: "4x Shure SM7B Dynamic Vocal Microphone" },
        { label: "Audio Engine", value: "Rodecaster Pro II Integrated Audio Production Studio" },
        { label: "Monitoring", value: "Genelec 8030C Active Studio Monitors + Beyerdynamic DT 770 Pro" },
        { label: "Kamera Podcast", value: "3x Sony PTZ 4K Auto-Tracking Robotic Cameras" },
        { label: "Treatment Akustik", value: "Vicoustic Diffuser & Rockwool Bass Traps (NC-25)" },
        { label: "Lighting", value: "Amaran 200x Bi-Color Softboxes & Accent RGB Tubes" },
      ],
      suitableFor: "Podcast Internal/Eksternal, Voiceover Video Korporat, Narasi Modul Pelatihan, Dubbing.",
    },
    "ob-van": {
      name: "Mobile Production Unit (OB Van & Flypack)",
      location: "Siaga Wilayah Jabodetabek & Dukungan Nasional Seluruh Unit PLN",
      specs: [
        { label: "Sistem Flypack", value: "Heavy-Duty Shockproof Rack Multi-Camera System" },
        { label: "Kamera Lapangan", value: "Sony PMW-400 / FX6 dengan Lensa Telefoto B4" },
        { label: "Uplink Jaringan", value: "Bonded Cellular LiveU LU600 + Starlink High Performance" },
        { label: "Wireless Video", value: "Teradek Bolt 4K Zero-Delay Transmitter (Jangkauan 450m)" },
        { label: "Audio Lapangan", value: "Sennheiser EW-DP Wireless Lavalier & Shotgun MKH 416" },
        { label: "Daya Mandiri", value: "Generator Senyap 5 kVA + Online UPS Backup 3000 VA" },
      ],
      suitableFor: "Liputan Lapangan (Out-door), Peresmian Pembangkit Listrik, Evakuasi/Siaga Bencana, Kunjungan Kerja Menteri/BOD.",
    },
  };

  const clientShowcase = [
    {
      title: "RUPS Tahunan PT PLN (Persero)",
      role: "Official Host Broadcasting",
      desc: "Penyiaran hybrid multi-titik terenkripsi menghubungkan Kementerian BUMN, Dewan Komisaris, dan Direksi.",
      tag: "Live Broadcast",
    },
    {
      title: "Peresmian PLTS Terapung Cirata 192 MWp",
      role: "Video Sinematik & Multi-Cam Field",
      desc: "Liputan sinematik 4K multicam, aerial drone drone, dan siaran langsung kunjungan kenegaraan.",
      tag: "Field Production",
    },
    {
      title: "Peringatan Hari Listrik Nasional (HLN)",
      role: "Broadcast Relay Serentak 10 Regional",
      desc: "Relay streaming terintegrasi menghubungkan seluruh Unit Induk Wilayah se-Indonesia secara sinkron.",
      tag: "National Relay",
    },
    {
      title: "Digital Twin 3D Gardu Induk Gandul",
      role: "3D Spatial WebGL Architecture",
      desc: "Pembangunan sistem representasi 3D digital twin gardu induk terintegrasi sensor pengawasan CCTV.",
      tag: "Digital Twin 3D",
    },
  ];

  const crewRoles = [
    { title: "VJ Utama", desc: "Sutradara siaran langsung & pengatur alur switcher gambar utama." },
    { title: "Co-VJ Zoom", desc: "Pengendali platform hybrid webinar, breakout room, dan audio routing." },
    { title: "Kameramen", desc: "Sinematografer kamera panggung, mobile rig, dan pengoperasi PTZ." },
    { title: "Audio & Uplink", desc: "Penata suara digital, pencegah feedback, dan pengawas transmisi SRT/RTMP." },
    { title: "Operator Visual", desc: "Pengendali materi presentasi BOD, bumper video animasi, dan timer acara." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HERO BANNER: Corporate PLN Multimedia Showcase */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-[#003B5C] via-[#00273D] to-[#001726] text-white p-6 sm:p-10 shadow-lg">
        {/* Subtle Background Circuit Lines & Cyan Accent */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-[#00A2E9]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 size-80 rounded-full bg-[#FFD100]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-5">
          {/* Top Identity Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#FFD100]">
            <Zap className="size-3.5 fill-[#FFD100] text-[#FFD100]" />
            <span>Divisi Multimedia & Broadcasting • PLN Icon Plus</span>
            <span className="size-1 rounded-full bg-white/50" />
            <span className="text-zinc-300 font-normal">Beyond KWh Excellence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
            Solusi Kreatif Multimedia, Produksi Video Sinematik & Penyiaran Korporat Berstandar Nasional
          </h1>

          {/* Body Prose */}
          <p className="text-sm sm:text-base text-zinc-200 font-normal leading-relaxed max-w-3xl">
            Pusat keunggulan kreatif terpadu dari <strong className="text-white font-semibold">PLN Icon Plus</strong> yang menyediakan layanan penyiaran siaran langsung (live broadcasting), studio produksi audio-visual, produksi konten animasi 3D, serta visualisasi digital twin spasial untuk mendukung agenda transformasi digital ketenagalistrikan nasional.
          </p>

          {/* CTA Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("layanan-multimedia-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A2E9] hover:bg-[#008ecf] text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Jelajahi Layanan Multimedia</span>
              <ArrowRight className="size-4" />
            </button>

            {onNavigateToEvent && (
              <button
                type="button"
                onClick={onNavigateToEvent}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold transition-all backdrop-blur-sm cursor-pointer"
              >
                <Calendar className="size-4 text-[#FFD100]" />
                <span>Lihat Jadwal Shift & Event</span>
              </button>
            )}

            {onNavigateToAktivasi && (
              <button
                type="button"
                onClick={onNavigateToAktivasi}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold transition-all backdrop-blur-sm cursor-pointer"
              >
                <Layers className="size-4 text-[#00A2E9]" />
                <span>Digital Twin CCTV 3D</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Bottom Key Statistics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 mt-8 border-t border-white/10 relative z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[#00A2E9]">
              <Radio className="size-4" />
              <span className="text-xl sm:text-2xl font-black text-white">500+</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-medium">Live Broadcast RUPS & Townhall</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[#FFD100]">
              <Tv className="size-4" />
              <span className="text-xl sm:text-2xl font-black text-white">4K HDR</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-medium">Multi-Camera Cinema Production</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="size-4" />
              <span className="text-xl sm:text-2xl font-black text-white">99.9%</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-medium">Broadcasting SLA & Redundansi</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[#00A2E9]">
              <Users className="size-4" />
              <span className="text-xl sm:text-2xl font-black text-white">Siaga 24/7</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-medium">Tim Teknis VJ & Kameramen</p>
          </div>
        </div>
      </div>

      {/* 2. CORE CAPABILITIES (4 SERVICE PILLARS) */}
      <div id="layanan-multimedia-section" className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A2E9] uppercase tracking-wider mb-1">
              <Sparkles className="size-3.5" />
              <span>Kapabilitas & Portofolio Layanan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#003B5C] tracking-tight">
              Pilar Solusi Multimedia Terpadu
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
              Dukungan menyeluruh dari tahap pra-produksi, eksekusi siaran beresolusi tinggi, hingga tata kelola materi video korporat.
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200">
            {[
              { id: "all", label: "Semua Layanan" },
              { id: "broadcast", label: "Broadcasting" },
              { id: "production", label: "Video Produksi" },
              { id: "audio", label: "Studio Podcast" },
              { id: "spatial", label: "Digital Twin 3D" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedServiceCategory(tab.id as typeof selectedServiceCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedServiceCategory === tab.id
                    ? "bg-white text-[#003B5C] shadow-2xs border border-zinc-200/60 font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((service) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-[#00A2E9]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-[#003B5C] to-[#00A2E9] text-white flex items-center justify-center shadow-xs shrink-0">
                      <IconComponent className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#003B5C] border border-sky-200">
                        {service.badge}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {service.stats}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                      {service.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#00A2E9] mt-0.5">
                      {service.tagline}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Feature Checkpoints */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    {service.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-zinc-700">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Standar Mutu Divisi Multimedia PLN
                  </span>
                  {onNavigateToEvent && (
                    <button
                      type="button"
                      onClick={onNavigateToEvent}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#00A2E9] hover:text-[#003B5C] transition-colors cursor-pointer"
                    >
                      <span>Jadwalkan Sesi</span>
                      <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FACILITIES & PRODUCTION HARDWARE SPECIFICATIONS */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] uppercase tracking-wider mb-1">
              <Sliders className="size-3.5 text-[#00A2E9]" />
              <span>Infrastruktur & Perangkat Produksi</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#003B5C] tracking-tight">
              Fasilitas Studio & Spesifikasi Teknis
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Didukung oleh perangkat penyiaran dan perangkat lunak pasca-produksi standar broadcast internasional.
            </p>
          </div>

          {/* Facility Tab Selector */}
          <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedFacilityTab("studio-a")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityTab === "studio-a"
                  ? "bg-white text-[#003B5C] font-bold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Studio Utama (A)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFacilityTab("studio-b")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityTab === "studio-b"
                  ? "bg-white text-[#003B5C] font-bold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Podcast Suite (B)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFacilityTab("ob-van")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFacilityTab === "ob-van"
                  ? "bg-white text-[#003B5C] font-bold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              OB Van / Lapangan
            </button>
          </div>
        </div>

        {/* Selected Facility Details */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
            <div>
              <h4 className="font-bold text-sm text-[#003B5C]">
                {facilities[selectedFacilityTab].name}
              </h4>
              <p className="text-xs text-zinc-600 flex items-center gap-1.5 mt-0.5">
                <MapPin className="size-3 text-[#00A2E9]" />
                <span>{facilities[selectedFacilityTab].location}</span>
              </p>
            </div>
            <div className="text-xs text-zinc-500 sm:text-right">
              <span className="font-semibold text-[#003B5C]">Peruntukan: </span>
              <span>{facilities[selectedFacilityTab].suitableFor}</span>
            </div>
          </div>

          {/* Specs Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {facilities[selectedFacilityTab].specs.map((spec, sIdx) => (
              <div
                key={sIdx}
                className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-white hover:border-sky-200 transition-all space-y-1"
              >
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {spec.label}
                </span>
                <p className="text-xs font-semibold text-zinc-900">
                  {spec.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. SHOWCASE PORTOFOLIO / RECENT MILESTONES */}
      <div className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A2E9] uppercase tracking-wider mb-1">
            <Award className="size-3.5" />
            <span>Rekam Jejak & Portofolio Acara</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#003B5C] tracking-tight">
            Acara Strategis Korporat yang Telah Didukung
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {clientShowcase.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:border-[#00A2E9]/40 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-[#003B5C] border border-zinc-200 inline-block">
                  {item.tag}
                </span>
                <h4 className="font-bold text-sm text-zinc-900 leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] font-semibold text-[#00A2E9]">
                  {item.role}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <CheckCircle2 className="size-3" />
                <span>Sukses Terselenggara</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. STRUKTUR KRU OPERASIONAL MULTIMEDIA */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-extrabold text-[#003B5C] tracking-tight flex items-center gap-2">
              <Users className="size-4 text-[#00A2E9]" />
              <span>Standar Pembagian Peran Kru Produksi & Siaran</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Setiap sesi live broadcast didukung oleh struktur personil terlatih sesuai SOP Divisi Multimedia.
            </p>
          </div>
          {onNavigateToEvent && (
            <button
              type="button"
              onClick={onNavigateToEvent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#003B5C] text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
            >
              <span>Kelola Tim di Menu Event</span>
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {crewRoles.map((role, rIdx) => (
            <div
              key={rIdx}
              className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-[#003B5C] text-white flex items-center justify-center text-[10px] font-bold">
                  {rIdx + 1}
                </div>
                <h4 className="font-bold text-xs text-zinc-900">{role.title}</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. CONTACT & STUDIO RESERVATION CTA */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50/60 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] uppercase tracking-wider">
            <Radio className="size-3.5 text-[#00A2E9]" />
            <span>Studio Multimedia PLN Icon Plus Siap Melayani</span>
          </div>
          <h3 className="text-xl font-black text-[#003B5C] tracking-tight">
            Membutuhkan Dukungan Siaran Langsung atau Produksi Video?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Hubungi tim koordinator multimedia untuk konsultasi teknis kebutuhan broadcast, ketersediaan studio rekaman, dan penugasan kru event resmi PLN Group.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-zinc-700">
            <div className="flex items-center gap-1.5 font-medium">
              <Mail className="size-3.5 text-[#00A2E9]" />
              <span>multimedia@iconpln.co.id</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5 text-[#00A2E9]" />
              <span>Senin - Jumat (Siaga Event 24/7)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          {onNavigateToEvent && (
            <button
              type="button"
              onClick={onNavigateToEvent}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#003B5C] hover:bg-[#002b44] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <Calendar className="size-4 text-[#FFD100]" />
              <span>Buka Jadwal Penugasan</span>
            </button>
          )}

          {onNavigateToAktivasi && (
            <button
              type="button"
              onClick={onNavigateToAktivasi}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 text-[#003B5C] border border-zinc-200 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Layers className="size-4 text-[#00A2E9]" />
              <span>Eksplorasi Digital Twin 3D</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
