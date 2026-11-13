"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { CCTVUnit, FacilityLocationId, FACILITY_LOCATIONS } from "@/types/cctv";
import {
  Activity,
  AlertTriangle,
  WifiOff,
  ChevronDown,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CCTV3DLocatorProps {
  cctvList: CCTVUnit[];
  selectedCCTVId: string | null;
  onSelectCCTV: (id: string) => void;
  selectedLocationId?: FacilityLocationId;
  onSelectLocation?: (locationId: FacilityLocationId) => void;
}

// -----------------------------------------------------------------------------
// 3D Plain Character (Karakter Polos) with Procedural Walking Gait
// -----------------------------------------------------------------------------
function createPlainCharacter(): {
  group: THREE.Group;
  updateAnimation: (isMoving: boolean, speedMultiplier: number, delta: number) => void;
} {
  const group = new THREE.Group();

  // Materials: Plain, clean, sleek stylized matte mannequin
  const bodyMat = new THREE.MeshStandardMaterial({
    color: "#E2E8F0", // Slate 200 light clean neutral grey
    roughness: 0.35,
    metalness: 0.15,
  });

  const jointMat = new THREE.MeshStandardMaterial({
    color: "#64748B", // Slate 500 for joints and waist
    roughness: 0.55,
    metalness: 0.2,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: "#00A2E9", // PLN Cyan visor accent
    roughness: 0.15,
    metalness: 0.6,
    emissive: "#003B5C",
    emissiveIntensity: 0.4,
  });

  // Pelvis / Hips
  const pelvisGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.16, 16);
  const pelvis = new THREE.Mesh(pelvisGeo, jointMat);
  pelvis.position.y = 0.94;
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  group.add(pelvis);

  // Torso Group (Chest + Neck + Head + Arms)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.02;
  group.add(torsoGroup);

  // Chest
  const chestGeo = new THREE.BoxGeometry(0.38, 0.42, 0.22);
  const chest = new THREE.Mesh(chestGeo, bodyMat);
  chest.position.y = 0.22;
  chest.castShadow = true;
  chest.receiveShadow = true;
  torsoGroup.add(chest);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.08, 12);
  const neck = new THREE.Mesh(neckGeo, jointMat);
  neck.position.y = 0.47;
  torsoGroup.add(neck);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.62;
  torsoGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.14, 20, 20);
  headGeo.scale(1.0, 1.15, 1.05);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.castShadow = true;
  headGroup.add(head);

  // Stylized Sleek Visor
  const visorGeo = new THREE.BoxGeometry(0.20, 0.07, 0.12);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.02, 0.10);
  headGroup.add(visor);

  // Left Arm (Shoulder Pivot)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.25, 0.38, 0);
  torsoGroup.add(leftArmPivot);

  const shoulderGeo = new THREE.SphereGeometry(0.065, 12, 12);
  const leftShoulder = new THREE.Mesh(shoulderGeo, jointMat);
  leftArmPivot.add(leftShoulder);

  const upperArmGeo = new THREE.CylinderGeometry(0.052, 0.046, 0.30, 12);
  const leftUpperArm = new THREE.Mesh(upperArmGeo, bodyMat);
  leftUpperArm.position.y = -0.17;
  leftUpperArm.castShadow = true;
  leftArmPivot.add(leftUpperArm);

  const elbowGeo = new THREE.SphereGeometry(0.046, 12, 12);
  const leftElbow = new THREE.Mesh(elbowGeo, jointMat);
  leftElbow.position.y = -0.32;
  leftArmPivot.add(leftElbow);

  const forearmGeo = new THREE.CylinderGeometry(0.046, 0.040, 0.28, 12);
  const leftForearm = new THREE.Mesh(forearmGeo, bodyMat);
  leftForearm.position.y = -0.47;
  leftForearm.castShadow = true;
  leftArmPivot.add(leftForearm);

  const handGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
  const leftHand = new THREE.Mesh(handGeo, jointMat);
  leftHand.position.y = -0.63;
  leftArmPivot.add(leftHand);

  // Right Arm (Shoulder Pivot)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.25, 0.38, 0);
  torsoGroup.add(rightArmPivot);

  const rightShoulder = new THREE.Mesh(shoulderGeo, jointMat);
  rightArmPivot.add(rightShoulder);

  const rightUpperArm = new THREE.Mesh(upperArmGeo, bodyMat);
  rightUpperArm.position.y = -0.17;
  rightUpperArm.castShadow = true;
  rightArmPivot.add(rightUpperArm);

  const rightElbow = new THREE.Mesh(elbowGeo, jointMat);
  rightElbow.position.y = -0.32;
  rightArmPivot.add(rightElbow);

  const rightForearm = new THREE.Mesh(forearmGeo, bodyMat);
  rightForearm.position.y = -0.47;
  rightForearm.castShadow = true;
  rightArmPivot.add(rightForearm);

  const rightHand = new THREE.Mesh(handGeo, jointMat);
  rightHand.position.y = -0.63;
  rightArmPivot.add(rightHand);

  // Left Leg (Hip Pivot)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.11, 0.90, 0);
  group.add(leftLegPivot);

  const hipJointGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const leftHipJoint = new THREE.Mesh(hipJointGeo, jointMat);
  leftLegPivot.add(leftHipJoint);

  const thighGeo = new THREE.CylinderGeometry(0.070, 0.058, 0.40, 12);
  const leftThigh = new THREE.Mesh(thighGeo, bodyMat);
  leftThigh.position.y = -0.22;
  leftThigh.castShadow = true;
  leftLegPivot.add(leftThigh);

  const kneeGeo = new THREE.SphereGeometry(0.058, 12, 12);
  const leftKnee = new THREE.Mesh(kneeGeo, jointMat);
  leftKnee.position.y = -0.43;
  leftLegPivot.add(leftKnee);

  const calfGeo = new THREE.CylinderGeometry(0.058, 0.048, 0.40, 12);
  const leftCalf = new THREE.Mesh(calfGeo, bodyMat);
  leftCalf.position.y = -0.64;
  leftCalf.castShadow = true;
  leftLegPivot.add(leftCalf);

  const footGeo = new THREE.BoxGeometry(0.10, 0.07, 0.20);
  const leftFoot = new THREE.Mesh(footGeo, jointMat);
  leftFoot.position.set(0, -0.86, 0.04);
  leftFoot.castShadow = true;
  leftLegPivot.add(leftFoot);

  // Right Leg (Hip Pivot)
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.11, 0.90, 0);
  group.add(rightLegPivot);

  const rightHipJoint = new THREE.Mesh(hipJointGeo, jointMat);
  rightLegPivot.add(rightHipJoint);

  const rightThigh = new THREE.Mesh(thighGeo, bodyMat);
  rightThigh.position.y = -0.22;
  rightThigh.castShadow = true;
  rightLegPivot.add(rightThigh);

  const rightKnee = new THREE.Mesh(kneeGeo, jointMat);
  rightKnee.position.y = -0.43;
  rightLegPivot.add(rightKnee);

  const rightCalf = new THREE.Mesh(calfGeo, bodyMat);
  rightCalf.position.y = -0.64;
  rightCalf.castShadow = true;
  rightLegPivot.add(rightCalf);

  const rightFoot = new THREE.Mesh(footGeo, jointMat);
  rightFoot.position.set(0, -0.86, 0.04);
  rightFoot.castShadow = true;
  rightLegPivot.add(rightFoot);

  // Soft Contact Shadow Disc on ground
  const shadowGeo = new THREE.CircleGeometry(0.42, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: "#000000",
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  let walkCycle = 0;

  const updateAnimation = (
    isMoving: boolean,
    speedMultiplier: number,
    delta: number
  ) => {
    if (isMoving) {
      walkCycle += delta * 8.5 * speedMultiplier;
      const legSwing = Math.sin(walkCycle) * 0.65;
      const armSwing = Math.sin(walkCycle) * 0.55;

      leftLegPivot.rotation.x = legSwing;
      rightLegPivot.rotation.x = -legSwing;

      leftArmPivot.rotation.x = -armSwing;
      rightArmPivot.rotation.x = armSwing;

      // Vertical bounce & subtle sway
      torsoGroup.position.y = 1.02 + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
      torsoGroup.rotation.y = Math.sin(walkCycle) * 0.08;
      headGroup.rotation.y = -Math.sin(walkCycle) * 0.05;
    } else {
      walkCycle += delta * 2.0;
      // Smooth damp back to idle stance
      leftLegPivot.rotation.x = THREE.MathUtils.lerp(
        leftLegPivot.rotation.x,
        0,
        0.15
      );
      rightLegPivot.rotation.x = THREE.MathUtils.lerp(
        rightLegPivot.rotation.x,
        0,
        0.15
      );
      leftArmPivot.rotation.x = THREE.MathUtils.lerp(
        leftArmPivot.rotation.x,
        0,
        0.15
      );
      rightArmPivot.rotation.x = THREE.MathUtils.lerp(
        rightArmPivot.rotation.x,
        0,
        0.15
      );

      torsoGroup.position.y = 1.02 + Math.sin(walkCycle) * 0.012;
      torsoGroup.rotation.y = THREE.MathUtils.lerp(
        torsoGroup.rotation.y,
        0,
        0.15
      );
      headGroup.rotation.y = THREE.MathUtils.lerp(
        headGroup.rotation.y,
        0,
        0.15
      );
    }
  };

  return { group, updateAnimation };
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const environmentGroupRef = useRef<THREE.Group | null>(null);
  const markerMeshesMap = useRef<Map<string, THREE.Object3D>>(new Map());

  // 3D Character Controller State & Refs
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const characterAnimRef = useRef<
    | ((isMoving: boolean, speedMultiplier: number, delta: number) => void)
    | null
  >(null);
  const characterPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(0, 0, 7.5)
  );
  const yawRef = useRef<number>(0); // 0 = looking forward (-Z towards stage)
  const pitchRef = useRef<number>(0.20); // slightly looking down at character
  const camDistRef = useRef<number>(3.4); // third-person distance
  const activeKeysRef = useRef<Set<string>>(new Set());
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedDistRef = useRef<number>(0);
  const nearbyCCTVRef = useRef<string | null>(null);

  // Fullscreen, First-Person Eye POV & Mobile Touch Joystick State/Refs
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wasNativeFullscreenRef = useRef<boolean>(false);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const isFirstPersonRef = useRef<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickPointerIdRef = useRef<number | null>(null);

  // Location Dropdown State
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const currentLocation =
    FACILITY_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    FACILITY_LOCATIONS[0];

  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "warning" | "offline"
  >("all");
  const [nearbyCCTV, setNearbyCCTV] = useState<CCTVUnit | null>(null);

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

  // Sync First-Person Eye POV mode seamlessly without rebuilding Three.js scene
  useEffect(() => {
    isFirstPersonRef.current = isFirstPerson;
    if (characterGroupRef.current) {
      characterGroupRef.current.visible = !isFirstPerson;
    }
    if (isFirstPerson) {
      pitchRef.current = 0;
    } else {
      pitchRef.current = Math.max(-0.35, Math.min(1.15, pitchRef.current));
    }
    const cam = cameraRef.current;
    if (cam) {
      cam.fov = isFirstPerson ? 62 : 45;
      cam.updateProjectionMatrix();
    }
  }, [isFirstPerson]);

  // Detect mobile / touch device only (never render virtual joystick on desktop)
  useEffect(() => {
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const noHoverQuery = window.matchMedia("(hover: none)");

    const updateMobileStatus = () => {
      const hasTouch =
        navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      const isCoarseNoHover = coarseQuery.matches && noHoverQuery.matches;
      const isCompactTouch = hasTouch && window.innerWidth < 1024;
      setIsMobileDevice(isCoarseNoHover || isCompactTouch);
    };

    updateMobileStatus();
    coarseQuery.addEventListener?.("change", updateMobileStatus);
    noHoverQuery.addEventListener?.("change", updateMobileStatus);
    window.addEventListener("resize", updateMobileStatus);

    return () => {
      coarseQuery.removeEventListener?.("change", updateMobileStatus);
      noHoverQuery.removeEventListener?.("change", updateMobileStatus);
      window.removeEventListener("resize", updateMobileStatus);
    };
  }, []);

  // Sync Fullscreen state with Browser Fullscreen API & Esc / Scroll Lock
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl = document.fullscreenElement;
      if (activeEl === containerRef.current) {
        wasNativeFullscreenRef.current = true;
        setIsFullscreen(true);
      } else if (wasNativeFullscreenRef.current) {
        wasNativeFullscreenRef.current = false;
        setIsFullscreen(false);
      }
    };

    const handleEscExit = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleEscExit);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleEscExit);
    };
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    }

    const rafId = requestAnimationFrame(() => {
      const container = mountRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Initialize Three.js Scene with 3D Character Controller
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#FAFAFA");
    sceneRef.current = scene;

    scene.fog = new THREE.FogExp2("#FAFAFA", 0.018);

    // 2. Camera (Third-Person View)
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Prevent context menu on right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight("#FFFFFF", 1.25);
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

    const fillLight = new THREE.DirectionalLight("#00A2E9", 0.4);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // 5. Build Architectural Facility Model
    const envGroup = new THREE.Group();
    scene.add(envGroup);
    environmentGroupRef.current = envGroup;
    if (selectedLocationId === "auditorium-pln") {
      buildAuditoriumEnvironment(envGroup);
    } else {
      buildSubstationEnvironment(envGroup);
    }

    // 6. Group for CCTV Markers
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // 7. 3D Plain Character Instance
    const character = createPlainCharacter();
    scene.add(character.group);
    characterGroupRef.current = character.group;
    characterAnimRef.current = character.updateAnimation;

    // Initial character position
    if (selectedLocationId === "auditorium-pln") {
      characterPosRef.current.set(0, 0, 7.5);
      yawRef.current = 0; // Look forward towards stage
    } else {
      characterPosRef.current.set(0, 0, 6.0);
      yawRef.current = 0;
    }
    character.group.position.copy(characterPosRef.current);

    // 8. Raycasting for Clicking Markers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (dragMovedDistRef.current > 6) return;
      if (document.pointerLockElement === renderer.domElement) {
        mouse.x = 0;
        mouse.y = 0;
      } else {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }

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

    // 9. Camera Look Events (Desktop Pointer Lock + Click-Drag / Mobile Touch Drag & Pinch)
    const domEl = renderer.domElement;
    domEl.style.touchAction = "none";
    const activeTouchPointers = new Map<number, { x: number; y: number }>();
    let prevPinchDist: number | null = null;

    const getPinchDist = () => {
      const pts = Array.from(activeTouchPointers.values());
      if (pts.length < 2) return null;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const onPointerDown = (e: PointerEvent) => {
      dragMovedDistRef.current = 0;

      if (e.pointerType === "mouse") {
        if (document.pointerLockElement !== domEl) {
          domEl.requestPointerLock?.();
        }
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Touch / Pen drag to rotate view on mobile devices
      domEl.setPointerCapture?.(e.pointerId);
      activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      prevPinchDist = getPinchDist();
    };

    const onPointerMove = (e: PointerEvent) => {
      const minPitch = isFirstPersonRef.current ? -1.1 : -0.35;
      const maxPitch = isFirstPersonRef.current ? 1.1 : 1.15;

      if (e.pointerType === "mouse") {
        const isLocked = document.pointerLockElement === domEl;
        if (isLocked) {
          const sens = 0.0026;
          yawRef.current -= e.movementX * sens;
          pitchRef.current = Math.max(
            minPitch,
            Math.min(maxPitch, pitchRef.current + e.movementY * sens)
          );
        } else if (isDraggingRef.current) {
          const sens = 0.0035;
          const dx = e.clientX - lastMousePosRef.current.x;
          const dy = e.clientY - lastMousePosRef.current.y;
          dragMovedDistRef.current += Math.hypot(dx, dy);
          lastMousePosRef.current = { x: e.clientX, y: e.clientY };

          yawRef.current -= dx * sens;
          pitchRef.current = Math.max(
            minPitch,
            Math.min(maxPitch, pitchRef.current + dy * sens)
          );
        }
        return;
      }

      if (!activeTouchPointers.has(e.pointerId)) return;
      const prev = activeTouchPointers.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      dragMovedDistRef.current += Math.hypot(dx, dy);
      activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activeTouchPointers.size === 1) {
        const touchSens = 0.0048;
        yawRef.current -= dx * touchSens;
        pitchRef.current = Math.max(
          minPitch,
          Math.min(maxPitch, pitchRef.current + dy * touchSens)
        );
      } else if (activeTouchPointers.size === 2 && !isFirstPersonRef.current) {
        const nextPinch = getPinchDist();
        if (nextPinch !== null && prevPinchDist !== null) {
          const deltaPinch = nextPinch - prevPinchDist;
          camDistRef.current = Math.max(
            1.2,
            Math.min(7.5, camDistRef.current - deltaPinch * 0.012)
          );
        }
        prevPinchDist = nextPinch;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        isDraggingRef.current = false;
        return;
      }
      activeTouchPointers.delete(e.pointerId);
      prevPinchDist = getPinchDist();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isFirstPersonRef.current) return;
      camDistRef.current = Math.max(
        1.2,
        Math.min(7.5, camDistRef.current + e.deltaY * 0.003)
      );
    };

    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });

    // 10. Keyboard Controls for Movement (WASD + Shift + R Reset + V Eye POV)
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      activeKeysRef.current.add(e.code);

      // Quick reset position with Key R
      if (e.code === "KeyR") {
        e.preventDefault();
        const startZ = selectedLocationId === "auditorium-pln" ? 7.5 : 6.0;
        characterPosRef.current.set(0, 0, startZ);
        yawRef.current = 0;
        pitchRef.current = isFirstPersonRef.current ? 0 : 0.20;
      }

      // Quick toggle Eye POV with Key V
      if (e.code === "KeyV" && !e.repeat) {
        e.preventDefault();
        setIsFirstPerson((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // 12. Animation Loop with Character Movement & Third/First-Person Camera Follow
    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrameId: number;
    let lastProximityCheck = 0;

    const animate = (timestamp?: number) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.1);

      const charPos = characterPosRef.current;
      const keys = activeKeysRef.current;
      const yaw = yawRef.current;
      const isShift = keys.has("ShiftLeft") || keys.has("ShiftRight");

      // Compute horizontal forward & right vectors based on camera yaw
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

      const moveDir = new THREE.Vector3(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp")) moveDir.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) moveDir.sub(forward);
      if (keys.has("KeyD") || keys.has("ArrowRight")) moveDir.add(right);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) moveDir.sub(right);

      const hasKeyInput = moveDir.lengthSq() > 0.001;
      const joy = joystickVecRef.current;
      const joyMag = Math.hypot(joy.x, joy.y);
      const hasJoyInput = joyMag > 0.08;

      if (hasJoyInput) {
        moveDir.addScaledVector(forward, joy.y);
        moveDir.addScaledVector(right, joy.x);
      }

      const isMoving = moveDir.lengthSq() > 0.001;

      if (isMoving) {
        moveDir.normalize();
        const clampedJoy = Math.min(1, joyMag);
        const speed = hasKeyInput
          ? isShift
            ? 6.2
            : 3.2
          : (clampedJoy > 0.85 ? 5.6 : 3.4) * clampedJoy;
        const animSpeed = hasKeyInput
          ? isShift
            ? 1.6
            : 1.0
          : clampedJoy > 0.85
            ? 1.45
            : Math.max(0.65, clampedJoy);

        charPos.x += moveDir.x * speed * delta;
        charPos.z += moveDir.z * speed * delta;

        // Smooth character body rotation towards movement direction
        if (characterGroupRef.current) {
          const targetAngle = Math.atan2(moveDir.x, moveDir.z);
          let diff = targetAngle - characterGroupRef.current.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          characterGroupRef.current.rotation.y += diff * 0.25;
        }

        characterAnimRef.current?.(true, animSpeed, delta);
      } else {
        characterAnimRef.current?.(false, 1.0, delta);
      }

      // Room boundary clamping (Auditorium walls)
      if (selectedLocationId === "auditorium-pln") {
        charPos.x = Math.max(-11.2, Math.min(11.2, charPos.x));
        charPos.z = Math.max(-9.5, Math.min(13.5, charPos.z));

        // Smooth stage elevation
        const onStage = charPos.z < -3.2 && Math.abs(charPos.x) < 6.5;
        const targetGroundY = onStage ? 0.675 : 0.0;
        charPos.y = THREE.MathUtils.lerp(charPos.y, targetGroundY, 0.2);
      } else {
        charPos.x = Math.max(-15, Math.min(15, charPos.x));
        charPos.z = Math.max(-15, Math.min(15, charPos.z));
        charPos.y = 0;
      }

      // Update character mesh position & visibility
      if (characterGroupRef.current) {
        characterGroupRef.current.position.copy(charPos);
        characterGroupRef.current.visible = !isFirstPersonRef.current;
      }

      // Camera Positioning: First-Person (Eye POV) vs Third-Person Follow
      const pitch = pitchRef.current;
      if (isFirstPersonRef.current) {
        const eyePos = new THREE.Vector3(charPos.x, charPos.y + 1.66, charPos.z);
        const lookPitch = -pitch;
        const lookDir = new THREE.Vector3(
          -Math.sin(yaw) * Math.cos(lookPitch),
          Math.sin(lookPitch),
          -Math.cos(yaw) * Math.cos(lookPitch)
        );
        camera.position.lerp(eyePos, 0.45);
        camera.lookAt(
          eyePos.x + lookDir.x * 10,
          eyePos.y + lookDir.y * 10,
          eyePos.z + lookDir.z * 10
        );
      } else {
        const camDist = camDistRef.current;
        const lookTarget = new THREE.Vector3(
          charPos.x,
          charPos.y + 1.45,
          charPos.z
        );

        const horizDist = camDist * Math.cos(pitch);
        const vertDist = camDist * Math.sin(pitch);
        const idealCamPos = new THREE.Vector3(
          charPos.x + Math.sin(yaw) * horizDist,
          charPos.y + 1.45 + vertDist,
          charPos.z + Math.cos(yaw) * horizDist
        );

        camera.position.lerp(idealCamPos, 0.22);
        camera.lookAt(lookTarget);
      }

      // Periodic proximity check to CCTV cameras (every ~250ms)
      const now = performance.now();
      if (now - lastProximityCheck > 250) {
        lastProximityCheck = now;
        let closest: CCTVUnit | null = null;
        let minDist = 4.5;
        for (const c of cctvList) {
          const [cx, cy, cz] = c.position3D;
          const dist = charPos.distanceTo(new THREE.Vector3(cx, cy, cz));
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        }
        if (closest?.id !== nearbyCCTVRef.current) {
          nearbyCCTVRef.current = closest ? closest.id : null;
          setNearbyCCTV(closest);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      timer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectCCTV, selectedLocationId, cctvList]);

  // Dynamic Rebuilding of 3D Facility Environment on Location Change
  useEffect(() => {
    const envGroup = environmentGroupRef.current;
    if (!envGroup) return;

    while (envGroup.children.length > 0) {
      const child = envGroup.children[0];
      envGroup.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    if (selectedLocationId === "auditorium-pln") {
      buildAuditoriumEnvironment(envGroup);
      characterPosRef.current.set(0, 0, 7.5);
      yawRef.current = 0;
    } else {
      buildSubstationEnvironment(envGroup);
      characterPosRef.current.set(0, 0, 6.0);
      yawRef.current = 0;
    }
  }, [selectedLocationId]);

  // Update CCTV Markers when list or selection changes
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    while (markersGroup.children.length > 0) {
      const child = markersGroup.children[0];
      markersGroup.remove(child);
    }
    markerMeshesMap.current.clear();

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

  // Character repositions near camera when selected in table
  useEffect(() => {
    if (!selectedCCTVId) return;
    const unit = cctvList.find((c) => c.id === selectedCCTVId);
    if (!unit) return;

    const [cx, cy, cz] = unit.position3D;
    const standZ = cz < -4 ? -3.5 : Math.min(12, cz + 2.5);
    const standX = Math.max(-10, Math.min(10, cx * 0.75));
    const standY = cz < -4 ? 0.675 : 0;
    characterPosRef.current.set(standX, standY, standZ);

    yawRef.current = Math.atan2(standX - cx, standZ - cz);
    if (isFirstPersonRef.current) {
      const horizDist = Math.hypot(cx - standX, cz - standZ);
      const dy = cy - (standY + 1.66);
      pitchRef.current = Math.max(-1.1, Math.min(1.1, -Math.atan2(dy, horizDist)));
    } else {
      pitchRef.current = 0.25;
    }
  }, [selectedCCTVId, cctvList]);

  const handleResetCharacter = useCallback(() => {
    const startZ = selectedLocationId === "auditorium-pln" ? 7.5 : 6.0;
    characterPosRef.current.set(0, 0, startZ);
    yawRef.current = 0;
    pitchRef.current = isFirstPersonRef.current ? 0 : 0.20;
    camDistRef.current = 3.4;
  }, [selectedLocationId]);

  const handleToggleFirstPerson = useCallback(() => {
    setIsFirstPerson((prev) => !prev);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      const el = containerRef.current;
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Fallback to fixed viewport fullscreen (e.g. iOS Safari)
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Mobile-only Virtual Joystick Pointer Handlers (supports simultaneous look drag)
  const updateJoystickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const base = joystickBaseRef.current;
      const knob = joystickKnobRef.current;
      if (!base || !knob) return;

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = 38;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      joystickVecRef.current = {
        x: dx / maxRadius,
        y: -dy / maxRadius,
      };
    },
    []
  );

  const resetJoystick = useCallback(() => {
    joystickPointerIdRef.current = null;
    joystickVecRef.current = { x: 0, y: 0 };
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = "translate3d(0px, 0px, 0)";
    }
    setIsJoystickActive(false);
  }, []);

  const handleJoystickPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      joystickPointerIdRef.current = e.pointerId;
      setIsJoystickActive(true);
      updateJoystickFromPointer(e.clientX, e.clientY);
    },
    [updateJoystickFromPointer]
  );

  const handleJoystickPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joystickPointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      updateJoystickFromPointer(e.clientX, e.clientY);
    },
    [updateJoystickFromPointer]
  );

  const handleJoystickPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joystickPointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      resetJoystick();
    },
    [resetJoystick]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-zinc-950 overflow-hidden select-none focus:outline-none",
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-dvh rounded-none border-0"
          : "relative w-full h-[620px] rounded-xl border border-zinc-200 shadow-sm"
      )}
      tabIndex={0}
    >
      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Bar */}
      <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Facility Location Selector & Status Filters */}
        <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Facility Location Selector */}
          <div className="relative" ref={locationMenuRef}>
            <button
              type="button"
              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
              className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs text-xs font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <span>{currentLocation.name}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-zinc-400 transition-transform duration-200",
                  isLocationMenuOpen && "rotate-180"
                )}
              />
            </button>

            {isLocationMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white/98 backdrop-blur-md rounded-xl border border-zinc-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-zinc-100">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Pilih Lokasi Fasilitas
                  </span>
                </div>
                {FACILITY_LOCATIONS.map((loc) => {
                  const isSelected = loc.id === selectedLocationId;
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

        {/* Right: 3D Character Controls & Reset Button */}
        <div className="relative z-10 flex items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-zinc-900 hidden sm:inline">
              Karakter 3D
            </span>
            {isMobileDevice ? (
              <>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="text-[11px] text-zinc-600 font-medium">
                  Joystick Jalan • Geser Layar Pandang
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="text-[11px] text-zinc-600 font-medium hidden md:inline">
                  <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px]">W</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] ml-0.5">A</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] ml-0.5">S</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] ml-0.5">D</kbd> Jalan
                </span>
                <span className="text-zinc-300 hidden md:inline">•</span>
                <span className="text-[11px] text-zinc-600 font-medium hidden md:inline">
                  <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px]">Shift</kbd> Lari
                </span>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="text-[11px] text-zinc-600 font-medium">
                  🖱️ Arah Pandang
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleFirstPerson}
            title={
              isFirstPerson
                ? "Kembali ke Pandangan Karakter Penuh (V)"
                : "Lihat Langsung dari Mata Karakter / First-Person POV (V)"
            }
            aria-pressed={isFirstPerson}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg backdrop-blur-md border shadow-xs text-xs font-medium transition-colors cursor-pointer",
              isFirstPerson
                ? "bg-[#00A2E9] border-[#00A2E9] text-white hover:bg-[#0090D1]"
                : "bg-white/95 border-zinc-200/80 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50"
            )}
          >
            <Eye
              className={cn(
                "size-3.5",
                isFirstPerson ? "text-white" : "text-[#00A2E9]"
              )}
            />
            <span className="text-[11px] hidden sm:inline">
              {isFirstPerson ? "POV Mata (V)" : "POV Mata (V)"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetCharacter}
            title="Reset Posisi Karakter ke Tengah Ruangan (R)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-xs text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5 text-[#00A2E9]" />
            <span className="text-[11px] hidden sm:inline">Reset (R)</span>
          </button>
        </div>
      </div>

      {/* Center Eye POV Reticle */}
      {isFirstPerson && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="size-2 rounded-full bg-[#00A2E9]/90 ring-2 ring-white/90 shadow-xs" />
        </div>
      )}

      {/* Mobile-Only Virtual Joystick (Left Thumb Movement) */}
      {isMobileDevice && (
        <div
          ref={joystickBaseRef}
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerEnd}
          onPointerCancel={handleJoystickPointerEnd}
          aria-label="Joystick navigasi karakter 3D"
          className={cn(
            "absolute bottom-16 left-4 z-20 size-28 rounded-full bg-white/85 backdrop-blur-md border-2 shadow-lg flex items-center justify-center touch-none select-none pointer-events-auto transition-colors",
            isJoystickActive ? "border-[#00A2E9]" : "border-zinc-200/90"
          )}
        >
          {/* Directional crosshair markers */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 size-1 rounded-full bg-zinc-400/70 pointer-events-none" />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 size-1 rounded-full bg-zinc-400/70 pointer-events-none" />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 size-1 rounded-full bg-zinc-400/70 pointer-events-none" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 size-1 rounded-full bg-zinc-400/70 pointer-events-none" />

          {/* Movable thumb stick */}
          <div
            ref={joystickKnobRef}
            className={cn(
              "size-11 rounded-full bg-gradient-to-br from-[#00A2E9] to-[#003B5C] shadow-md border-2 border-white pointer-events-none",
              !isJoystickActive && "transition-transform duration-150 ease-out"
            )}
          />
        </div>
      )}

      {/* Bottom Floating Area: Maximize Button, Nearby CCTV Badge & Status Legend */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Maximize Fullscreen Button + Nearby CCTV Alert */}
        <div className="flex items-center gap-2 min-w-0 pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Layar Penuh 3D"}
            aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh 3D"}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-xs text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4 text-[#00A2E9]" />
            ) : (
              <Maximize2 className="size-4 text-[#00A2E9]" />
            )}
            <span className="text-[11px] hidden sm:inline">
              {isFullscreen ? "Keluar" : "Layar Penuh"}
            </span>
          </button>

          {nearbyCCTV && (
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-sky-300/80 shadow-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 truncate">
              <span className="size-2 rounded-full bg-[#00A2E9] animate-pulse shrink-0" />
              <span className="text-xs text-zinc-500 hidden sm:inline">Kamera Terdekat:</span>
              <span className="text-xs font-semibold text-zinc-900 truncate">
                {nearbyCCTV.name}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 hidden md:inline">
                ({nearbyCCTV.sn})
              </span>
            </div>
          )}
        </div>

        {/* Right: Status Legend */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-xs flex items-center gap-3 text-[11px] text-zinc-500 pointer-events-auto shrink-0">
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
    color: "#85441E", // Rich warm teak wood paneling (sesuai foto referensi nyata)
    roughness: 0.40,
    metalness: 0.12,
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



  // 4. ARCHITECTURAL TEAK WOOD WALL CLADDING & BALCONIES (Sesuai Referensi Foto Nyata)
  const sideWallXList = [-11.4, 11.4];

  sideWallXList.forEach((wallX) => {
    const isLeft = wallX < 0;

    // A. SOLID CONTINUOUS LOWER WOOD WALL (Dinding Kayu Penuh Bawah)
    // Menutup seluruh dinding samping dari ujung panggung (z = -11.5) sampai pintu belakang (z = 13.5)
    // tanpa ada celah putih yang bocor.
    const lowerWoodWallGeo = new THREE.BoxGeometry(0.12, 3.65, 25.0);
    const lowerWoodWall = new THREE.Mesh(lowerWoodWallGeo, woodPanelMat);
    lowerWoodWall.position.set(wallX, 1.825, 1.0);
    lowerWoodWall.receiveShadow = true;
    parent.add(lowerWoodWall);

    // B. Architectural Wood Paneling Seams & Moldings (Grid Garis Profil Kayu)
    const friezeMoldingGeo = new THREE.BoxGeometry(0.16, 0.10, 25.0);
    const friezeMolding = new THREE.Mesh(friezeMoldingGeo, woodPanelMat);
    friezeMolding.position.set(wallX, 2.7, 1.0);
    parent.add(friezeMolding);

    const baseboardGeo = new THREE.BoxGeometry(0.16, 0.16, 25.0);
    const baseboard = new THREE.Mesh(baseboardGeo, woodPanelMat);
    baseboard.position.set(wallX, 0.08, 1.0);
    parent.add(baseboard);

    // C. Quilted Teal Acoustic Accent Panels (Tertanam di dalam Dinding Kayu)
    for (const zPanel of [-6, -1.5, 3, 7.5]) {
      // Panel akustik teal di atas dinding kayu
      const panelGeo = new THREE.BoxGeometry(0.08, 2.3, 3.5);
      const panel = new THREE.Mesh(panelGeo, tealAcousticMat);
      panel.position.set(isLeft ? wallX + 0.08 : wallX - 0.08, 1.45, zPanel);
      panel.castShadow = true;
      panel.receiveShadow = true;
      parent.add(panel);

      // Bingkai lis kayu di atas dan bawah panel teal
      const frameHorizGeo = new THREE.BoxGeometry(0.12, 0.08, 3.6);
      const frameTop = new THREE.Mesh(frameHorizGeo, woodPanelMat);
      frameTop.position.set(isLeft ? wallX + 0.08 : wallX - 0.08, 2.62, zPanel);
      parent.add(frameTop);

      const frameBot = new THREE.Mesh(frameHorizGeo, woodPanelMat);
      frameBot.position.set(isLeft ? wallX + 0.08 : wallX - 0.08, 0.28, zPanel);
      parent.add(frameBot);

      // Lampu sconce dinding emas di tengah panel
      const sconceGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
      const sconce = new THREE.Mesh(sconceGeo, goldLightMat);
      sconce.position.set(isLeft ? wallX + 0.15 : wallX - 0.15, 1.8, zPanel);
      parent.add(sconce);

      // Downlights plafon di area atas panel teal (menghilangkan area putih atas)
      // Sesuai deretan lampu downlight bundar di foto referensi nyata
      for (const dlZ of [-1.2, -0.6, 0, 0.6, 1.2]) {
        const friezeDownlightGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12);
        const friezeDownlight = new THREE.Mesh(friezeDownlightGeo, warmDownlightMat);
        friezeDownlight.position.set(isLeft ? wallX + 0.12 : wallX - 0.12, 3.58, zPanel + dlZ);
        parent.add(friezeDownlight);
      }

      // Kolom / Pilar Kayu Jati Arsitektural antara panel
      const colGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.65, 16);
      const col = new THREE.Mesh(colGeo, woodPanelMat);
      col.position.set(isLeft ? wallX + 0.22 : wallX - 0.22, 1.825, zPanel + 2.0);
      col.castShadow = true;
      parent.add(col);
    }

    // Pilar sudut tambahan di dekat panggung dan dekat pintu belakang
    for (const zEnd of [-9.5, 11.5]) {
      const endColGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.65, 16);
      const endCol = new THREE.Mesh(endColGeo, woodPanelMat);
      endCol.position.set(isLeft ? wallX + 0.22 : wallX - 0.22, 1.825, zEnd);
      endCol.castShadow = true;
      parent.add(endCol);
    }

    // D. Pintu Ganda Kayu Jati dengan Architrave Kayu Tebal
    const doorFrameGeo = new THREE.BoxGeometry(0.24, 2.6, 2.1);
    const doorFrame = new THREE.Mesh(doorFrameGeo, woodPanelMat);
    doorFrame.position.set(isLeft ? wallX + 0.05 : wallX - 0.05, 1.3, 1.0);
    parent.add(doorFrame);

    const doorGeo = new THREE.BoxGeometry(0.18, 2.4, 1.8);
    const door = new THREE.Mesh(doorGeo, woodPanelMat);
    door.position.set(isLeft ? wallX + 0.1 : wallX - 0.1, 1.2, 1.0);
    parent.add(door);

    // E. Soffit Balkon Menerus & Balkon Melengkung Putih
    const continuousSoffitGeo = new THREE.BoxGeometry(1.2, 0.08, 25.0);
    const continuousSoffit = new THREE.Mesh(continuousSoffitGeo, woodPanelMat);
    continuousSoffit.position.set(isLeft ? wallX + 0.6 : wallX - 0.6, 3.62, 1.0);
    continuousSoffit.receiveShadow = true;
    parent.add(continuousSoffit);

    for (const zBalcony of [-3.5, 2.5, 8.0]) {
      // Bodi balkon melengkung putih
      const podGeo = new THREE.BoxGeometry(1.6, 1.1, 4.6);
      const pod = new THREE.Mesh(podGeo, whiteBalconyMat);
      pod.position.set(isLeft ? wallX + 0.8 : wallX - 0.8, 4.2, zBalcony);
      pod.castShadow = true;
      parent.add(pod);

      // Downlight di bawah balkon
      for (const dlOffset of [-1.5, 0, 1.5]) {
        const blDownlightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
        const blDownlight = new THREE.Mesh(blDownlightGeo, warmDownlightMat);
        blDownlight.position.set(isLeft ? wallX + 0.8 : wallX - 0.8, 3.58, zBalcony + dlOffset);
        parent.add(blDownlight);
      }

      // Railing balkon gelap di atas
      const railGeo = new THREE.BoxGeometry(0.06, 0.6, 4.5);
      const rail = new THREE.Mesh(railGeo, darkRailingMat);
      rail.position.set(isLeft ? wallX + 1.55 : wallX - 1.55, 5.05, zBalcony);
      parent.add(rail);
    }

    // F. Dinding Panel Grid Kayu Bagian Atas di Atas Balkon
    const upperWoodGeo = new THREE.BoxGeometry(0.12, 2.5, 25.0);
    const upperWood = new THREE.Mesh(upperWoodGeo, woodPanelMat);
    upperWood.position.set(wallX, 6.2, 1.0);
    parent.add(upperWood);
  });

  // G. Dinding Penutup Kayu Depan (Panggung) dan Belakang (Pintu Masuk Hall)
  // Dinding depan samping videotron
  const frontWoodWallGeo = new THREE.BoxGeometry(23.0, 6.0, 0.15);
  const frontWoodWall = new THREE.Mesh(frontWoodWallGeo, woodPanelMat);
  frontWoodWall.position.set(0, 3.0, -11.4);
  frontWoodWall.receiveShadow = true;
  parent.add(frontWoodWall);

  // Tirai panggung beludru gelap di kiri dan kanan panggung (Sesuai Foto 1)
  const drapeMat = new THREE.MeshStandardMaterial({
    color: "#0F172A",
    roughness: 0.95,
  });
  const drapeLeftGeo = new THREE.BoxGeometry(3.6, 5.2, 0.2);
  const drapeLeft = new THREE.Mesh(drapeLeftGeo, drapeMat);
  drapeLeft.position.set(-9.4, 2.8, -11.2);
  parent.add(drapeLeft);

  const drapeRightGeo = new THREE.BoxGeometry(3.6, 5.2, 0.2);
  const drapeRight = new THREE.Mesh(drapeRightGeo, drapeMat);
  drapeRight.position.set(9.4, 2.8, -11.2);
  parent.add(drapeRight);

  // Dinding kayu belakang hall
  const rearWoodWallGeo = new THREE.BoxGeometry(23.0, 4.5, 0.15);
  const rearWoodWall = new THREE.Mesh(rearWoodWallGeo, woodPanelMat);
  rearWoodWall.position.set(0, 2.25, 13.4);
  rearWoodWall.receiveShadow = true;
  parent.add(rearWoodWall);

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
