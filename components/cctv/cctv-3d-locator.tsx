"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CCTVUnit, FacilityLocationId, FACILITY_LOCATIONS } from "@/types/cctv";
import {
  RotateCcw,
  Compass,
  Layers,
  Eye,
  Activity,
  AlertTriangle,
  WifiOff,
  MousePointerClick,
  Lock,
  Unlock,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CCTV3DLocatorProps {
  cctvList: CCTVUnit[];
  selectedCCTVId: string | null;
  onSelectCCTV: (id: string) => void;
  selectedLocationId?: FacilityLocationId;
  onSelectLocation?: (locationId: FacilityLocationId) => void;
}

export function CCTV3DLocator({
  cctvList,
  selectedCCTVId,
  onSelectCCTV,
  selectedLocationId = "gi-gandul",
  onSelectLocation,
}: CCTV3DLocatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const environmentGroupRef = useRef<THREE.Group | null>(null);
  const markerMeshesMap = useRef<Map<string, THREE.Object3D>>(new Map());

  // Location Dropdown State
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const currentLocation =
    FACILITY_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    FACILITY_LOCATIONS[0];

  // Close location dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        locationMenuRef.current &&
        !locationMenuRef.current.contains(event.target as Node)
      ) {
        setIsLocationMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Interaction Lock State: map controls disabled until double-clicked
  const [isActivated, setIsActivated] = useState(false);
  const isActivatedRef = useRef(false);

  // Camera animation target
  const animTarget = useRef<{
    camPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    isAnimating: boolean;
  }>({
    camPos: new THREE.Vector3(12, 14, 18),
    targetPos: new THREE.Vector3(0, 1, 0),
    isAnimating: false,
  });

  const [autoRotate, setAutoRotate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "warning" | "offline">("all");
  const [isTopDown, setIsTopDown] = useState(false);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#FAFAFA");
    sceneRef.current = scene;

    // Subtle fog for depth
    scene.fog = new THREE.FogExp2("#FAFAFA", 0.018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(14, 16, 20);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't go below ground
    controls.minDistance = 4;
    controls.maxDistance = 50;
    controls.target.set(0, 1, 0);
    controls.enabled = isActivatedRef.current;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight("#FFFFFF", 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#FFFFFF", 1.8);
    dirLight.position.set(15, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Secondary soft fill light
    const fillLight = new THREE.DirectionalLight("#00A2E9", 0.35);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // 6. Build Architectural Facility Model
    const envGroup = new THREE.Group();
    scene.add(envGroup);
    environmentGroupRef.current = envGroup;
    if (selectedLocationId === "auditorium-pln") {
      buildAuditoriumEnvironment(envGroup);
    } else {
      buildSubstationEnvironment(envGroup);
    }

    // 7. Group for CCTV Markers
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // 8. Raycasting for Clicking Markers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!isActivatedRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(markersGroup.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.cctvId && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.cctvId) {
          onSelectCCTV(obj.userData.cctvId);
        }
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // 10. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera fly-to interpolation
      if (animTarget.current.isAnimating) {
        camera.position.lerp(animTarget.current.camPos, 0.05);
        controls.target.lerp(animTarget.current.targetPos, 0.05);

        if (
          camera.position.distanceTo(animTarget.current.camPos) < 0.05 &&
          controls.target.distanceTo(animTarget.current.targetPos) < 0.05
        ) {
          animTarget.current.isAnimating = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectCCTV, selectedLocationId]);

  // Dynamic Rebuilding of 3D Facility Environment on Location Change
  useEffect(() => {
    const envGroup = environmentGroupRef.current;
    if (!envGroup) return;

    // Dispose and clear previous environment objects
    while (envGroup.children.length > 0) {
      const child = envGroup.children[0];
      envGroup.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    if (selectedLocationId === "auditorium-pln") {
      buildAuditoriumEnvironment(envGroup);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1.2, 0);
      }
      if (cameraRef.current) {
        cameraRef.current.position.set(10, 12, 14);
      }
    } else {
      buildSubstationEnvironment(envGroup);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1, 0);
      }
      if (cameraRef.current) {
        cameraRef.current.position.set(14, 16, 20);
      }
    }
  }, [selectedLocationId]);

  // Update CCTV Markers when list or selection changes
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    // Clear old markers
    while (markersGroup.children.length > 0) {
      const child = markersGroup.children[0];
      markersGroup.remove(child);
    }
    markerMeshesMap.current.clear();

    // Create markers for filtered CCTV
    const filteredList = cctvList.filter((item) => {
      if (filterStatus === "all") return true;
      return item.status === filterStatus;
    });

    filteredList.forEach((cctv) => {
      const isSelected = cctv.id === selectedCCTVId;
      const marker = createCCTVMarker(cctv, isSelected);
      marker.userData = { cctvId: cctv.id };
      markersGroup.add(marker);
      markerMeshesMap.current.set(cctv.id, marker);
    });
  }, [cctvList, selectedCCTVId, filterStatus]);

  // Handle fly-to when selectedCCTVId changes
  useEffect(() => {
    if (!selectedCCTVId || !cameraRef.current || !controlsRef.current) return;

    const selectedUnit = cctvList.find((c) => c.id === selectedCCTVId);
    if (!selectedUnit) return;

    const [x, y, z] = selectedUnit.position3D;
    const targetPos = new THREE.Vector3(x, y, z);

    // Compute camera offset along look angle
    const camOffset = new THREE.Vector3(3.5, 3.0, 3.5);
    const camPos = targetPos.clone().add(camOffset);

    animTarget.current = {
      camPos,
      targetPos,
      isAnimating: true,
    };
  }, [selectedCCTVId, cctvList]);

  // Controls Handlers
  const handleResetCamera = useCallback(() => {
    setIsTopDown(false);
    animTarget.current = {
      camPos: new THREE.Vector3(14, 16, 20),
      targetPos: new THREE.Vector3(0, 1, 0),
      isAnimating: true,
    };
  }, []);

  const handleToggleTopDown = useCallback(() => {
    if (!isTopDown) {
      animTarget.current = {
        camPos: new THREE.Vector3(0, 26, 0.1),
        targetPos: new THREE.Vector3(0, 0, 0),
        isAnimating: true,
      };
      setIsTopDown(true);
    } else {
      handleResetCamera();
    }
  }, [isTopDown, handleResetCamera]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 0.8;
    }
  }, [autoRotate]);

  // Synchronize isActivated state with OrbitControls and ref
  useEffect(() => {
    isActivatedRef.current = isActivated;
    if (controlsRef.current) {
      controlsRef.current.enabled = isActivated;
    }
  }, [isActivated]);

  // Click outside and Escape key listeners to unlock cursor / lock map
  useEffect(() => {
    if (!isActivated) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsActivated(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActivated(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActivated]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full min-w-0 h-[400px] lg:h-[460px] rounded-xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs flex flex-col"
    >
      {/* 3D Top Floating Toolbar */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Facility Badge & Status Filter */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs pointer-events-auto">
          {/* Location Dropdown Trigger & Options Popover */}
          <div className="relative pr-3 border-r border-zinc-200" ref={locationMenuRef}>
            <button
              type="button"
              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 -my-0.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer select-none group/loc"
              title="Ganti Lokasi Fasilitas Digital Twin"
            >
              <span className={cn("size-2 rounded-full animate-pulse", currentLocation.dotColor)} />
              <span className="text-xs font-semibold text-zinc-900 tracking-tight">
                {currentLocation.name}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-zinc-400 group-hover/loc:text-zinc-700 transition-transform duration-200",
                  isLocationMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Options Popover matching the user's video UX */}
            {isLocationMenuOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Pilih Lokasi Fasilitas
                </div>
                {FACILITY_LOCATIONS.map((loc) => {
                  const isSelected = (selectedLocationId || "gi-gandul") === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onSelectLocation?.(loc.id);
                        setIsLocationMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left",
                        isSelected
                          ? "bg-zinc-100/90 text-zinc-900 font-semibold"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn("size-2 rounded-full shrink-0", loc.dotColor)} />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate leading-tight font-medium text-zinc-900">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                            {loc.subtitle}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="size-4 text-zinc-900 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterStatus === "all"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Semua ({cctvList.length})
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterStatus === "active"
                  ? "bg-[#00A2E9] text-white"
                  : "text-[#00A2E9] hover:bg-sky-50"
              }`}
            >
              <Activity className="size-3" />
              Online ({cctvList.filter((c) => c.status === "active").length})
            </button>
            <button
              onClick={() => setFilterStatus("warning")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterStatus === "warning"
                  ? "bg-amber-500 text-white"
                  : "text-amber-600 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle className="size-3" />
              Perhatian ({cctvList.filter((c) => c.status === "warning").length})
            </button>
            <button
              onClick={() => setFilterStatus("offline")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterStatus === "offline"
                  ? "bg-rose-500 text-white"
                  : "text-rose-600 hover:bg-rose-50"
              }`}
            >
              <WifiOff className="size-3" />
              Offline ({cctvList.filter((c) => c.status === "offline").length})
            </button>
          </div>
        </div>

        {/* Right: Camera Action Controls & Lock/Unlock Toggle */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {isActivated ? (
            <div className="flex items-center gap-1.5 bg-[#003B5C] text-white px-2.5 py-1 rounded-lg border border-sky-400/30 shadow-xs animate-in fade-in zoom-in-95 duration-150">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-sky-100">
                Navigasi Aktif
              </span>
              <button
                onClick={() => setIsActivated(false)}
                title="Kunci navigasi (Esc / Klik di luar)"
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Lock className="size-3 text-amber-300" />
                <span>Kunci</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsActivated(true)}
              title="Klik untuk mengaktifkan navigasi 3D"
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <Unlock className="size-3 text-[#00A2E9]" />
              <span className="text-[11px] font-medium">Aktifkan 3D</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-zinc-200/80 shadow-xs">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Toggle Auto-Rotate"
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                autoRotate ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Compass className="size-4" />
            </button>
            <button
              onClick={handleToggleTopDown}
              title={isTopDown ? "Kembali ke Tampilan Perspektif 3D" : "Tampilan Denah Atas (Top-Down)"}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                isTopDown ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Layers className="size-4" />
            </button>
            <button
              onClick={handleResetCamera}
              title="Reset Sudut Kamera"
              className="p-1.5 rounded text-xs text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className={`size-full transition-opacity duration-200 ${
          isActivated
            ? "cursor-grab active:cursor-grabbing pointer-events-auto"
            : "pointer-events-none opacity-95"
        }`}
      />

      {/* Inactive Double-Click Shield Overlay */}
      {!isActivated && (
        <div
          onDoubleClick={() => setIsActivated(true)}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/[0.03] backdrop-blur-[0.5px] cursor-pointer select-none transition-all group"
          title="Klik 2x untuk Mengaktifkan Navigasi 3D"
        >
          <div className="flex flex-col items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-md text-center transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:border-[#00A2E9]/40 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-[#00A2E9] border border-sky-100 shadow-xs">
                <MousePointerClick className="size-4 animate-bounce" />
              </span>
              <div className="text-left">
                <span className="block text-xs font-semibold text-zinc-900 tracking-tight">
                  Klik 2x untuk Mengaktifkan Navigasi 3D
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Navigasi dikunci agar tidak mengganggu scrolling halaman
                </span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between gap-3 pt-2 mt-0.5 border-t border-zinc-100">
              <span className="text-[10px] text-zinc-400 font-medium">
                Double click area peta
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActivated(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00A2E9] hover:bg-[#0086c4] text-white text-[11px] font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Unlock className="size-3" />
                Aktifkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Legend & Selected Unit Summary */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Selected CCTV Indicator */}
        {selectedCCTVId ? (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs flex items-center gap-2 pointer-events-auto">
            <Eye className="size-4 text-[#00A2E9]" />
            <span className="text-xs text-zinc-500">Kamera Terpilih:</span>
            <span className="text-xs font-semibold text-zinc-900">
              {cctvList.find((c) => c.id === selectedCCTVId)?.name}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              ({cctvList.find((c) => c.id === selectedCCTVId)?.sn})
            </span>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs flex items-center gap-2 pointer-events-auto">
            <span className="text-xs text-zinc-400">
              Klik salah satu pin CCTV 3D di peta atau baris tabel di bawah untuk fokus lokasi.
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs flex items-center gap-3 text-[11px] text-zinc-500 pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#00A2E9]" />
            Aktif
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#FFD100]" />
            Perhatian
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#ED1C24]" />
            Offline
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Procedural Three.js Substation & CCTV Marker Builder Functions
// ============================================================================

function buildSubstationEnvironment(scene: THREE.Group | THREE.Scene) {
  // 1. Ground Plane
  const groundGeo = new THREE.PlaneGeometry(36, 36);
  const groundMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC",
    roughness: 0.9,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid Lines
  const grid = new THREE.GridHelper(36, 36, "#CBD5E1", "#E2E8F0");
  grid.position.y = 0.01;
  scene.add(grid);

  // 2. Main Control Building (Gedung Utama SCADA & Server)
  const bldgGeo = new THREE.BoxGeometry(9, 4, 11);
  const bldgMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.8,
    metalness: 0.1,
  });
  const bldg = new THREE.Mesh(bldgGeo, bldgMat);
  bldg.position.set(4, 2, -1);
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  scene.add(bldg);

  // Building architectural edge outlines
  const bldgEdges = new THREE.EdgesGeometry(bldgGeo);
  const bldgLineMat = new THREE.LineBasicMaterial({ color: "#94A3B8" });
  const bldgLines = new THREE.LineSegments(bldgEdges, bldgLineMat);
  bldgLines.position.copy(bldg.position);
  scene.add(bldgLines);

  // Building Floor Separation Line (Lantai 1 / Lantai 2)
  const floorLineGeo = new THREE.BoxGeometry(9.05, 0.1, 11.05);
  const floorLineMat = new THREE.MeshBasicMaterial({ color: "#00A2E9" });
  const floorLine = new THREE.Mesh(floorLineGeo, floorLineMat);
  floorLine.position.set(4, 2.0, -1);
  scene.add(floorLine);

  // 3. Switchgear & Cubicle Bay Building
  const swGeo = new THREE.BoxGeometry(6, 3.5, 7);
  const swMat = new THREE.MeshStandardMaterial({
    color: "#F1F5F9",
    roughness: 0.85,
  });
  const swBldg = new THREE.Mesh(swGeo, swMat);
  swBldg.position.set(-2, 1.75, -0.5);
  swBldg.castShadow = true;
  swBldg.receiveShadow = true;
  scene.add(swBldg);

  const swEdges = new THREE.EdgesGeometry(swGeo);
  const swLines = new THREE.LineSegments(swEdges, bldgLineMat);
  swLines.position.copy(swBldg.position);
  scene.add(swLines);

  // 4. Switchyard Area with Transformer Bays (Outdoor Trafo)
  // Transformer Pad 1
  const trafoPadGeo = new THREE.BoxGeometry(4, 0.4, 4);
  const trafoPadMat = new THREE.MeshStandardMaterial({ color: "#E2E8F0" });
  const pad1 = new THREE.Mesh(trafoPadGeo, trafoPadMat);
  pad1.position.set(-6, 0.2, -4);
  pad1.receiveShadow = true;
  scene.add(pad1);

  // Transformer Body (Tank)
  const trafoTankGeo = new THREE.BoxGeometry(2.5, 2.2, 2.5);
  const trafoTankMat = new THREE.MeshStandardMaterial({
    color: "#003B5C", // PLN Navy
    roughness: 0.4,
    metalness: 0.6,
  });
  const trafo1 = new THREE.Mesh(trafoTankGeo, trafoTankMat);
  trafo1.position.set(-6, 1.5, -4);
  trafo1.castShadow = true;
  scene.add(trafo1);

  // Bushing insulators on top of transformer
  for (let i = -0.7; i <= 0.7; i += 0.7) {
    const insulatorGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 12);
    const insulatorMat = new THREE.MeshStandardMaterial({ color: "#00A2E9" });
    const insulator = new THREE.Mesh(insulatorGeo, insulatorMat);
    insulator.position.set(-6 + i, 2.9, -4);
    insulator.castShadow = true;
    scene.add(insulator);
  }

  // 5. Perimeter Fence Outline & Main Gate
  const fenceMat = new THREE.LineDashedMaterial({
    color: "#CBD5E1",
    dashSize: 0.5,
    gapSize: 0.2,
  });
  const fencePts = [
    new THREE.Vector3(-14, 0, -14),
    new THREE.Vector3(14, 0, -14),
    new THREE.Vector3(14, 0, 14),
    new THREE.Vector3(-14, 0, 14),
    new THREE.Vector3(-14, 0, -14),
  ];
  const fenceGeo = new THREE.BufferGeometry().setFromPoints(fencePts);
  const fenceLine = new THREE.Line(fenceGeo, fenceMat);
  fenceLine.computeLineDistances();
  scene.add(fenceLine);

  // Guard Post (Pos Keamanan) near Main Gate
  const guardGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const guardMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF" });
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.set(-6, 1.1, 7);
  guard.castShadow = true;
  scene.add(guard);

  const guardEdges = new THREE.EdgesGeometry(guardGeo);
  const guardLines = new THREE.LineSegments(guardEdges, bldgLineMat);
  guardLines.position.copy(guard.position);
  scene.add(guardLines);
}

function buildAuditoriumEnvironment(parent: THREE.Group | THREE.Scene) {
  // 1. Auditorium Floor (Carpet/Parquet)
  const floorGeo = new THREE.PlaneGeometry(28, 28);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#F1F5F9",
    roughness: 0.8,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  parent.add(floor);

  // Grid Lines
  const grid = new THREE.GridHelper(28, 28, "#CBD5E1", "#E2E8F0");
  grid.position.y = 0.01;
  parent.add(grid);

  // Line segment border material
  const lineMat = new THREE.LineBasicMaterial({ color: "#94A3B8" });

  // 2. Main Elevated Stage (Panggung Utama BOD & RUPS)
  const stageGeo = new THREE.BoxGeometry(16, 0.8, 8);
  const stageMat = new THREE.MeshStandardMaterial({
    color: "#003B5C", // PLN Navy Stage Trim
    roughness: 0.6,
    metalness: 0.2,
  });
  const stage = new THREE.Mesh(stageGeo, stageMat);
  stage.position.set(0, 0.4, -7);
  stage.castShadow = true;
  stage.receiveShadow = true;
  parent.add(stage);

  // Stage Top Surface (Lantai Panggung Kayu/Akustik)
  const stageTopGeo = new THREE.BoxGeometry(15.8, 0.05, 7.8);
  const stageTopMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.5,
  });
  const stageTop = new THREE.Mesh(stageTopGeo, stageTopMat);
  stageTop.position.set(0, 0.82, -7);
  stageTop.receiveShadow = true;
  parent.add(stageTop);

  // 3. Huge LED Video Wall Backdrop (Screen Panggung)
  const ledWallGeo = new THREE.BoxGeometry(12, 4.5, 0.3);
  const ledWallMat = new THREE.MeshStandardMaterial({
    color: "#0F172A",
    roughness: 0.2,
    metalness: 0.8,
  });
  const ledWall = new THREE.Mesh(ledWallGeo, ledWallMat);
  ledWall.position.set(0, 3.1, -10.5);
  ledWall.castShadow = true;
  parent.add(ledWall);

  // LED Screen Display Panel (Glow PLN Cyan Frame)
  const screenFaceGeo = new THREE.PlaneGeometry(11.6, 4.1);
  const screenFaceMat = new THREE.MeshBasicMaterial({
    color: "#003B5C",
  });
  const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
  screenFace.position.set(0, 3.1, -10.34);
  parent.add(screenFace);

  // Cyan & Electric Yellow Accent Lines on LED Wall
  const cyanBarGeo = new THREE.BoxGeometry(11.8, 0.1, 0.05);
  const cyanBarMat = new THREE.MeshBasicMaterial({ color: "#00A2E9" });
  const topBar = new THREE.Mesh(cyanBarGeo, cyanBarMat);
  topBar.position.set(0, 5.25, -10.33);
  parent.add(topBar);

  const bottomBar = new THREE.Mesh(cyanBarGeo, cyanBarMat);
  bottomBar.position.set(0, 0.95, -10.33);
  parent.add(bottomBar);

  // 4. Podiums / Mimbar Direksi di Panggung
  const podiumGeo = new THREE.BoxGeometry(1.2, 1.2, 0.8);
  const podiumMat = new THREE.MeshStandardMaterial({
    color: "#00A2E9",
    roughness: 0.3,
    metalness: 0.4,
  });
  const podium = new THREE.Mesh(podiumGeo, podiumMat);
  podium.position.set(0, 1.4, -6.5);
  podium.castShadow = true;
  parent.add(podium);

  // 5. VIP Round Tables & Chairs (Area Audiens Depan)
  const tablePositions = [
    [-4, -2],
    [0, -2],
    [4, -2],
    [-2, 1],
    [2, 1],
  ];

  tablePositions.forEach(([tx, tz]) => {
    // Round table disc
    const tableGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 24);
    const tableMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.6 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(tx, 0.7, tz);
    table.castShadow = true;
    table.receiveShadow = true;
    parent.add(table);

    // Table leg
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: "#64748B" });
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(tx, 0.35, tz);
    parent.add(leg);

    // Small centerpiece marker
    const centerGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12);
    const centerMat = new THREE.MeshBasicMaterial({ color: "#FFD100" });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.set(tx, 0.8, tz);
    parent.add(center);
  });

  // 6. Audience Seating Tier (Area Audiens Belakang)
  const rows = [
    { z: 3.5, width: 14 },
    { z: 5.5, width: 16 },
  ];
  rows.forEach((row, rIdx) => {
    const seatRowGeo = new THREE.BoxGeometry(row.width, 0.4, 0.8);
    const seatRowMat = new THREE.MeshStandardMaterial({
      color: "#E2E8F0",
      roughness: 0.7,
    });
    const seatRow = new THREE.Mesh(seatRowGeo, seatRowMat);
    seatRow.position.set(0, 0.2 + rIdx * 0.2, row.z);
    seatRow.castShadow = true;
    seatRow.receiveShadow = true;
    parent.add(seatRow);
  });

  // 7. Master Control Booth & Audio Desk (Mezzanine Belakang)
  const boothGeo = new THREE.BoxGeometry(4.5, 2.5, 2.5);
  const boothMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.7,
  });
  const booth = new THREE.Mesh(boothGeo, boothMat);
  booth.position.set(4.5, 1.25, 4.5);
  booth.castShadow = true;
  booth.receiveShadow = true;
  parent.add(booth);

  const boothEdges = new THREE.EdgesGeometry(boothGeo);
  const boothLines = new THREE.LineSegments(boothEdges, lineMat);
  boothLines.position.copy(booth.position);
  parent.add(boothLines);

  // Booth Glass Window / Desk Line
  const glassGeo = new THREE.BoxGeometry(4.1, 0.8, 0.1);
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#00A2E9",
    transparent: true,
    opacity: 0.6,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(4.5, 1.8, 3.2);
  parent.add(glass);

  // 8. Overhead Lighting Truss Rails (Rig Panggung & Auditorium)
  const trussMat = new THREE.LineBasicMaterial({ color: "#64748B" });
  for (const zPos of [-6, -2, 2]) {
    const trussPts = [
      new THREE.Vector3(-10, 4.5, zPos),
      new THREE.Vector3(10, 4.5, zPos),
    ];
    const trussGeo = new THREE.BufferGeometry().setFromPoints(trussPts);
    const trussLine = new THREE.Line(trussGeo, trussMat);
    parent.add(trussLine);
  }
}

function createCCTVMarker(cctv: CCTVUnit, isSelected: boolean): THREE.Group {
  const group = new THREE.Group();
  const [x, y, z] = cctv.position3D;
  const [tx, ty, tz] = cctv.target3D;

  group.position.set(x, y, z);

  // Status Color determination
  let statusHex = "#00A2E9"; // Cyan PLN
  if (cctv.status === "warning") statusHex = "#FFD100"; // Yellow
  if (cctv.status === "offline") statusHex = "#ED1C24"; // Red

  // 1. Camera Mount Bracket Pole
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: "#475569" });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0, -0.3, 0);
  group.add(pole);

  // 2. Camera Head Body (White Capsule)
  const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.3,
    metalness: 0.3,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  group.add(head);

  // 3. Status Ring Glow
  const ringGeo = new THREE.TorusGeometry(0.26, 0.04, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: statusHex });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // 4. Direction Cone / Vision Frustum
  const dir = new THREE.Vector3(tx - x, ty - y, tz - z);
  const dist = Math.min(dir.length(), 6.5);
  const coneGeo = new THREE.ConeGeometry(dist * 0.45, dist, 16, 1, true);
  coneGeo.translate(0, -dist / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);

  const coneMat = new THREE.MeshBasicMaterial({
    color: statusHex,
    transparent: true,
    opacity: isSelected ? 0.35 : 0.12,
    wireframe: false,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.lookAt(dir);
  group.add(cone);

  // 5. Selected Pulse Halo Highlight
  if (isSelected) {
    const pulseGeo = new THREE.RingGeometry(0.35, 0.55, 32);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: "#00A2E9",
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = Math.PI / 2;
    pulse.position.y = 0.02;
    group.add(pulse);

    // Floating Target Beacon
    const beaconGeo = new THREE.OctahedronGeometry(0.18, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: "#FFD100" });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.6, 0);
    group.add(beacon);
  }

  return group;
}
