"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CCTVUnit, FacilityLocationId, FACILITY_LOCATIONS } from "@/types/cctv";
import {
  Compass,
  Eye,
  Activity,
  AlertTriangle,
  WifiOff,
  MousePointerClick,
  Lock,
  Unlock,
  ChevronDown,
  Check,
  Crosshair,
  Camera,
  Keyboard,
  X,
  RotateCcw,
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

  // Camera POV mode and View Preset state
  const [isPOVMode, setIsPOVMode] = useState(false);
  const isPOVModeRef = useRef(false);

  useEffect(() => {
    isPOVModeRef.current = isPOVMode;
  }, [isPOVMode]);

  const [viewMode, setViewMode] = useState<"iso" | "front" | "side" | "top" | "pov" | "custom">("iso");
  const [showBlenderHelp, setShowBlenderHelp] = useState(false);

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

    // 4. Orbit Controls with Blender Behavior
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true; // Essential: allows panning vertically in screen space like Blender!
    controls.minDistance = 0.2;          // Allows extreme close-up inspection of cameras, brackets, downlights
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI - 0.02; // Full vertical freedom to look up under ceiling, soffits & trusses
    controls.minPolarAngle = 0.01;           // Can look straight down from top
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.2;
    controls.rotateSpeed = 0.8;

    // Blender mouse button mapping:
    // Left: Rotate (Orbit) - Shift+Left: Pan
    // Middle: Rotate (Orbit) - Shift+Middle: Pan (Pure Blender MMB!)
    // Right: Pan (Quick right drag pan)
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };

    // Auto cancel camera fly-to and smoothly exit POV on manual orbit drag
    controls.addEventListener("start", () => {
      animTarget.current.isAnimating = false;
      if (isPOVModeRef.current) {
        setIsPOVMode(false);
        setViewMode("custom");
        if (cameraRef.current) {
          cameraRef.current.fov = 45;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });

    controls.target.set(0, selectedLocationId === "auditorium-pln" ? 1.2 : 1, 0);
    controls.enabled = isActivatedRef.current;
    controlsRef.current = controls;

    // Prevent browser context menu on right click so RMB Pan is seamless
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

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
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
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

    if (isPOVModeRef.current) {
      // In POV mode, animate camera directly to CCTV position looking at target
      const [tx, ty, tz] = selectedUnit.target3D;
      animTarget.current = {
        camPos: new THREE.Vector3(x, y, z),
        targetPos: new THREE.Vector3(tx, ty, tz),
        isAnimating: true,
      };
      cameraRef.current.fov = selectedUnit.fovAngle || 50;
      cameraRef.current.updateProjectionMatrix();
    } else {
      const targetPos = new THREE.Vector3(x, y, z);
      // Frame camera ~2.5m away facing the unit for close inspection
      const camOffset = new THREE.Vector3(
        x >= 0 ? -2.2 : 2.2,
        -0.3,
        z < -5 ? 2.8 : -2.8
      );
      const camPos = targetPos.clone().add(camOffset);

      animTarget.current = {
        camPos,
        targetPos,
        isAnimating: true,
      };
    }
  }, [selectedCCTVId, cctvList]);

  // Controls Handlers with Blender-like View Presets
  const handleResetCamera = useCallback(() => {
    setIsPOVMode(false);
    if (cameraRef.current) {
      cameraRef.current.fov = 45;
      cameraRef.current.updateProjectionMatrix();
    }
    setViewMode("iso");
    if (selectedLocationId === "auditorium-pln") {
      animTarget.current = {
        camPos: new THREE.Vector3(12, 14, 18),
        targetPos: new THREE.Vector3(0, 1.2, 0),
        isAnimating: true,
      };
    } else {
      animTarget.current = {
        camPos: new THREE.Vector3(14, 16, 20),
        targetPos: new THREE.Vector3(0, 1, 0),
        isAnimating: true,
      };
    }
  }, [selectedLocationId]);

  const handleViewFront = useCallback(() => {
    setIsPOVMode(false);
    if (cameraRef.current) {
      cameraRef.current.fov = 45;
      cameraRef.current.updateProjectionMatrix();
    }
    setViewMode("front");
    if (selectedLocationId === "auditorium-pln") {
      // Direct front view of the stage & videotron from audience center
      animTarget.current = {
        camPos: new THREE.Vector3(0, 3.8, 14.5),
        targetPos: new THREE.Vector3(0, 3.2, -8.0),
        isAnimating: true,
      };
    } else {
      animTarget.current = {
        camPos: new THREE.Vector3(0, 7.0, 18.0),
        targetPos: new THREE.Vector3(0, 1.5, 0),
        isAnimating: true,
      };
    }
  }, [selectedLocationId]);

  const handleViewSide = useCallback(() => {
    setIsPOVMode(false);
    if (cameraRef.current) {
      cameraRef.current.fov = 45;
      cameraRef.current.updateProjectionMatrix();
    }
    setViewMode("side");
    if (selectedLocationId === "auditorium-pln") {
      // Right side elevation looking across hall & balconies
      animTarget.current = {
        camPos: new THREE.Vector3(16.5, 4.2, -2.0),
        targetPos: new THREE.Vector3(0, 3.0, -2.0),
        isAnimating: true,
      };
    } else {
      animTarget.current = {
        camPos: new THREE.Vector3(18.0, 6.0, 0),
        targetPos: new THREE.Vector3(0, 1.5, 0),
        isAnimating: true,
      };
    }
  }, [selectedLocationId]);

  const handleViewTop = useCallback(() => {
    setIsPOVMode(false);
    if (cameraRef.current) {
      cameraRef.current.fov = 45;
      cameraRef.current.updateProjectionMatrix();
    }
    setViewMode("top");
    animTarget.current = {
      camPos: new THREE.Vector3(0, 26, 0.001),
      targetPos: new THREE.Vector3(0, 0, 0),
      isAnimating: true,
    };
  }, []);

  const handleFocusSelected = useCallback(() => {
    setIsPOVMode(false);
    if (cameraRef.current) {
      cameraRef.current.fov = 45;
      cameraRef.current.updateProjectionMatrix();
    }
    setViewMode("custom");

    const unit = cctvList.find((c) => c.id === selectedCCTVId);
    if (unit) {
      const [x, y, z] = unit.position3D;
      const targetPos = new THREE.Vector3(x, y, z);
      // Frame camera ~2.5m away facing the unit for close inspection
      const offset = new THREE.Vector3(
        x >= 0 ? -2.2 : 2.2,
        -0.3,
        z < -5 ? 2.8 : -2.8
      );
      const camPos = targetPos.clone().add(offset);
      animTarget.current = {
        camPos,
        targetPos,
        isAnimating: true,
      };
    } else {
      animTarget.current = {
        camPos: new THREE.Vector3(10, 12, 14),
        targetPos: new THREE.Vector3(0, 2.0, 0),
        isAnimating: true,
      };
    }
  }, [selectedCCTVId, cctvList]);

  const handleTogglePOV = useCallback(() => {
    if (isPOVMode) {
      // Exit POV mode
      setIsPOVMode(false);
      setViewMode("iso");
      if (cameraRef.current) {
        cameraRef.current.fov = 45;
        cameraRef.current.updateProjectionMatrix();
      }
      handleFocusSelected();
    } else {
      // Enter POV mode
      let unit = cctvList.find((c) => c.id === selectedCCTVId);
      if (!unit && cctvList.length > 0) {
        unit = cctvList[0];
        onSelectCCTV(unit.id);
      }
      if (unit && cameraRef.current && controlsRef.current) {
        setIsPOVMode(true);
        setViewMode("pov");
        const [x, y, z] = unit.position3D;
        const [tx, ty, tz] = unit.target3D;
        animTarget.current = {
          camPos: new THREE.Vector3(x, y, z),
          targetPos: new THREE.Vector3(tx, ty, tz),
          isAnimating: true,
        };
        cameraRef.current.fov = unit.fovAngle || 50;
        cameraRef.current.updateProjectionMatrix();
      }
    }
  }, [isPOVMode, selectedCCTVId, cctvList, onSelectCCTV, handleFocusSelected]);

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

  // Click outside to lock map
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

    window.addEventListener("pointerdown", handlePointerDownOutside);
    return () => window.removeEventListener("pointerdown", handlePointerDownOutside);
  }, [isActivated]);

  // Keyboard listener for Blender shortcuts & Nudge Pan
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept when user is typing in forms/inputs
      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }

      if (!isActivatedRef.current) return;

      const code = event.code;
      const key = event.key.toLowerCase();

      // Blender Numpad & number keys:
      if (code === "Numpad1" || key === "1") {
        event.preventDefault();
        handleViewFront();
      } else if (code === "Numpad3" || key === "3") {
        event.preventDefault();
        handleViewSide();
      } else if (code === "Numpad7" || key === "7") {
        event.preventDefault();
        handleViewTop();
      } else if (code === "Numpad0" || key === "0") {
        event.preventDefault();
        handleTogglePOV();
      } else if (code === "NumpadDecimal" || key === "." || key === "f") {
        event.preventDefault();
        handleFocusSelected();
      } else if (code === "Numpad5" || key === "5" || key === "home") {
        event.preventDefault();
        handleResetCamera();
      } else if (event.key === "Escape") {
        if (isPOVModeRef.current) {
          event.preventDefault();
          handleTogglePOV();
        } else {
          setIsActivated(false);
        }
      } else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(code)
      ) {
        // Nudge pan with WASD or Arrow Keys (Blender walk/nudge navigation)
        if (controlsRef.current && cameraRef.current) {
          event.preventDefault();
          animTarget.current.isAnimating = false;
          const panStep = event.shiftKey ? 1.0 : 0.35;
          const forward = new THREE.Vector3();
          cameraRef.current.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();
          const right = new THREE.Vector3()
            .crossVectors(cameraRef.current.up, forward)
            .normalize()
            .negate();

          const move = new THREE.Vector3();
          if (code === "ArrowLeft" || code === "KeyA") move.addScaledVector(right, -panStep);
          if (code === "ArrowRight" || code === "KeyD") move.addScaledVector(right, panStep);
          if (code === "ArrowUp" || code === "KeyW") move.addScaledVector(forward, panStep);
          if (code === "ArrowDown" || code === "KeyS") move.addScaledVector(forward, -panStep);

          cameraRef.current.position.add(move);
          controlsRef.current.target.add(move);
          controlsRef.current.update();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleViewFront,
    handleViewSide,
    handleViewTop,
    handleTogglePOV,
    handleFocusSelected,
    handleResetCamera,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full min-w-0 h-[400px] lg:h-[460px] rounded-xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs flex flex-col"
    >
      {/* 3D Top Floating Toolbar */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Facility Badge & Status Filter */}
        <div
          className={cn(
            "relative flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs pointer-events-auto transition-all",
            isLocationMenuOpen ? "z-50" : "z-20"
          )}
        >
          {/* Location Dropdown Trigger & Options Popover */}
          <div className="relative pr-3 border-r border-zinc-200 z-50" ref={locationMenuRef}>
            <button
              type="button"
              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 -my-0.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer select-none group/loc"
              title="Ganti Lokasi Fasilitas Digital Twin"
            >
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
              <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
                      <div className="flex flex-col min-w-0">
                        <span className="truncate leading-tight font-medium text-zinc-900">
                          {loc.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                          {loc.subtitle}
                        </span>
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
        <div className="relative z-10 flex items-center gap-1.5 pointer-events-auto">
          {isActivated ? (
            <div className="flex items-center gap-1.5 bg-[#003B5C] text-white px-2.5 py-1 rounded-lg border border-sky-400/30 shadow-xs animate-in fade-in zoom-in-95 duration-150">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-sky-100 hidden sm:inline">
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

          {/* Blender View Presets (Front, Side, Top, ISO) */}
          <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-zinc-200/80 shadow-xs">
            <button
              type="button"
              onClick={handleViewFront}
              title="Tampak Depan (Blender Numpad 1)"
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                viewMode === "front"
                  ? "bg-zinc-900 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Depan (1)
            </button>
            <button
              type="button"
              onClick={handleViewSide}
              title="Tampak Samping (Blender Numpad 3)"
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                viewMode === "side"
                  ? "bg-zinc-900 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Samping (3)
            </button>
            <button
              type="button"
              onClick={handleViewTop}
              title="Tampak Atas / Denah (Blender Numpad 7)"
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                viewMode === "top"
                  ? "bg-zinc-900 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Atas (7)
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              title="Perspektif ISO 3D (Blender Numpad 5)"
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                viewMode === "iso"
                  ? "bg-zinc-900 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              ISO (5)
            </button>
          </div>

          {/* Action Tools: Focus (Frame Selected), POV (Camera View), Help */}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-zinc-200/80 shadow-xs">
            <button
              type="button"
              onClick={handleFocusSelected}
              title="Fokus Objek Terpilih (Blender Numpad . / F)"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <Crosshair className="size-3.5 text-[#00A2E9]" />
              <span className="hidden sm:inline">Fokus ( . )</span>
            </button>

            <button
              type="button"
              onClick={handleTogglePOV}
              title={
                isPOVMode
                  ? "Keluar dari POV Kamera (Numpad 0 / Esc)"
                  : "Sudut Pandang Lensa Kamera CCTV (Blender Numpad 0)"
              }
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                isPOVMode
                  ? "bg-[#00A2E9] text-white font-semibold shadow-xs"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Camera className="size-3.5" />
              <span className="hidden sm:inline">POV (0)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBlenderHelp(!showBlenderHelp)}
              title="Bantuan Navigasi Blender (Mouse & Shortcut)"
              className={cn(
                "p-1.5 rounded text-xs transition-colors cursor-pointer",
                showBlenderHelp
                  ? "bg-sky-100 text-[#00A2E9] font-bold"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              <Keyboard className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              title="Toggle Auto-Rotate"
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                autoRotate ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Compass className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset Sudut Pandang Kamera"
              className="p-1.5 rounded text-xs text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active POV Mode HUD Banner */}
      {isPOVMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-950/90 backdrop-blur-md border border-cyan-400/40 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-cyan-500"></span>
          </span>
          <span className="text-[11px] font-medium tracking-tight text-cyan-200">
            POV Lensa:{" "}
            <strong className="text-white font-semibold">
              {cctvList.find((c) => c.id === selectedCCTVId)?.name || "Kamera CCTV"}
            </strong>{" "}
            <span className="text-cyan-300 font-mono text-[10px]">
              ({cctvList.find((c) => c.id === selectedCCTVId)?.sn || ""})
            </span>
          </span>
          <button
            type="button"
            onClick={handleTogglePOV}
            className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[10px] font-semibold text-white transition-colors cursor-pointer"
          >
            Keluar POV (0 / Esc)
          </button>
        </div>
      )}

      {/* Blender Navigation Help Modal */}
      {showBlenderHelp && (
        <div className="absolute top-14 right-3 z-40 w-80 rounded-2xl border border-zinc-200 bg-white/98 backdrop-blur-md p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-auto text-zinc-900">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-sky-50 text-[#00A2E9] border border-sky-100">
                <Keyboard className="size-3.5" />
              </span>
              <span className="text-xs font-bold text-zinc-900">
                Navigasi Kamera Blender
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowBlenderHelp(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold shrink-0">
                MMB / Drag Kiri
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Putar (Orbit 3D)</strong>: Putar bebas ke seluruh sudut termasuk mendongak ke plafon & soffit.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold shrink-0">
                Shift + Drag / RMB
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Geser (Pan Layar)</strong>: Geser posisi kamera secara vertikal & horizontal.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold shrink-0">
                Scroll Wheel
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Zoom Dekat/Jauh</strong>: Perbesar hingga jarak 20cm untuk inspeksi detail bracket & lensa.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#00A2E9] font-mono text-[10px] font-semibold shrink-0">
                . / F
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Fokus Objek</strong>: Pusatkan orbit putar tepat pada unit CCTV yang sedang dipilih.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#00A2E9] font-mono text-[10px] font-semibold shrink-0">
                0 (Numpad 0)
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">POV Kamera</strong>: Masuk ke sudut pandang langsung lensa CCTV yang aktif.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold shrink-0">
                1 / 3 / 7 / 5
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Preset View</strong>: Tampak Depan (1), Samping (3), Atas (7), ISO (5).
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] font-semibold shrink-0">
                WASD / Panah
              </span>
              <span className="text-zinc-600">
                <strong className="text-zinc-800">Jalan / Nudge</strong>: Geser posisi kamera langkah demi langkah (Shift = lebih cepat).
              </span>
            </div>
          </div>
        </div>
      )}

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

        {/* Navigation Hint Pill when active */}
        {isActivated && (
          <div className="hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-200/80 shadow-xs text-[10px] text-zinc-500 pointer-events-auto">
            <span>🖱️ MMB: Putar</span>
            <span className="text-zinc-300">•</span>
            <span>Shift+Drag / RMB: Geser</span>
            <span className="text-zinc-300">•</span>
            <span>Scroll: Zoom</span>
            <span className="text-zinc-300">•</span>
            <span>WASD: Jalan</span>
            <span className="text-zinc-300">•</span>
            <button
              type="button"
              onClick={() => setShowBlenderHelp(true)}
              className="text-[#00A2E9] font-semibold hover:underline cursor-pointer"
            >
              Shortcut Blender (1/3/7/0/.)
            </button>
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
  // 1. FLOOR — Rich Teal Carpet matching real auditorium photos
  const floorGeo = new THREE.PlaneGeometry(28, 28);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#0F3F44", // Deep teal green auditorium carpet
    roughness: 0.9,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  parent.add(floor);

  // Subtle Carpet Perimeter Border & Aisle Grid
  const grid = new THREE.GridHelper(26, 26, "#164E53", "#0D3338");
  grid.position.y = 0.01;
  parent.add(grid);

  // Center Aisle Runner in Neutral Cream
  const aisleGeo = new THREE.PlaneGeometry(2.4, 18);
  const aisleMat = new THREE.MeshStandardMaterial({
    color: "#134E4A",
    roughness: 0.85,
  });
  const aisle = new THREE.Mesh(aisleGeo, aisleMat);
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.02, 1);
  aisle.receiveShadow = true;
  parent.add(aisle);

  // Line segment materials
  const goldLightMat = new THREE.MeshBasicMaterial({ color: "#FDE047" });
  const warmDownlightMat = new THREE.MeshBasicMaterial({ color: "#FEF08A" });
  const woodPanelMat = new THREE.MeshStandardMaterial({
    color: "#6B3212", // Warm polished teak wood
    roughness: 0.45,
    metalness: 0.15,
  });
  const tealAcousticMat = new THREE.MeshStandardMaterial({
    color: "#1D646B", // Sage / teal diamond quilted acoustic panel
    roughness: 0.8,
  });
  const whiteBalconyMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC", // Sculpted smooth white balcony pod
    roughness: 0.25,
    metalness: 0.05,
  });
  const darkRailingMat = new THREE.MeshStandardMaterial({
    color: "#334155",
    roughness: 0.3,
    metalness: 0.85,
  });

  // 2. MAIN ELEVATED STAGE (Panggung Utama BOD & RUPS)
  // Stage Tier 1 (Base Teak Fascia)
  const stageTier1Geo = new THREE.BoxGeometry(17, 0.45, 9);
  const stageTier1 = new THREE.Mesh(stageTier1Geo, woodPanelMat);
  stageTier1.position.set(0, 0.225, -7.5);
  stageTier1.castShadow = true;
  stageTier1.receiveShadow = true;
  parent.add(stageTier1);

  // Stage Tier 2 (Top Platform with Cream Birch/Maple Flooring)
  const stageTier2Geo = new THREE.BoxGeometry(16.4, 0.45, 8.4);
  const stageTopMat = new THREE.MeshStandardMaterial({
    color: "#F5F5F4", // Light cream stage surface
    roughness: 0.4,
  });
  const stageTier2 = new THREE.Mesh(stageTier2Geo, stageTopMat);
  stageTier2.position.set(0, 0.675, -7.5);
  stageTier2.receiveShadow = true;
  parent.add(stageTier2);

  // Front Stage Access Steps
  const stepsGeo = new THREE.BoxGeometry(16, 0.225, 0.8);
  const steps = new THREE.Mesh(stepsGeo, woodPanelMat);
  steps.position.set(0, 0.11, -2.8);
  steps.receiveShadow = true;
  parent.add(steps);

  // 3. GIANT CURVED PANORAMIC LED VIDEOTRON (Sesuai Foto 1 & Frame 00)
  // Videotron Backing Structure
  const ledBackGeo = new THREE.BoxGeometry(15, 4.8, 0.4);
  const ledBackMat = new THREE.MeshStandardMaterial({
    color: "#0B0F19",
    roughness: 0.3,
    metalness: 0.8,
  });
  const ledBack = new THREE.Mesh(ledBackGeo, ledBackMat);
  ledBack.position.set(0, 3.3, -11.0);
  ledBack.castShadow = true;
  parent.add(ledBack);

  // Front Active Screen Panel ("PLN SustainAction 2026" Cyan Electric Display)
  const screenFaceGeo = new THREE.PlaneGeometry(14.4, 4.2);
  const screenFaceMat = new THREE.MeshBasicMaterial({
    color: "#00A2E9", // Vibrant PLN Cyan glow
  });
  const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
  screenFace.position.set(0, 3.3, -10.79);
  parent.add(screenFace);

  // Inner Cyan Graphic Header Line
  const cyanHeaderGeo = new THREE.BoxGeometry(14.5, 0.12, 0.05);
  const cyanHeaderMat = new THREE.MeshBasicMaterial({ color: "#38BDF8" });
  const cyanHeader = new THREE.Mesh(cyanHeaderGeo, cyanHeaderMat);
  cyanHeader.position.set(0, 5.35, -10.78);
  parent.add(cyanHeader);

  // Digital Clock ("12 35") & Green EXIT Sign centered beneath screen (as in Photo 1)
  const clockGeo = new THREE.BoxGeometry(0.9, 0.35, 0.1);
  const clockMat = new THREE.MeshBasicMaterial({ color: "#ED1C24" }); // Red LED digital clock
  const clock = new THREE.Mesh(clockGeo, clockMat);
  clock.position.set(0, 0.98, -10.75);
  parent.add(clock);

  const exitSignGeo = new THREE.BoxGeometry(0.6, 0.2, 0.05);
  const exitSignMat = new THREE.MeshBasicMaterial({ color: "#10B981" }); // Green EXIT
  const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
  exitSign.position.set(0, 1.25, -10.75);
  parent.add(exitSign);

  // 4 Top Downlights shining on the stage & videotron
  for (const dlX of [-4.5, -1.5, 1.5, 4.5]) {
    const dlGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
    const dl = new THREE.Mesh(dlGeo, warmDownlightMat);
    dl.position.set(dlX, 5.65, -10.7);
    parent.add(dl);
  }

  // Indonesian National Flags (Merah Putih) flanking stage left & right
  for (const flagX of [-7.6, 7.6]) {
    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: "#E2E8F0", metalness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(flagX, 2.5, -9.8);
    parent.add(pole);

    // Red flag top
    const redGeo = new THREE.BoxGeometry(0.02, 0.5, 0.8);
    const redMat = new THREE.MeshStandardMaterial({ color: "#ED1C24" });
    const redFlag = new THREE.Mesh(redGeo, redMat);
    redFlag.position.set(flagX + 0.4, 3.8, -9.8);
    parent.add(redFlag);

    // White flag bottom
    const whiteGeo = new THREE.BoxGeometry(0.02, 0.5, 0.8);
    const whiteMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF" });
    const whiteFlag = new THREE.Mesh(whiteGeo, whiteMat);
    whiteFlag.position.set(flagX + 0.4, 3.3, -9.8);
    parent.add(whiteFlag);
  }

  // 4 White Executive VIP Armchairs / Sofas on Stage (Frame 00)
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const chairX = -3.0 + sIdx * 2.0;
    const sofaGeo = new THREE.BoxGeometry(0.9, 0.65, 0.8);
    const sofaMat = new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.35,
    });
    const sofa = new THREE.Mesh(sofaGeo, sofaMat);
    sofa.position.set(chairX, 1.25, -7.2);
    sofa.castShadow = true;
    parent.add(sofa);

    // Sofa backrest
    const backGeo = new THREE.BoxGeometry(0.9, 0.5, 0.2);
    const back = new THREE.Mesh(backGeo, sofaMat);
    back.position.set(chairX, 1.65, -7.5);
    parent.add(back);
  }

  // Mimbar / Podium Pidato BOD di sisi panggung
  const podiumGeo = new THREE.BoxGeometry(0.9, 1.1, 0.7);
  const podium = new THREE.Mesh(podiumGeo, woodPanelMat);
  podium.position.set(-5.5, 1.45, -5.8);
  podium.castShadow = true;
  parent.add(podium);

  // 4. SIDE WALLS WITH SCULPTED WHITE BALCONIES & QUILTED TEAL PANELS
  // (Sesuai Foto 2, 3 & Frame 11)
  const sideWallXList = [-11.4, 11.4];

  sideWallXList.forEach((wallX) => {
    const isLeft = wallX < 0;

    // A. Lower Wall Quilted Teal Acoustic Panels
    for (const zPanel of [-6, -1.5, 3, 7.5]) {
      const panelGeo = new THREE.BoxGeometry(0.15, 2.8, 3.6);
      const panel = new THREE.Mesh(panelGeo, tealAcousticMat);
      panel.position.set(wallX, 1.8, zPanel);
      parent.add(panel);

      // Gold sconce lamp on each acoustic panel bay
      const sconceGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
      const sconce = new THREE.Mesh(sconceGeo, goldLightMat);
      sconce.position.set(isLeft ? wallX + 0.15 : wallX - 0.15, 2.2, zPanel);
      parent.add(sconce);

      // Architectural Teak Wood Column / Pilaster
      const colGeo = new THREE.CylinderGeometry(0.22, 0.22, 3.6, 16);
      const col = new THREE.Mesh(colGeo, woodPanelMat);
      col.position.set(isLeft ? wallX + 0.18 : wallX - 0.18, 1.8, zPanel + 2.0);
      parent.add(col);
    }

    // B. Teak Wood Double Doors (Pintu Keluar Aula)
    const doorGeo = new THREE.BoxGeometry(0.2, 2.4, 1.8);
    const door = new THREE.Mesh(doorGeo, woodPanelMat);
    door.position.set(wallX, 1.2, 1.0);
    parent.add(door);

    // C. SCULPTED CURVED WHITE MEZZANINE BALCONIES (Balkon Melengkung Putih)
    // Sesuai Foto 2, 3 & Frame 11
    for (const zBalcony of [-3.5, 2.5, 8.0]) {
      // Main curved pod overhang
      const podGeo = new THREE.BoxGeometry(1.6, 1.1, 4.6);
      const pod = new THREE.Mesh(podGeo, whiteBalconyMat);
      pod.position.set(isLeft ? wallX + 0.8 : wallX - 0.8, 4.2, zBalcony);
      pod.castShadow = true;
      parent.add(pod);

      // Underside Soffit with warm downlights
      const soffitGeo = new THREE.BoxGeometry(1.5, 0.08, 4.4);
      const soffit = new THREE.Mesh(soffitGeo, woodPanelMat);
      soffit.position.set(isLeft ? wallX + 0.8 : wallX - 0.8, 3.62, zBalcony);
      parent.add(soffit);

      // Downlights under the balcony soffit
      for (const dlOffset of [-1.5, 0, 1.5]) {
        const blDownlightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
        const blDownlight = new THREE.Mesh(blDownlightGeo, warmDownlightMat);
        blDownlight.position.set(isLeft ? wallX + 0.8 : wallX - 0.8, 3.58, zBalcony + dlOffset);
        parent.add(blDownlight);
      }

      // Dark Balcony Railing on top
      const railGeo = new THREE.BoxGeometry(0.06, 0.6, 4.5);
      const rail = new THREE.Mesh(railGeo, darkRailingMat);
      rail.position.set(isLeft ? wallX + 1.55 : wallX - 1.55, 5.05, zBalcony);
      parent.add(rail);
    }

    // D. Upper Wood Grid Wainscoting Panel above balcony
    const upperWoodGeo = new THREE.BoxGeometry(0.1, 2.2, 24);
    const upperWood = new THREE.Mesh(upperWoodGeo, woodPanelMat);
    upperWood.position.set(wallX, 6.4, 0);
    parent.add(upperWood);
  });

  // 5. VAULTED SLOPED TIMBER CEILING RAFTERS (Atap Balok Kayu Sloped)
  const ceilingRafterMat = new THREE.MeshStandardMaterial({
    color: "#3B1B0B", // Dark exposed timber rafters
    roughness: 0.6,
  });

  for (const zRafter of [-9, -5, -1, 3, 7, 11]) {
    // Left sloped rafter beam
    const leftRafterPts = [
      new THREE.Vector3(-11.4, 6.8, zRafter),
      new THREE.Vector3(0, 8.2, zRafter),
    ];
    const leftRafterGeo = new THREE.BufferGeometry().setFromPoints(leftRafterPts);
    const leftRafterLine = new THREE.Line(leftRafterGeo, new THREE.LineBasicMaterial({ color: "#5F2C10", linewidth: 3 }));
    parent.add(leftRafterLine);

    // Right sloped rafter beam
    const rightRafterPts = [
      new THREE.Vector3(11.4, 6.8, zRafter),
      new THREE.Vector3(0, 8.2, zRafter),
    ];
    const rightRafterGeo = new THREE.BufferGeometry().setFromPoints(rightRafterPts);
    const rightRafterLine = new THREE.Line(rightRafterGeo, new THREE.LineBasicMaterial({ color: "#5F2C10", linewidth: 3 }));
    parent.add(rightRafterLine);

    // Timber tie beam
    const tieGeo = new THREE.BoxGeometry(22, 0.18, 0.18);
    const tieBeam = new THREE.Mesh(tieGeo, ceilingRafterMat);
    tieBeam.position.set(0, 7.0, zRafter);
    parent.add(tieBeam);
  }

  // 6. PROFESSIONAL ALUMINUM STAGE LIGHTING TRUSS RIG (Frame 00)
  const trussAluminumMat = new THREE.MeshStandardMaterial({
    color: "#94A3B8",
    roughness: 0.35,
    metalness: 0.8,
  });

  // Main Cross-Stage Box Truss (Suspended at y = 5.8)
  for (const zTruss of [-5.5, -2.0]) {
    const trussMainGeo = new THREE.BoxGeometry(16, 0.35, 0.35);
    const trussMain = new THREE.Mesh(trussMainGeo, trussAluminumMat);
    trussMain.position.set(0, 5.8, zTruss);
    parent.add(trussMain);

    // Suspended moving head spotlights
    for (const spotX of [-5.5, -3.0, 0, 3.0, 5.5]) {
      // Spot fixture housing
      const spotGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.32, 12);
      const spotMat = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.2 });
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(spotX, 5.5, zTruss);
      parent.add(spot);
    }
  }

  // 7. PA AUDIO SPEAKERS ON BLACK TRIPODS (Sesuai Foto 2 & 3)
  for (const spkX of [-8.5, 8.5]) {
    const spkStandGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
    const spkStandMat = new THREE.MeshStandardMaterial({ color: "#0F172A" });
    const stand = new THREE.Mesh(spkStandGeo, spkStandMat);
    stand.position.set(spkX, 0.9, -4.5);
    parent.add(stand);

    const spkBoxGeo = new THREE.BoxGeometry(0.42, 0.75, 0.38);
    const spkBox = new THREE.Mesh(spkBoxGeo, spkStandMat);
    spkBox.position.set(spkX, 2.0, -4.5);
    parent.add(spkBox);
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

  // Direction vector towards target
  const dir = new THREE.Vector3(tx - x, ty - y, tz - z);

  // Create an oriented assembly for the industrial bullet camera & mounting bracket
  const cameraAssembly = new THREE.Group();

  // 1. Materials with industrial PBR properties
  const bodyMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.35,
    metalness: 0.12,
  });

  const hoodMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC",
    roughness: 0.3,
    metalness: 0.08,
  });

  const bracketMat = new THREE.MeshStandardMaterial({
    color: "#E2E8F0",
    roughness: 0.45,
    metalness: 0.25,
  });

  const boltMat = new THREE.MeshStandardMaterial({
    color: "#94A3B8",
    roughness: 0.2,
    metalness: 0.85,
  });

  const bezelMat = new THREE.MeshStandardMaterial({
    color: "#0F172A", // Deep charcoal dark bezel
    roughness: 0.55,
    metalness: 0.2,
  });

  const barrelMat = new THREE.MeshStandardMaterial({
    color: "#1E293B",
    roughness: 0.25,
    metalness: 0.7,
  });

  const glassLensMat = new THREE.MeshStandardMaterial({
    color: "#020617",
    roughness: 0.05,
    metalness: 0.95,
  });

  const cableMat = new THREE.MeshStandardMaterial({
    color: "#18181B",
    roughness: 0.85,
    metalness: 0.05,
  });

  const statusLedMat = new THREE.MeshBasicMaterial({ color: statusHex });

  // 2. WALL MOUNTING BRACKET (Plat Dinding + Lengan Cantilever + 4 Baut)
  // Base Plate (Plat persegi panjang di dudukan belakang)
  const basePlateGeo = new THREE.BoxGeometry(0.32, 0.44, 0.04);
  const basePlate = new THREE.Mesh(basePlateGeo, bracketMat);
  basePlate.position.set(0, 0, -0.42);
  cameraAssembly.add(basePlate);

  // 4 Corner Screws / Bolts
  const boltPositions: [number, number][] = [
    [-0.11, 0.16],
    [0.11, 0.16],
    [-0.11, -0.16],
    [0.11, -0.16],
  ];
  const boltGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.025, 8);
  boltGeo.rotateX(Math.PI / 2);
  boltPositions.forEach(([bx, by]) => {
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(bx, by, -0.395);
    cameraAssembly.add(bolt);
  });

  // Cantilever Arm (Lengan horizontal memanjang ke depan)
  const armGeo = new THREE.BoxGeometry(0.08, 0.06, 0.36);
  const arm = new THREE.Mesh(armGeo, bracketMat);
  arm.position.set(0, -0.06, -0.24);
  cameraAssembly.add(arm);

  // Triangular Gusset Brace (Web penyangga miring di bawah lengan seperti di foto referensi)
  const gussetGeo = new THREE.BoxGeometry(0.04, 0.20, 0.24);
  const gusset = new THREE.Mesh(gussetGeo, bracketMat);
  gusset.position.set(0, -0.14, -0.30);
  gusset.rotation.x = -Math.PI / 6; // ~30 deg slant
  cameraAssembly.add(gusset);

  // Pivot Swivel Joint Knuckle (Engsel silinder vertikal penyambung bodi kamera)
  const knuckleGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.10, 16);
  const knuckle = new THREE.Mesh(knuckleGeo, bracketMat);
  knuckle.position.set(0, -0.04, -0.06);
  cameraAssembly.add(knuckle);

  // 3. CAMERA MAIN BODY (Bodi Kamera Utama)
  // Main Housing Box
  const bodyGeo = new THREE.BoxGeometry(0.30, 0.26, 0.60);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.09, 0.02);
  body.castShadow = true;
  cameraAssembly.add(body);

  // Bottom Mounting Hinge Lug (Penyambung bawah bodi ke knuckle)
  const lugGeo = new THREE.BoxGeometry(0.10, 0.06, 0.14);
  const lug = new THREE.Mesh(lugGeo, bracketMat);
  lug.position.set(0, -0.05, -0.06);
  cameraAssembly.add(lug);

  // Rear Housing Cap
  const rearCapGeo = new THREE.BoxGeometry(0.28, 0.24, 0.04);
  const rearCap = new THREE.Mesh(rearCapGeo, bracketMat);
  rearCap.position.set(0, 0.09, -0.29);
  cameraAssembly.add(rearCap);

  // 4. SUNSHIELD / VISOR HOOD (Tudung Pelindung Matahari & Hujan)
  // Main Top Roof Plate
  const hoodRoofGeo = new THREE.BoxGeometry(0.34, 0.025, 0.74);
  const hoodRoof = new THREE.Mesh(hoodRoofGeo, hoodMat);
  hoodRoof.position.set(0, 0.235, 0.05);
  cameraAssembly.add(hoodRoof);

  // Top Center Ridgeline Spine (Punggung tengah bodi atas seperti wireframe foto 3)
  const hoodRidgeGeo = new THREE.BoxGeometry(0.22, 0.02, 0.70);
  const hoodRidge = new THREE.Mesh(hoodRidgeGeo, hoodMat);
  hoodRidge.position.set(0, 0.255, 0.05);
  cameraAssembly.add(hoodRidge);

  // Angled Front Visor Snout (Tudung depan yang menjorok miring ke bawah menaungi lensa)
  const visorSnoutGeo = new THREE.BoxGeometry(0.34, 0.025, 0.16);
  const visorSnout = new THREE.Mesh(visorSnoutGeo, hoodMat);
  visorSnout.position.set(0, 0.195, 0.44);
  visorSnout.rotation.x = Math.PI / 6; // 30 deg downward tilt
  cameraAssembly.add(visorSnout);

  // Left & Right Hood Side Skirts (Bibir samping pelindung)
  const skirtGeo = new THREE.BoxGeometry(0.02, 0.14, 0.70);
  const leftSkirt = new THREE.Mesh(skirtGeo, hoodMat);
  leftSkirt.position.set(-0.16, 0.165, 0.05);
  cameraAssembly.add(leftSkirt);

  const rightSkirt = new THREE.Mesh(skirtGeo, hoodMat);
  rightSkirt.position.set(0.16, 0.165, 0.05);
  cameraAssembly.add(rightSkirt);

  // 5. FRONT FACEPLATE & OPTICAL LENS ASSEMBLY
  // Dark Front Faceplate (Bezel hitam persegi)
  const bezelGeo = new THREE.BoxGeometry(0.28, 0.24, 0.03);
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.set(0, 0.09, 0.325);
  cameraAssembly.add(bezel);

  // Outer Aluminum Lens Barrel (Lingkaran luar laras lensa)
  const barrelGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.035, 32);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.09, 0.345);
  cameraAssembly.add(barrel);

  // Stepped Inner Aperture Ring (Cincin aperture bertingkat seperti di foto 2)
  const stepRingGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.04, 32);
  stepRingGeo.rotateX(Math.PI / 2);
  const stepRing = new THREE.Mesh(stepRingGeo, bezelMat);
  stepRing.position.set(0, 0.09, 0.355);
  cameraAssembly.add(stepRing);

  // Glass Lens Optic (Kaca lensa hitam mengkilap)
  const lensGeo = new THREE.CylinderGeometry(0.060, 0.060, 0.042, 32);
  lensGeo.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, glassLensMat);
  lens.position.set(0, 0.09, 0.362);
  cameraAssembly.add(lens);

  // Lens Core Pupil Reflection (Pantulan optik biru/cyan)
  const pupilGeo = new THREE.SphereGeometry(0.030, 16, 16);
  const pupilMat = new THREE.MeshBasicMaterial({
    color: statusHex,
    transparent: true,
    opacity: 0.75,
  });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.set(0, 0.09, 0.370);
  cameraAssembly.add(pupil);

  // Front Status LED Indicator (Lampu LED indikator di sudut kanan atas bezel)
  const ledGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12);
  ledGeo.rotateX(Math.PI / 2);
  const led = new THREE.Mesh(ledGeo, statusLedMat);
  led.position.set(0.09, 0.16, 0.345);
  cameraAssembly.add(led);

  // 6. FLEXIBLE CABLING (Dua kabel melengkung fleksibel dari bodi ke plat dinding)
  // Cable 1: Upper Loop (melengkung dari belakang bodi ke plat dinding)
  const upperCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.04, -0.28),
    new THREE.Vector3(0.12, 0.12, -0.34),
    new THREE.Vector3(0.08, -0.04, -0.40),
    new THREE.Vector3(0.05, -0.10, -0.41),
  ]);
  const upperCableGeo = new THREE.TubeGeometry(upperCableCurve, 20, 0.02, 8, false);
  const upperCable = new THREE.Mesh(upperCableGeo, cableMat);
  cameraAssembly.add(upperCable);

  // Cable 2: Lower Loop (melengkung dari bawah bodi ke plat dinding)
  const lowerCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, -0.04, -0.22),
    new THREE.Vector3(-0.11, -0.16, -0.30),
    new THREE.Vector3(-0.08, -0.20, -0.38),
    new THREE.Vector3(-0.04, -0.14, -0.41),
  ]);
  const lowerCableGeo = new THREE.TubeGeometry(lowerCableCurve, 20, 0.02, 8, false);
  const lowerCable = new THREE.Mesh(lowerCableGeo, cableMat);
  cameraAssembly.add(lowerCable);

  // 7. INVISIBLE CLICK HITBOX (Memudahkan klik dan pemilihan kamera dari jarak jauh)
  const hitGeo = new THREE.BoxGeometry(0.8, 0.8, 1.0);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBox = new THREE.Mesh(hitGeo, hitMat);
  hitBox.position.set(0, 0.09, 0.05);
  cameraAssembly.add(hitBox);

  // 8. ORIENT CAMERA ASSEMBLY TOWARDS TARGET
  // The camera front face (+Z) points directly at the target direction
  cameraAssembly.lookAt(dir);
  cameraAssembly.scale.set(1.4, 1.4, 1.4);
  group.add(cameraAssembly);

  // 9. STATUS & SELECTION HIGHLIGHTS
  // Glowing Status Torus Ring under the camera
  const statusRingGeo = new THREE.TorusGeometry(0.38, 0.03, 8, 32);
  const statusRingMat = new THREE.MeshBasicMaterial({ color: statusHex });
  const statusRing = new THREE.Mesh(statusRingGeo, statusRingMat);
  statusRing.rotation.x = Math.PI / 2;
  statusRing.position.y = -0.35;
  group.add(statusRing);

  // Selected State: Concentric Pulse Rings & Overhead Diamond Beacon
  if (isSelected) {
    const pulseGeo = new THREE.RingGeometry(0.45, 0.68, 32);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: "#00A2E9",
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = Math.PI / 2;
    pulse.position.y = -0.34;
    group.add(pulse);

    // Floating Target Beacon above the camera
    const beaconGeo = new THREE.OctahedronGeometry(0.20, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: "#FFD100" });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.75, 0);
    group.add(beacon);
  }

  return group;
}
