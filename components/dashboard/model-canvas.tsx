"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function InteractiveGeometry({
  wireframe,
  speed,
  color,
  shape,
}: {
  wireframe: boolean;
  speed: number;
  color: string;
  shape: "sphere" | "torus" | "box";
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.35;
      meshRef.current.rotation.y += delta * speed * 0.55;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
      <mesh ref={meshRef}>
        {shape === "sphere" && <sphereGeometry args={[1.5, 64, 64]} />}
        {shape === "torus" && <torusKnotGeometry args={[1.2, 0.38, 128, 32]} />}
        {shape === "box" && <boxGeometry args={[2, 2, 2]} />}

        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={shape === "sphere" ? 0.35 : 0.12}
          speed={1.8}
          wireframe={wireframe}
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>
    </Float>
  );
}

interface ModelCanvasProps {
  wireframe: boolean;
  rotationSpeed: number;
  modelColor: string;
  modelShape: "sphere" | "torus" | "box";
}

export default function ModelCanvas({
  wireframe,
  rotationSpeed,
  modelColor,
  modelShape,
}: ModelCanvasProps) {
  return (
    <div className="relative w-full h-[450px] lg:h-[560px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#001D2E] via-[#003B5C]/80 to-[#0B1522] border border-[#00A2E9]/30 shadow-2xl shadow-[#003B5C]/40">
      {/* PLN Telemetry Status Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#003B5C]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#00A2E9]/40 text-xs text-[#F4F7FA]">
        <span className="inline-block w-2 h-2 rounded-full bg-[#00A2E9] animate-pulse shadow-sm shadow-[#00A2E9]" />
        <span className="font-medium tracking-wide">PLN WebGL Engine &bull; Three.js Studio</span>
      </div>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.8} color="#F4F7FA" />
        <pointLight position={[-10, -10, -5]} color="#00A2E9" intensity={2.5} />
        <pointLight position={[0, 10, 0]} color="#FFD100" intensity={0.8} />

        <InteractiveGeometry
          wireframe={wireframe}
          speed={rotationSpeed}
          color={modelColor}
          shape={modelShape}
        />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}
