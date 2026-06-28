import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { JoystickVector } from "./Joystick";

interface GameCanvasProps {
  onPositionUpdate: (x: number, z: number, angle: number) => void;
  onNearStation: (station: string | null) => void;
  triggerInteraction: string | null;
  onInteractionTriggered: (station: string) => void;
  joystickVector: JoystickVector;
  isRunningMobile: boolean;
}

export default function GameCanvas({
  onPositionUpdate,
  onNearStation,
  triggerInteraction,
  onInteractionTriggered,
  joystickVector,
  isRunningMobile,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    player: THREE.Group;
    playerVelocity: THREE.Vector3;
    playerHeading: number;
    cameraAngleYaw: number;
    cameraAnglePitch: number;
    keys: Record<string, boolean>;
    stations: Array<{ name: string; position: THREE.Vector3; radius: number }>;
    particleSystems: THREE.Points[];
    waveMeshes: THREE.Mesh[];
    skillsGroup: THREE.Group;
    clock: THREE.Clock;
    isDestroyed: boolean;
  } | null>(null);

  // Dynamic texture utility
  const createTextTexture = (
    text: string,
    bgColor: string,
    textColor: string,
    width = 128,
    height = 128
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw text with multi-line support
    ctx.fillStyle = textColor;
    const lines = text.split("\n");
    const fontSize = width * (lines.length > 1 ? 0.22 : 0.3);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    if (lines.length === 1) {
      ctx.fillText(text, width / 2, height / 2);
    } else {
      const lineHeight = fontSize * 1.15;
      const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * lineHeight);
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // Sci-Fi Hologram graphics generator (no words/letters)
  const createHoloTexture = (color: string, width = 512, height = 256) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0c1524";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    const gSize = 32;
    for (let x = 0; x < width; x += gSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    const cx = width / 3;
    const cy = height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 90);
    ctx.lineTo(cx, cy - 80);
    ctx.moveTo(cx, cy + 80);
    ctx.lineTo(cx, cy + 90);
    ctx.moveTo(cx - 90, cy);
    ctx.lineTo(cx - 80, cy);
    ctx.moveTo(cx + 80, cy);
    ctx.lineTo(cx + 90, cy);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(width * 0.65, 50, 130, 14);
    ctx.fillRect(width * 0.65, 80, 100, 14);
    ctx.fillRect(width * 0.65, 110, 120, 14);
    ctx.fillRect(width * 0.65, 140, 70, 14);
    ctx.fillRect(width * 0.65, 170, 110, 14);
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.65 - 30, 50, 15, 14);
    ctx.strokeRect(width * 0.65 - 30, 80, 15, 14);
    ctx.strokeRect(width * 0.65 - 30, 110, 15, 14);
    ctx.strokeRect(width * 0.65 - 30, 140, 15, 14);
    ctx.strokeRect(width * 0.65 - 30, 170, 15, 14);

    return new THREE.CanvasTexture(canvas);
  };

  // Abstract green power node generator (no words/letters)
  const createHexPlateTexture = (color: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#064e3b";
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 108, 108);

    ctx.strokeStyle = "#a7f3d0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 28);
    ctx.lineTo(64, 100);
    ctx.moveTo(28, 64);
    ctx.lineTo(100, 64);
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(64, 64, 12, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP SCENE, CAMERA, RENDERER ---
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || 500;

    const scene = new THREE.Scene();
    // Beautiful morning skybox with foggy horizon mist
    scene.background = new THREE.Color("#bae6fd"); // Light clear morning sky blue
    scene.fog = new THREE.FogExp2("#ffedd5", 0.012); // Warm morning mist/horizon glaze

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear previous canvases
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight("#fef3c7", 1.4); // Warm morning ambient light
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#fdb777", 2.2); // Golden morning directional sunlight
    sunLight.position.set(-45, 20, -15); // Lower angle for long beautiful morning shadows
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Subtle colored point lights for accents (toned down slightly for bright morning daylight)
    const purpleLight = new THREE.PointLight("#c084fc", 2.2, 15);
    purpleLight.position.set(0, 3, -15);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight("#22d3ee", 2.2, 15);
    cyanLight.position.set(-15, 3, -5);
    scene.add(cyanLight);

    const greenLight = new THREE.PointLight("#4ade80", 2.2, 15);
    greenLight.position.set(15, 3, -5);
    scene.add(greenLight);

    const orangeLight = new THREE.PointLight("#fb923c", 2.2, 15);
    orangeLight.position.set(12, 3, 12);
    scene.add(orangeLight);

    // --- TERRAIN & ENVIRONMENT ---
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // Large main ground plateau (lush green grass)
    const grassGeo = new THREE.CylinderGeometry(26, 28, 2, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: "#16a34a", // Lush bright morning grass
      roughness: 0.9,
      metalness: 0.05,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = -1;
    grassMesh.receiveShadow = true;
    terrainGroup.add(grassMesh);

    // Sand rim around island (warmer bright sand)
    const sandGeo = new THREE.CylinderGeometry(28, 30, 1.8, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: "#e5c185", // Warmer morning beach sand
      roughness: 0.9,
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.position.y = -1.1;
    sandMesh.receiveShadow = true;
    terrainGroup.add(sandMesh);

    // Surrounding Ocean Water (shimmering clear blue morning lagoon)
    const waterGeo = new THREE.PlaneGeometry(300, 300);
    const waterMat = new THREE.MeshStandardMaterial({
      color: "#0ea5e9", // Brilliant turquoise sky blue
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
      metalness: 0.7,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -1.5;
    scene.add(waterMesh);

    // --- THE RIVER & WOODEN BRIDGE ---
    // (Removed at user request to allow direct grass access to the southern cabin)

    // --- STEPPING STONES PATHWAYS ---
    const spawnPos = new THREE.Vector3(0, 0, 0);
    const pathLocations = [
      // Pathway towards ABOUT ME (North)
      { x: 0, z: -3 }, { x: 0, z: -6 }, { x: 0, z: -9 }, { x: 0, z: -12 },
      // Pathway towards PROJECTS (West)
      { x: -3, z: -1 }, { x: -6, z: -2 }, { x: -9, z: -3 }, { x: -12, z: -4 },
      // Pathway towards SKILLS (East)
      { x: 3, z: -1 }, { x: 6, z: -2 }, { x: 9, z: -3 }, { x: 12, z: -4 },
      // Pathway towards CONTACT / Bridge (Southeast)
      { x: 2, z: 2 }, { x: 4, z: 3 }, { x: 6, z: 4 }, { x: 8, z: 4.2 }
    ];

    const stoneMat = new THREE.MeshStandardMaterial({
      color: "#5a5e66",
      roughness: 0.9,
    });
    pathLocations.forEach((loc) => {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6 + Math.random() * 0.2, 0.7, 0.15, 8),
        stoneMat
      );
      stone.position.set(loc.x, -0.05, loc.z);
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      terrainGroup.add(stone);
    });

    // --- PROCEDURAL LOW-POLY TREES ---
    const spawnTree = (tx: number, tz: number) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      // Trunk
      const trunkHeight = 1.2 + Math.random() * 0.8;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 6),
        new THREE.MeshStandardMaterial({ color: "#5c3a21", roughness: 0.9 })
      );
      trunk.position.y = trunkHeight / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Leaves (stacked cones for classic game look)
      const leavesCount = 3;
      const leavesColors = ["#1e4620", "#1b5e20", "#2e7d32"];
      for (let i = 0; i < leavesCount; i++) {
        const coneHeight = 1.0 + Math.random() * 0.4;
        const coneRadius = 1.2 - i * 0.25;
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(coneRadius, coneHeight, 6),
          new THREE.MeshStandardMaterial({
            color: leavesColors[i % leavesColors.length],
            roughness: 0.8,
            flatShading: true,
          })
        );
        leaves.position.y = trunkHeight + i * 0.6 + coneHeight / 2 - 0.2;
        leaves.castShadow = true;
        tree.add(leaves);
      }
      terrainGroup.add(tree);
    };

    // Scatter trees safely away from central path and stations
    const treePositions = [
      { x: -12, z: -15 }, { x: -7, z: -14 }, { x: 8, z: -15 }, { x: 14, z: -14 },
      { x: -18, z: -10 }, { x: -15, z: -12 }, { x: 18, z: -10 }, { x: 15, z: -12 },
      { x: -18, z: 2 }, { x: -15, z: 8 }, { x: -8, z: 12 }, { x: -12, z: 14 },
      { x: -4, z: 14 }, { x: 2, z: 15 }, { x: 18, z: 6 }, { x: 17, z: 0 }
    ];
    treePositions.forEach((pos) => spawnTree(pos.x, pos.z));

    // --- INTERACTIVE STATIONS ---

    // 1. ABOUT ME (Temple Portal) at (0, 0, -15)
    const aboutGroup = new THREE.Group();
    aboutGroup.position.set(0, 0, -15);

    // Stone base
    const templeBase = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85 })
    );
    templeBase.position.y = 0.2;
    templeBase.receiveShadow = true;
    aboutGroup.add(templeBase);

    // Stairs
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(3 - i * 0.6, 0.15, 0.8),
        new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 })
      );
      step.position.set(0, 0.07 + i * 0.15, 2.2 - i * 0.35);
      step.receiveShadow = true;
      aboutGroup.add(step);
    }

    // Twin Pillars with detailed Base and Capital
    const pillarMat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.8 });
    const colBaseMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85 });

    const createColumn = (x: number, z: number) => {
      const colGroup = new THREE.Group();
      colGroup.position.set(x, 0.2, z);

      // Base
      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.25, 10), colBaseMat);
      colBase.position.y = 0.125;
      colBase.castShadow = true;
      colBase.receiveShadow = true;
      colGroup.add(colBase);

      // Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 2.7, 10), pillarMat);
      shaft.position.y = 1.35;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      colGroup.add(shaft);

      // Capital (top)
      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.55), colBaseMat);
      capital.position.y = 2.8;
      capital.castShadow = true;
      colGroup.add(capital);

      return colGroup;
    };

    const pillarL = createColumn(-2, 0);
    const pillarR = createColumn(2, 0);

    // Portal arch header
    const archHeader = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.45, 1.2),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.8 })
    );
    archHeader.position.set(0, 3.325, 0);
    archHeader.castShadow = true;

    // Triangular pediment (temple roof)
    const pediment = new THREE.Mesh(
      new THREE.ConeGeometry(3.3, 1.1, 4),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8 })
    );
    pediment.position.set(0, 4.0, 0);
    pediment.rotation.y = Math.PI / 4; // align cone flat edges to front
    pediment.scale.set(1.15, 1.0, 0.5); // flatten along Z to form pediment
    pediment.castShadow = true;

    // Inside the portal frame - glowing purple plane
    const portalCore = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.8, 0.2),
      new THREE.MeshStandardMaterial({
        color: "#c084fc",
        emissive: "#a855f7",
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      })
    );
    portalCore.position.set(0, 1.6, -0.1);

    // Runic rotating ring inside portal core
    const ringMat = new THREE.MeshStandardMaterial({
      color: "#e9d5ff",
      emissive: "#c084fc",
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.85
    });
    const portalRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 8, 24), ringMat);
    portalRing.name = "portalRing";
    portalRing.position.set(0, 1.6, -0.05);

    // Glowing Torches on the sides of the entrance stairs
    const torchStandMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      emissive: "#ef4444",
      emissiveIntensity: 3.5,
      roughness: 0.2
    });

    const createTorch = (x: number, z: number) => {
      const torchGroup = new THREE.Group();
      torchGroup.position.set(x, 0.2, z);

      // Stand
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8), torchStandMat);
      stand.position.y = 0.4;
      stand.castShadow = true;
      stand.receiveShadow = true;
      torchGroup.add(stand);

      // Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.18, 8), torchStandMat);
      bowl.position.y = 0.89;
      bowl.castShadow = true;
      torchGroup.add(bowl);

      // Flame
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), flameMat);
      flame.name = "torchFlame";
      flame.position.y = 1.02;
      torchGroup.add(flame);

      // Light source
      const light = new THREE.PointLight("#f97316", 1.8, 6);
      light.position.set(0, 1.2, 0);
      light.castShadow = true;
      torchGroup.add(light);

      return torchGroup;
    };

    const torchL = createTorch(-2.3, 2.1);
    const torchR = createTorch(2.3, 2.1);

    // Floating Golden Star/Crest inside portal core to represent Identity (About Me)
    const crestGroup = new THREE.Group();
    crestGroup.name = "aboutCrest";
    crestGroup.position.set(0, 1.6, -0.05);

    const goldMat = new THREE.MeshStandardMaterial({ color: "#eab308", metalness: 0.9, roughness: 0.1 });
    const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldMat);
    starCore.castShadow = true;

    const starRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.024, 8, 24), goldMat);
    const starRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.024, 8, 24), goldMat);
    starRing2.rotation.x = Math.PI / 2;

    crestGroup.add(starCore, starRing1, starRing2);
    aboutGroup.add(crestGroup);

    aboutGroup.add(pillarL, pillarR, archHeader, pediment, portalCore, portalRing, torchL, torchR);

    // Removed floating 3D About Me billboard as we now use dynamic HUD notifications

    scene.add(aboutGroup);

    // 2. PROJECTS Terminal at (-15, 0, -5)
    const projGroup = new THREE.Group();
    projGroup.position.set(-15, 0, -5);

    // Terminal Base pedestal (sleeker futuristic metallic base)
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.3, 2.8),
      new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.8, roughness: 0.2 })
    );
    pedestal.position.y = 0.15;
    pedestal.receiveShadow = true;
    projGroup.add(pedestal);

    const pillarCenter = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.1, 0.9),
      new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.6 })
    );
    pillarCenter.position.set(0, 0.7, 0.1);
    pillarCenter.castShadow = true;
    projGroup.add(pillarCenter);

    // Tilted Control Deck (Front keyboard panel)
    const controlDeck = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.15, 0.8),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 })
    );
    controlDeck.position.set(0, 1.15, 0.6);
    controlDeck.rotation.x = -Math.PI / 8; // tilted forward towards player
    controlDeck.castShadow = true;
    projGroup.add(controlDeck);

    // Glowing keyboard grid (matrix of small colored cubes representing holographic controls)
    const buttonMatL = new THREE.MeshStandardMaterial({ color: "#22d3ee", emissive: "#06b6d4", emissiveIntensity: 2.0 });
    const buttonMatR = new THREE.MeshStandardMaterial({ color: "#fb7185", emissive: "#f43f5e", emissiveIntensity: 2.0 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const key = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.04, 0.08),
          col % 2 === 0 ? buttonMatL : buttonMatR
        );
        // Position keys relative to deck center
        key.position.set(-0.8 + col * 0.32, 0.08, -0.2 + row * 0.18);
        controlDeck.add(key);
      }
    }

    // Big central neon screen
    const displayScreen = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.9, 0.15),
      new THREE.MeshStandardMaterial({
        color: "#0f172a",
        roughness: 0.1,
      })
    );
    displayScreen.position.set(0, 2.1, 0);
    displayScreen.rotation.x = -Math.PI / 10; // tilted up
    displayScreen.castShadow = true;
    projGroup.add(displayScreen);

    // Screen display core (glowing cyan interface)
    const screenCore = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 1.7),
      new THREE.MeshBasicMaterial({
        map: createHoloTexture("#06b6d4", 512, 256),
        side: THREE.DoubleSide,
      })
    );
    screenCore.position.set(0, 2.11, 0.08);
    screenCore.rotation.x = -Math.PI / 10;
    projGroup.add(screenCore);

    // Twin side holographic displays (floating panels rotated inwards)
    const holoScreenMat = new THREE.MeshStandardMaterial({
      color: "#22d3ee",
      emissive: "#0891b2",
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      side: THREE.DoubleSide
    });

    const holoScreenL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), holoScreenMat);
    holoScreenL.position.set(-2.5, 2.2, 0.4);
    holoScreenL.rotation.set(-Math.PI / 10, Math.PI / 6, 0);
    
    const holoScreenR = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), holoScreenMat);
    holoScreenR.position.set(2.5, 2.2, 0.4);
    holoScreenR.rotation.set(-Math.PI / 10, -Math.PI / 6, 0);

    // Add glowing wireframe design onto holo-screens
    const wireGeo = new THREE.PlaneGeometry(1.1, 1.3);
    const wireMat = new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.3 });
    const wireL = new THREE.Mesh(wireGeo, wireMat);
    wireL.position.z = 0.01;
    holoScreenL.add(wireL);
    const wireR = new THREE.Mesh(wireGeo, wireMat);
    wireR.position.z = 0.01;
    holoScreenR.add(wireR);

    projGroup.add(holoScreenL, holoScreenR);

    // Neon Power Cable Conduits running into the console
    const conduitMat = new THREE.MeshStandardMaterial({
      color: "#22d3ee",
      emissive: "#06b6d4",
      emissiveIntensity: 2.5
    });
    const conduitL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), conduitMat);
    conduitL.position.set(-1.2, 0.75, 0.35);
    conduitL.rotation.set(Math.PI / 4, 0, -Math.PI / 12);
    const conduitR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), conduitMat);
    conduitR.position.set(1.2, 0.75, 0.35);
    conduitR.rotation.set(Math.PI / 4, 0, Math.PI / 12);
    projGroup.add(conduitL, conduitR);

    // Floating Holographic Globe above console
    const globeGroup = new THREE.Group();
    globeGroup.position.set(0, 3.5, 0);
    
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.02, 6, 24), conduitMat);
    outerRing.name = "globeOuterRing";
    
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshBasicMaterial({ color: "#22d3ee", wireframe: true, transparent: true, opacity: 0.65 })
    );
    globe.name = "projectsGlobe";

    // Pulsing cybernetic core inside the globe (unique Projects landmark)
    const projCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({ color: "#22d3ee", emissive: "#06b6d4", emissiveIntensity: 2.2 })
    );
    projCore.name = "projectsCore";
    
    globeGroup.add(outerRing, globe, projCore);
    projGroup.add(globeGroup);

    // Removed floating 3D Projects billboard as we now use dynamic HUD notifications

    scene.add(projGroup);

    // 3. SKILLS Archway at (15, 0, -5)
    const skillsGroup = new THREE.Group();
    skillsGroup.position.set(15, 0, -5);

    // Base
    const skillsBase = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 })
    );
    skillsBase.position.y = 0.15;
    skillsBase.receiveShadow = true;
    skillsGroup.add(skillsBase);

    // Concentric Runic Ring Gateway (replacing rectangular columns)
    const ringOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.22, 10, 36),
      pillarMat
    );
    ringOuter.position.set(0, 1.8, 0);
    ringOuter.castShadow = true;
    skillsGroup.add(ringOuter);

    const neonRingMat = new THREE.MeshStandardMaterial({
      color: "#a7f3d0",
      emissive: "#10b981",
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.85
    });
    const ringInner = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.06, 8, 36),
      neonRingMat
    );
    ringInner.position.set(0, 1.8, 0);
    skillsGroup.add(ringInner);

    // Four surrounding power pillars with floating crystals
    const pillarStoneMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: "#34d399",
      emissive: "#059669",
      emissiveIntensity: 2.5,
      roughness: 0.1
    });

    const createCrystalPillar = (px: number, pz: number) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0.15, pz);

      // Pillar base
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), pillarStoneMat);
      col.position.y = 0.3;
      col.castShadow = true;
      col.receiveShadow = true;
      pGroup.add(col);

      // Floating Crystal (Octahedron shape)
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), crystalMat);
      crystal.name = "skillsCrystal";
      crystal.position.y = 0.9;
      crystal.castShadow = true;
      pGroup.add(crystal);

      // Soft light from crystal
      const crystalLight = new THREE.PointLight("#10b981", 1.2, 3);
      crystalLight.position.set(0, 0.9, 0);
      pGroup.add(crystalLight);

      return pGroup;
    };

    const pilFL = createCrystalPillar(-1.6, 1.6);
    const pilFR = createCrystalPillar(1.6, 1.6);
    const pilBL = createCrystalPillar(-1.6, -1.6);
    const pilBR = createCrystalPillar(1.6, -1.6);
    skillsGroup.add(pilFL, pilFR, pilBL, pilBR);

    // Glowing laser beam generator connecting pillars to gateway center (unique Skills landmark)
    const createLaserBeam = (from: THREE.Vector3, to: THREE.Vector3) => {
      const direction = new THREE.Vector3().subVectors(to, from);
      const length = direction.length();
      const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 6);
      
      // Translate geometry so origin is at "from", rotating around center
      laserGeo.translate(0, length / 2, 0);
      laserGeo.rotateX(Math.PI / 2);
      
      const laserMesh = new THREE.Mesh(
        laserGeo,
        new THREE.MeshStandardMaterial({
          color: "#10b981",
          emissive: "#34d399",
          emissiveIntensity: 2.5
        })
      );
      laserMesh.position.copy(from);
      laserMesh.lookAt(to);
      return laserMesh;
    };

    const laser1 = createLaserBeam(new THREE.Vector3(-1.6, 1.05, 1.6), new THREE.Vector3(0, 1.8, 0));
    const laser2 = createLaserBeam(new THREE.Vector3(1.6, 1.05, 1.6), new THREE.Vector3(0, 1.8, 0));
    const laser3 = createLaserBeam(new THREE.Vector3(-1.6, 1.05, -1.6), new THREE.Vector3(0, 1.8, 0));
    const laser4 = createLaserBeam(new THREE.Vector3(1.6, 1.05, -1.6), new THREE.Vector3(0, 1.8, 0));
    skillsGroup.add(laser1, laser2, laser3, laser4);

    // Rotating skills hexagons in the center of arch
    const hexGroup = new THREE.Group();
    hexGroup.position.set(0, 1.8, 0);

    const skillsNames = ["JS", "TS", "React", "Node", "MDB", "FS"];
    const skillHexMeshes: THREE.Mesh[] = [];
    skillsNames.forEach((name, idx) => {
      // Create Hexagon shapes
      const hexGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 6);
      const hexTex = createHexPlateTexture("#10b981");
      const hexMat = new THREE.MeshBasicMaterial({ map: hexTex });
      const hexMesh = new THREE.Mesh(hexGeo, hexMat);

      // Distribute in circle
      const angle = (idx / skillsNames.length) * Math.PI * 2;
      hexMesh.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 0.8, 0);
      hexMesh.rotation.x = Math.PI / 2;
      hexMesh.rotation.y = 0; // Keep text upright
      hexGroup.add(hexMesh);
      skillHexMeshes.push(hexMesh);
    });
    skillsGroup.add(hexGroup);

    // Removed floating 3D Skills billboard as we now use dynamic HUD notifications

    scene.add(skillsGroup);

    // 4. CONTACT Log Cabin at (12, 0, 12)
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(12, 0, 12);

    // Cabin Floor base
    const cabinBase = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.3, 4.5),
      new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.95 })
    );
    cabinBase.position.y = 0.15;
    cabinBase.receiveShadow = true;
    cabinGroup.add(cabinBase);

    // Stacked Horizontal Log Walls for realistic log cabin appearance
    const logMat = new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.9 });
    const logRadius = 0.12;
    const cabinHeight = 2.0;
    const logStep = 0.2;

    // Back wall (Z = -1.7)
    for (let y = 0.22; y < cabinHeight; y += logStep) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 4.3, 8), logMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, y, -1.7);
      log.castShadow = true;
      log.receiveShadow = true;
      cabinGroup.add(log);
    }
    // Left wall (X = -2.0)
    for (let y = 0.22; y < cabinHeight; y += logStep) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 3.7, 8), logMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(-2.0, y, 0);
      log.castShadow = true;
      log.receiveShadow = true;
      cabinGroup.add(log);
    }
    // Right wall (X = 2.0)
    for (let y = 0.22; y < cabinHeight; y += logStep) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 3.7, 8), logMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(2.0, y, 0);
      log.castShadow = true;
      log.receiveShadow = true;
      cabinGroup.add(log);
    }
    // Front wall (Z = 1.7) - split by the door at center
    for (let y = 0.22; y < cabinHeight; y += logStep) {
      if (y >= 1.6) {
        // Log spanning above the door
        const fullLog = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 4.3, 8), logMat);
        fullLog.rotation.z = Math.PI / 2;
        fullLog.position.set(0, y, 1.7);
        fullLog.castShadow = true;
        fullLog.receiveShadow = true;
        cabinGroup.add(fullLog);
      } else {
        // Logs left and right of the door
        const logL = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 1.5, 8), logMat);
        logL.rotation.z = Math.PI / 2;
        logL.position.set(-1.4, y, 1.7);
        logL.castShadow = true;
        logL.receiveShadow = true;

        const logR = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, 1.5, 8), logMat);
        logR.rotation.z = Math.PI / 2;
        logR.position.set(1.4, y, 1.7);
        logR.castShadow = true;
        logR.receiveShadow = true;

        cabinGroup.add(logL, logR);
      }
    }

    // Cozy wooden corner posts
    const postMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.95 });
    const cornerCoordinates = [
      { x: -2.0, z: -1.7 }, { x: 2.0, z: -1.7 },
      { x: -2.0, z: 1.7 }, { x: 2.0, z: 1.7 }
    ];
    cornerCoordinates.forEach((c) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, cabinHeight - 0.1, 8), postMat);
      post.position.set(c.x, cabinHeight / 2 + 0.1, c.z);
      post.castShadow = true;
      cabinGroup.add(post);
    });

    // Roof (Dark grey triangular prism)
    const roofGeo = new THREE.ConeGeometry(3.3, 1.7, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.85, flatShading: true });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.95, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    cabinGroup.add(roof);

    // Stone Chimney on the roof
    const stoneChimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.4, 0.45),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.9 })
    );
    stoneChimney.position.set(-1.2, 2.6, -0.8);
    stoneChimney.castShadow = true;
    cabinGroup.add(stoneChimney);

    const chimneyCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, 0.55),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.95 })
    );
    chimneyCap.position.set(-1.2, 3.35, -0.8);
    cabinGroup.add(chimneyCap);

    // Volumetric Smoke Particles
    const smokeGroup = new THREE.Group();
    const smokeMat = new THREE.MeshBasicMaterial({ color: "#e2e8f0", transparent: true, opacity: 0.55 });
    for (let i = 0; i < 5; i++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), smokeMat);
      smoke.name = "smokeParticle";
      // Setup floating starting coordinates
      smoke.position.set(-1.2, 3.4 + i * 0.45, -0.8);
      smoke.userData = { speed: 0.35 + Math.random() * 0.15, phase: Math.random() * Math.PI };
      smokeGroup.add(smoke);
    }
    cabinGroup.add(smokeGroup);

    // Detailed door with panels and brass knob
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0.8, 1.76);
    
    const doorBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.6, 0.08),
      new THREE.MeshStandardMaterial({ color: "#3b2314", roughness: 0.9 })
    );
    doorBase.castShadow = true;
    doorGroup.add(doorBase);

    // Small brass doorknob
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: "#ca8a04", metalness: 0.9, roughness: 0.1 })
    );
    knob.position.set(0.35, 0, 0.06);
    doorGroup.add(knob);
    cabinGroup.add(doorGroup);

    // Cozy Glass Window with wood frame and warm glowing interior
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.15),
      new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 })
    );
    windowFrame.position.set(-1.1, 1.25, 1.73);
    windowFrame.castShadow = true;

    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.75),
      new THREE.MeshStandardMaterial({
        color: "#fef08a",
        emissive: "#fbbf24",
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.85
      })
    );
    windowGlass.position.set(0, 0, 0.08);
    windowFrame.add(windowGlass);

    // Window pane wood grids
    const gridH = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.02), postMat);
    gridH.position.z = 0.09;
    const gridV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.02), postMat);
    gridV.position.z = 0.09;
    windowFrame.add(gridH, gridV);
    cabinGroup.add(windowFrame);

    // Porch Lantern hanging beside the door
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(-0.7, 1.45, 1.85);

    // Bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), postMat);
    bracket.position.z = -0.125;
    lanternGroup.add(bracket);

    // Lantern frame
    const lanternFrame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: "#1a1a1a", metalness: 0.8, roughness: 0.3 })
    );
    lanternFrame.position.y = -0.1;
    lanternFrame.castShadow = true;
    lanternGroup.add(lanternFrame);

    // Glowing bulb inside
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshStandardMaterial({ color: "#fef08a", emissive: "#f59e0b", emissiveIntensity: 3.0 })
    );
    bulb.position.y = -0.1;
    lanternGroup.add(bulb);

    // Cozy golden light casting onto porch
    const lanternLight = new THREE.PointLight("#fb923c", 1.8, 4);
    lanternLight.position.set(0, -0.12, 0.05);
    lanternLight.castShadow = true;
    lanternGroup.add(lanternLight);
    
    cabinGroup.add(lanternGroup);

    // Cozy Campfire on the left side of the cabin porch (representing warmth & hospitality)
    const campfireGroup = new THREE.Group();
    campfireGroup.position.set(-2.2, 0.15, 2.2);

    // Stone ring around fire
    const campfireStoneMat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.95 });
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), campfireStoneMat);
      st.position.set(Math.cos(a) * 0.42, 0.04, Math.sin(a) * 0.42);
      st.scale.set(1.2, 0.8, 1);
      campfireGroup.add(st);
    }
    // Crossed fire logs
    const logBrownMat = new THREE.MeshStandardMaterial({ color: "#2d1b10", roughness: 0.95 });
    const cLog1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), logBrownMat);
    cLog1.rotation.set(0.2, 0.5, Math.PI / 2);
    cLog1.position.y = 0.06;
    const cLog2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), logBrownMat);
    cLog2.rotation.set(0.2, -0.5, -Math.PI / 2);
    cLog2.position.y = 0.06;
    campfireGroup.add(cLog1, cLog2);

    // Glowing flickering flame mesh
    const fireMat = new THREE.MeshBasicMaterial({ color: "#f97316", transparent: true, opacity: 0.85 });
    const campfireFlame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), fireMat);
    campfireFlame.name = "campfireFlame";
    campfireFlame.position.y = 0.22;
    campfireFlame.scale.set(0.9, 1.6, 0.9);
    campfireGroup.add(campfireFlame);

    // Light source
    const campfireLight = new THREE.PointLight("#ef4444", 1.6, 4);
    campfireLight.name = "campfireLight";
    campfireLight.position.set(0, 0.4, 0);
    campfireLight.castShadow = true;
    campfireGroup.add(campfireLight);

    cabinGroup.add(campfireGroup);

    // 3D Mailbox on the right side of the porch (representing Contact/Inquiries)
    const mailboxGroup = new THREE.Group();
    mailboxGroup.position.set(2.0, 0.15, 2.2);

    const mailPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), postMat);
    mailPost.position.y = 0.4;
    mailPost.castShadow = true;
    mailboxGroup.add(mailPost);

    const mailBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.2, 0.38),
      new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.5, roughness: 0.4 })
    );
    mailBox.position.set(0, 0.85, 0.05);
    mailBox.castShadow = true;
    mailboxGroup.add(mailBox);

    const mailFlag = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.16, 0.04),
      new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.5 })
    );
    mailFlag.position.set(0.13, 0.95, -0.05);
    mailFlag.rotation.z = -Math.PI / 4; // flag up
    mailboxGroup.add(mailFlag);

    cabinGroup.add(mailboxGroup);

    // Removed contact signboard as we now use dynamic HUD notifications and modal registry

    // Removed floating 3D Contact billboard as we now use dynamic HUD notifications

    scene.add(cabinGroup);

    // --- PLAYABLE PLAYER AVATAR (STYLIZED SHIH TZU DOG WITH RICH CARAMEL FUR & WHITE SOCKS) ---
    const player = new THREE.Group();
    player.position.set(0, 0, 0);

    // Let's create materials for the Shih Tzu matching the user's reference image exactly
    const brownMat = new THREE.MeshStandardMaterial({ color: "#8c7258", roughness: 0.85 }); // Grizzled dusty golden-brown fur color from photo
    const whiteMat = new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.9 });  // Pure fluffy white socks/patches
    const blackMat = new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.95 }); // Pupil, nose and ears black
    const tongueMat = new THREE.MeshStandardMaterial({ color: "#fb7185", roughness: 0.7 }); // Pink tongue
    const eyeHighlightMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1, emissive: "#ffffff", emissiveIntensity: 0.5 });
    const collarMat = new THREE.MeshStandardMaterial({ color: "#b22222", roughness: 0.6 }); // Vibrant red collar
    const buckleMat = new THREE.MeshStandardMaterial({ color: "#d1d5db", metalness: 0.95, roughness: 0.1 }); // Silver buckle

    // 1. Dog Body (horizontal cylinder body with extra fluffy volumetric coat)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 0.45, 0);
    
    const dogBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.82, 12),
      brownMat
    );
    dogBody.rotation.x = Math.PI / 2; // horizontal orientation along Z-axis
    dogBody.castShadow = true;
    dogBody.receiveShadow = true;
    bodyGroup.add(dogBody);

    // Fluffy caramel side-fluff/shaggy coat extensions (mimics the long flowing coat in the photo)
    const sideFluffL1 = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 8), brownMat);
    sideFluffL1.position.set(-0.14, -0.06, 0.1);
    sideFluffL1.scale.set(0.7, 1.1, 1.2);
    bodyGroup.add(sideFluffL1);

    const sideFluffR1 = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 8), brownMat);
    sideFluffR1.position.set(0.14, -0.06, 0.1);
    sideFluffR1.scale.set(0.7, 1.1, 1.2);
    bodyGroup.add(sideFluffR1);

    const sideFluffL2 = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 8), brownMat);
    sideFluffL2.position.set(-0.14, -0.06, -0.2);
    sideFluffL2.scale.set(0.7, 1.1, 1.2);
    bodyGroup.add(sideFluffL2);

    const sideFluffR2 = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 8), brownMat);
    sideFluffR2.position.set(0.14, -0.06, -0.2);
    sideFluffR2.scale.set(0.7, 1.1, 1.2);
    bodyGroup.add(sideFluffR2);

    // Rich fluffy white bib/patch on the chest (perfect V-shape and fluff precisely matching the image)
    const chestPatch1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      whiteMat
    );
    chestPatch1.position.set(0, 0.08, 0.33);
    chestPatch1.scale.set(0.95, 1.1, 0.85);
    bodyGroup.add(chestPatch1);

    const chestPatch2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      whiteMat
    );
    chestPatch2.position.set(0, -0.12, 0.28);
    chestPatch2.scale.set(0.85, 0.95, 0.8);
    bodyGroup.add(chestPatch2);

    // Fluffy golden-brown neck transition (bridges body and head, matching the dog's neck in photo)
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.29, 0.32, 12),
      brownMat
    );
    neckMesh.position.set(0, 0.29, 0.23);
    neckMesh.rotation.x = Math.PI / 6;
    neckMesh.castShadow = true;
    bodyGroup.add(neckMesh);

    // Red Collar around the neck (matching the red collar in the photo!)
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.27, 0.08, 12),
      collarMat
    );
    collar.position.set(0, 0.32, 0.25);
    collar.rotation.x = Math.PI / 6;
    collar.castShadow = true;
    bodyGroup.add(collar);

    // Silver Buckle on the collar
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.04),
      buckleMat
    );
    buckle.position.set(0, 0.32, 0.37);
    buckle.rotation.x = Math.PI / 6;
    bodyGroup.add(buckle);
    
    player.add(bodyGroup);

    // 2. Dog Head (sphere, mounted on the front)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.92, 0.4); // elevated and forward

    const dogHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      brownMat
    );
    dogHead.castShadow = true;
    headGroup.add(dogHead);

    // Forehead/Topknot dome (gives the classic puffy Shih Tzu head shape)
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), brownMat);
    topknot.position.set(0, 0.2, -0.05);
    topknot.scale.set(1.15, 0.85, 1);
    headGroup.add(topknot);

    // Fluffy golden-brown cheeks
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), brownMat);
    cheekL.position.set(-0.21, -0.08, 0.12);
    cheekL.scale.set(1.0, 1.35, 1.05);
    headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), brownMat);
    cheekR.position.set(0.21, -0.08, 0.12);
    cheekR.scale.set(1.0, 1.35, 1.05);
    headGroup.add(cheekR);

    // White/grey forehead blaze (precisely matching the light stripe in the photo!)
    const blaze1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), whiteMat);
    blaze1.position.set(0, 0.08, 0.29);
    blaze1.scale.set(0.9, 1.6, 0.8);
    headGroup.add(blaze1);

    const blaze2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), whiteMat);
    blaze2.position.set(0, 0.22, 0.22);
    blaze2.scale.set(1, 1, 0.9);
    headGroup.add(blaze2);

    // 3. Floppy Ears (luxurious black ears draping downwards, blending beautifully)
    const earL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.48, 0.22),
      blackMat
    );
    earL.position.set(-0.32, -0.12, -0.02);
    earL.rotation.z = Math.PI / 15;
    earL.castShadow = true;

    const earR = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.48, 0.22),
      blackMat
    );
    earR.position.set(0.32, -0.12, -0.02);
    earR.rotation.z = -Math.PI / 15;
    earR.castShadow = true;

    // Elegant long ear hair drape (blends into the cheeks)
    const earDrapeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), blackMat);
    earDrapeL.position.set(0, -0.22, 0.02);
    earDrapeL.scale.set(1.15, 1.5, 1.15);
    earL.add(earDrapeL);

    const earDrapeR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), blackMat);
    earDrapeR.position.set(0, -0.22, 0.02);
    earDrapeR.scale.set(1.15, 1.5, 1.15);
    earR.add(earDrapeR);

    headGroup.add(earL, earR);

    // 4. Golden-Brown Muzzle, Mustache & Beard
    const snoutL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), brownMat);
    snoutL.position.set(-0.08, -0.06, 0.28);
    snoutL.scale.set(1.05, 1, 1.05);
    headGroup.add(snoutL);

    const snoutR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), brownMat);
    snoutR.position.set(0.08, -0.06, 0.28);
    snoutR.scale.set(1.05, 1, 1.05);
    headGroup.add(snoutR);

    const beardCenter = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), brownMat);
    beardCenter.position.set(0, -0.15, 0.24);
    beardCenter.scale.set(1.2, 1.1, 1.15);
    headGroup.add(beardCenter);

    // Cute small black nose
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.055, 0.065),
      blackMat
    );
    nose.position.set(0, -0.015, 0.38);
    headGroup.add(nose);

    // Glistening pink tongue inside cute slightly parted mouth
    const tongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 0.08),
      tongueMat
    );
    tongue.position.set(0, -0.08, 0.32);
    headGroup.add(tongue);

    // 4.5 Smiling Open Mouth Cavity, Jaw, & Cute White Teeth (matching the smiling dog in the photo)
    const mouthCavity = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: "#1c0d0d", roughness: 0.9 }) // dark interior cavity
    );
    mouthCavity.position.set(0, -0.08, 0.3);
    headGroup.add(mouthCavity);

    // Lower Jaw / Chin
    const lowerJaw = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      brownMat
    );
    lowerJaw.position.set(0, -0.15, 0.3);
    lowerJaw.scale.set(1.1, 0.7, 1.05);
    headGroup.add(lowerJaw);

    // Cute tiny white teeth (incisors visible in the photo smile)
    const teethMat = new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.1 });
    const toothGeo = new THREE.BoxGeometry(0.015, 0.025, 0.015);
    
    // Position 4 tiny teeth on the lower jaw
    const tooth1 = new THREE.Mesh(toothGeo, teethMat);
    tooth1.position.set(-0.045, -0.07, 0.34);
    const tooth2 = new THREE.Mesh(toothGeo, teethMat);
    tooth2.position.set(-0.015, -0.07, 0.345);
    const tooth3 = new THREE.Mesh(toothGeo, teethMat);
    tooth3.position.set(0.015, -0.07, 0.345);
    const tooth4 = new THREE.Mesh(toothGeo, teethMat);
    tooth4.position.set(0.045, -0.07, 0.34);

    headGroup.add(tooth1, tooth2, tooth3, tooth4);

    // 5. Glistening Deep Puppy Eyes
    const eyeL = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 8, 8),
      blackMat
    );
    eyeL.position.set(-0.13, 0.07, 0.27);
    
    const eyeR = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 8, 8),
      blackMat
    );
    eyeR.position.set(0.13, 0.07, 0.27);

    // Expressive catchlight sparkles for a real lifelike gaze
    const highlightL = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 6), eyeHighlightMat);
    highlightL.position.set(0.02, 0.02, 0.04);
    eyeL.add(highlightL);

    const highlightR = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 6), eyeHighlightMat);
    highlightR.position.set(0.02, 0.02, 0.04);
    eyeR.add(highlightR);

    headGroup.add(eyeL, eyeR);

    // Fluffy golden-brown eyebrow tufts for that sweet puppy expression
    const browL = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      brownMat
    );
    browL.position.set(-0.11, 0.15, 0.27);
    browL.scale.set(1.3, 0.75, 0.9);
    browL.rotation.z = -Math.PI / 10;
    headGroup.add(browL);

    const browR = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      brownMat
    );
    browR.position.set(0.11, 0.15, 0.27);
    browR.scale.set(1.3, 0.75, 0.9);
    browR.rotation.z = Math.PI / 10;
    headGroup.add(browR);

    player.add(headGroup);

    // 6. Four Legs with Thick, Fluffy White Socks (Booties precisely matching the reference!)
    const legFL = new THREE.Group();
    legFL.position.set(-0.24, 0.22, 0.26);

    const legFR = new THREE.Group();
    legFR.position.set(0.24, 0.22, 0.26);

    const legBL = new THREE.Group();
    legBL.position.set(-0.24, 0.22, -0.26);

    const legBR = new THREE.Group();
    legBR.position.set(0.24, 0.22, -0.26);

    // Helper to generate perfectly stylized legs with cute white socks/booties
    const makeLegSocks = (grp: THREE.Group) => {
      // Upper leg (golden-brown)
      const upperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.09, 0.2, 8),
        brownMat
      );
      upperLeg.position.y = 0.1;
      upperLeg.castShadow = true;
      grp.add(upperLeg);

      // Fluffy Cuff Ring at transition (creates the voluminous coat look)
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8),
        whiteMat
      );
      cuff.position.y = 0.01;
      grp.add(cuff);

      // Lower leg sock (Snowy white)
      const lowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8),
        whiteMat
      );
      lowerLeg.position.y = -0.1;
      lowerLeg.castShadow = true;
      grp.add(lowerLeg);

      // Fluffy white paw
      const paw = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 8, 8),
        whiteMat
      );
      paw.position.set(0, -0.2, 0.04);
      paw.scale.set(1.05, 0.75, 1.3);
      paw.castShadow = true;
      grp.add(paw);
    };

    makeLegSocks(legFL);
    makeLegSocks(legFR);
    makeLegSocks(legBL);
    makeLegSocks(legBR);

    player.add(legFL, legFR, legBL, legBR);

    // 7. Beautiful plume curly tail (curves high upwards and curls forward over the back)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.65, -0.4);
    
    // Curved fluffy tail design using overlapping puffy spheres for that beautiful plume
    const tailPuffs = [
      { x: 0, y: 0.1, z: -0.05, r: 0.1, mat: brownMat },
      { x: 0, y: 0.22, z: -0.08, r: 0.11, mat: brownMat },
      { x: 0, y: 0.35, z: -0.06, r: 0.12, mat: brownMat },
      { x: 0, y: 0.46, z: 0.02, r: 0.13, mat: brownMat }, // fully golden-brown matching request
      { x: 0, y: 0.52, z: 0.12, r: 0.12, mat: brownMat },
      { x: 0, y: 0.48, z: 0.22, r: 0.1, mat: brownMat }
    ];

    tailPuffs.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 8, 8), p.mat);
      puff.position.set(p.x, p.y, p.z);
      puff.castShadow = true;
      tailGroup.add(puff);
    });

    player.add(tailGroup);

    scene.add(player);

    // --- PARTICLE MAGIC ---
    // Floating purple stars around the ABOUT portal
    const pCount = 30;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 4; // Spread X
      pPositions[i * 3 + 1] = Math.random() * 4; // Height Y
      pPositions[i * 3 + 2] = -15 + (Math.random() - 0.5) * 2; // Near Portal Z
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: "#d8b4fe",
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    const portalParticles = new THREE.Points(pGeo, pMat);
    scene.add(portalParticles);

    // --- CONTROLS REFS ---
    const keys: Record<string, boolean> = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false,
      shift: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = true;
      }
      if (key === "e" || key === " ") {
        // Trigger interaction check
        handleInteractionRequest();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse control (rotating camera orbit)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      game.cameraAngleYaw -= deltaX * 0.007;
      game.cameraAnglePitch = Math.max(
        0.1,
        Math.min(Math.PI / 2.5, game.cameraAnglePitch - deltaY * 0.005)
      );
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        // Only start drag look if it is on the right side of screen (joystick is on left)
        if (touch.clientX > window.innerWidth / 2) {
          isDragging = true;
          prevMouseX = touch.clientX;
          prevMouseY = touch.clientY;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - prevMouseX;
        const deltaY = touch.clientY - prevMouseY;
        prevMouseX = touch.clientX;
        prevMouseY = touch.clientY;

        game.cameraAngleYaw -= deltaX * 0.01;
        game.cameraAnglePitch = Math.max(
          0.1,
          Math.min(Math.PI / 2.5, game.cameraAnglePitch - deltaY * 0.008)
        );
      }
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Support mobile touch looking
    renderer.domElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", handleMouseUp);

    // Trigger check
    const stations = [
      { name: "about", position: new THREE.Vector3(0, 0, -15), radius: 3.5 },
      { name: "projects", position: new THREE.Vector3(-15, 0, -5), radius: 3.8 },
      { name: "skills", position: new THREE.Vector3(15, 0, -5), radius: 3.8 },
      { name: "contact", position: new THREE.Vector3(12, 0, 12), radius: 4.2 },
    ];

    const handleInteractionRequest = () => {
      const pPos = player.position;
      let active: string | null = null;
      for (const st of stations) {
        const dist = pPos.distanceTo(st.position);
        if (dist <= st.radius) {
          active = st.name;
          break;
        }
      }
      if (active) {
        onInteractionTriggered(active);
      }
    };

    // Store state in ref
    const game = {
      scene,
      camera,
      renderer,
      player,
      playerVelocity: new THREE.Vector3(0, 0, 0),
      playerHeading: 0,
      cameraAngleYaw: Math.PI / 2, // view from behind south initially
      cameraAnglePitch: Math.PI / 6, // looking down slightly
      keys,
      stations,
      particleSystems: [portalParticles],
      waveMeshes: [waterMesh],
      skillsGroup: hexGroup,
      clock,
      isDestroyed: false,
    };
    gameRef.current = game;

    // --- ANIMATION LOOP ---
    const tick = () => {
      if (game.isDestroyed) return;
      requestAnimationFrame(tick);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // 0. ANIME ABOUT ME STATION (Torches, Portal Ring, and Crest)
      aboutGroup.traverse((child) => {
        if (child.name === "torchFlame") {
          // Flame flickering animation (randomized scaling)
          const scale = 0.95 + Math.sin(time * 18 + child.parent!.position.x) * 0.08 + Math.cos(time * 24) * 0.04;
          child.scale.setScalar(scale);
        } else if (child.name === "portalRing") {
          // Slow mystic rotation
          child.rotation.y = time * 0.6;
          child.rotation.z = time * 0.3;
        } else if (child.name === "aboutCrest") {
          // Fast bobbing and spinning golden crest
          child.rotation.y = time * 1.8;
          child.rotation.z = time * 0.6;
          child.position.y = 1.6 + Math.sin(time * 3.0) * 0.08;
        }
      });

      // 0.5 ANIME PROJECTS STATION (Holographic Globe, Outer Ring, and Pulsing Core)
      projGroup.traverse((child) => {
        if (child.name === "projectsGlobe") {
          child.rotation.y = time * 0.8;
          child.rotation.x = time * 0.3;
        } else if (child.name === "globeOuterRing") {
          child.rotation.x = time * 0.4;
          child.rotation.y = -time * 0.6;
        } else if (child.name === "projectsCore") {
          child.rotation.y = -time * 1.6;
          child.rotation.x = time * 0.6;
          const pulse = 1.0 + Math.sin(time * 6.0) * 0.12;
          child.scale.setScalar(pulse);
        }
      });

      // 1. ANIME WATER WAVE
      waterMesh.position.y = -1.5 + Math.sin(time * 1.5) * 0.05;

      // 2. ANIME SKILLS HEXAGONS & FLOATING CRYSTALS
      hexGroup.rotation.y = time * 0.4;
      skillHexMeshes.forEach((mesh, idx) => {
        mesh.rotation.x = Math.PI / 2 + Math.sin(time * 2 + idx) * 0.15;
      });

      // Animate the four floating crystals around the Skills Gateway
      skillsGroup.traverse((child) => {
        if (child.name === "skillsCrystal") {
          child.rotation.y = time * 1.5;
          child.position.y = 0.9 + Math.sin(time * 2.5 + child.parent!.position.x + child.parent!.position.z) * 0.08;
        }
      });

      // 3. ANIME PORTAL PARTICLES
      const posArr = portalParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pCount; i++) {
        // float up
        posArr[i * 3 + 1] += delta * 0.6;
        if (posArr[i * 3 + 1] > 4) {
          posArr[i * 3 + 1] = 0; // reset
        }
        // slight sway
        posArr[i * 3] += Math.sin(time + i) * 0.005;
      }
      portalParticles.geometry.attributes.position.needsUpdate = true;

      // 4. ANIME CABIN SMOKE PARTICLES & CAMPFIRE
      cabinGroup.traverse((child) => {
        if (child.name === "smokeParticle") {
          // float up
          child.position.y += delta * child.userData.speed;
          // drift side-to-side
          child.position.x = -1.2 + Math.sin(time * 2.0 + child.userData.phase) * 0.12;
          child.position.z = -0.8 + Math.cos(time * 1.5 + child.userData.phase) * 0.12;
          
          // reset at top
          if (child.position.y > 5.5) {
            child.position.y = 3.4;
            child.scale.setScalar(1.0);
          } else {
            // shrink as it rises
            const life = (child.position.y - 3.4) / 2.1; // 0 to 1
            child.scale.setScalar(Math.max(0.1, 1.0 - life * 0.85));
          }
        } else if (child.name === "campfireFlame") {
          // flickering campfire flame mesh
          const scale = 0.95 + Math.sin(time * 20.0) * 0.12 + Math.cos(time * 12.0) * 0.06;
          child.scale.set(scale * 0.9, scale * 1.6, scale * 0.9);
        } else if (child.name === "campfireLight") {
          // flickering fire light intensity
          child.intensity = 1.4 + Math.sin(time * 22.0) * 0.2;
        }
      });

      // 4. PLAYER MOVEMENT & PHYSICS
      // Determine input direction
      let moveX = 0;
      let moveZ = 0;

      // Keyboard
      if (keys.w || keys.arrowup) moveZ -= 1;
      if (keys.s || keys.arrowdown) moveZ += 1;
      if (keys.a || keys.arrowleft) moveX -= 1;
      if (keys.d || keys.arrowright) moveX += 1;

      // Mobile Joystick Override
      if (joystickVector.x !== 0 || joystickVector.y !== 0) {
        moveX = joystickVector.x;
        moveZ = -joystickVector.y; // invert Y since joystick up is positive
      }

      // Check if player is moving
      const hasMoveInput = moveX !== 0 || moveZ !== 0;

      if (hasMoveInput) {
        // Base movement vector relative to camera Yaw orientation
        const camYaw = game.cameraAngleYaw;
        const speed = keys.shift ? 7.5 : 4.0; // Run / walk speed units per sec

        // Calculate world space direction vector
        const forwardVec = new THREE.Vector3(-Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();
        const rightVec = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardVec).normalize();

        const moveDir = new THREE.Vector3()
          .addScaledVector(forwardVec, -moveZ)
          .addScaledVector(rightVec, moveX)
          .normalize();

        // Slow down in water (beyond beach radius 24)
        const distFromCenter = player.position.length();
        const isInWater = distFromCenter > 24.5;
        const currentSpeed = isInWater ? speed * 0.35 : speed;

        player.position.addScaledVector(moveDir, currentSpeed * delta);

        // Turn character towards move heading smoothly
        const targetHeading = Math.atan2(moveDir.x, moveDir.z);
        // Smooth interpolation of angle
        let diff = targetHeading - game.playerHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        game.playerHeading += diff * 12 * delta;
        player.rotation.y = game.playerHeading;

        // Quadruped walk swing animation (front-left / back-right swing in phase, front-right / back-left opposite)
        const animFreq = keys.shift ? 12 : 7;
        const swing = Math.sin(time * animFreq) * 0.55;
        
        legFL.rotation.x = swing;
        legBR.rotation.x = swing;
        legFR.rotation.x = -swing;
        legBL.rotation.x = -swing;
        
        // Happy rapid tail wagging when walking
        tailGroup.rotation.y = Math.sin(time * animFreq * 1.5) * 0.35;
        tailGroup.rotation.x = -Math.PI / 4 + Math.sin(time * animFreq) * 0.1;

        // Small body bounce
        bodyGroup.position.y = 0.5 + Math.abs(Math.sin(time * animFreq)) * 0.06;
        headGroup.position.y = 0.95 + Math.sin(time * animFreq) * 0.03;
      } else {
        // Idle animation: resting legs, happy gentle tail wag, slow breathing, head tilt
        legFL.rotation.x = 0;
        legFR.rotation.x = 0;
        legBL.rotation.x = 0;
        legBR.rotation.x = 0;
        
        // Gentle happy tail wag
        tailGroup.rotation.y = Math.sin(time * 2) * 0.2;
        tailGroup.rotation.x = -Math.PI / 4 + Math.sin(time * 0.5) * 0.05;
        
        bodyGroup.position.y = 0.5 + Math.sin(time * 1.5) * 0.012;
        headGroup.position.y = 0.95 + Math.sin(time * 1.5) * 0.008;
        headGroup.rotation.z = Math.sin(time * 0.8) * 0.04;
      }

      // --- COLLISIONS AND LIMITS ---
      // Check boundaries - don't let player walk off the edge of the world map (limit at radius 28)
      const currentRadius = player.position.length();
      if (currentRadius > 27.5) {
        player.position.setLength(27.5);
      }

      // Collisions with key station obstacles (except About Me portal center which allows entering)
      stations.forEach((st) => {
        // Allow player to enter About Me trigger zone cleanly, but others are physical obstacles
        if (st.name !== "about") {
          const dist = player.position.distanceTo(st.position);
          if (dist < 2.0) {
            // Push player out
            const pushDir = new THREE.Vector3().subVectors(player.position, st.position).normalize();
            pushDir.y = 0;
            player.position.addScaledVector(pushDir, 2.0 - dist);
          }
        } else {
          // About temple barrier (prevent walking behind the portal core)
          const dist = player.position.distanceTo(st.position);
          if (dist < 1.8 && player.position.z < st.position.z) {
            player.position.z = st.position.z + 1.8;
          }
        }
      });

      // Simple river crossing physics: if not on bridge, restrict player depth in river unless wading
      // Let's make it so player can easily cross river, but water splashes if inside!
      const riverAngle = Math.PI / 6;
      // Rotated relative position
      const rx = player.position.x * Math.cos(-riverAngle) - player.position.z * Math.sin(-riverAngle);
      const rz = player.position.x * Math.sin(-riverAngle) + player.position.z * Math.cos(-riverAngle);

      // River box centered at (10, 5) with width 4 and length 30
      // Check if character is inside river bounds
      // River X range in rotated frame is around 10
      const isInsideRiverX = Math.abs(rx - 7.5) < 2.0;
      const isInsideRiverZ = Math.abs(rz - 5.5) < 14.0;
      if (isInsideRiverX && isInsideRiverZ) {
        // If not on bridge
        const distToBridge = player.position.distanceTo(new THREE.Vector3(9.5, 0, 4.2));
        if (distToBridge > 2.0) {
          // Inside river wading! Lower Y coordinate to simulate stepping in water
          player.position.y = -0.4;
        } else {
          // On bridge! Elevate Y cleanly
          player.position.y = 0.1;
        }
      } else {
        player.position.y = 0; // standard ground
      }

      // 5. CAMERA ORBIT FOLLOW PLAYER (Lowered slightly to frame the adorable Shih Tzu dog beautifully)
      const radiusCam = 8.5; // distance from player
      const yaw = game.cameraAngleYaw;
      const pitch = game.cameraAnglePitch;

      const camX = player.position.x + radiusCam * Math.cos(yaw) * Math.cos(pitch);
      const camY = player.position.y + radiusCam * Math.sin(pitch) + 0.8;
      const camZ = player.position.z + radiusCam * Math.sin(yaw) * Math.cos(pitch);

      camera.position.set(camX, camY, camZ);
      // Look slightly above the player center of mass
      camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);

      // 6. TRIGGER DETECTIONS (Trigger interaction check)
      let currentActiveStation: string | null = null;
      for (const st of stations) {
        const dist = player.position.distanceTo(st.position);
        if (dist <= st.radius) {
          currentActiveStation = st.name;
          break;
        }
      }
      onNearStation(currentActiveStation);

      // Send update coordinates for Mini-Map rendering
      onPositionUpdate(player.position.x, player.position.z, game.cameraAngleYaw);

      renderer.render(scene, camera);
    };

    tick();

    // --- HANDLE RESIZE ---
    const handleResize = () => {
      if (!containerRef.current || !gameRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || 500;

      gameRef.current.camera.aspect = w / h;
      gameRef.current.camera.updateProjectionMatrix();
      gameRef.current.renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // --- CLEANUP ---
    return () => {
      if (gameRef.current) {
        gameRef.current.isDestroyed = true;
      }
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      renderer.dispose();
    };
  }, [joystickVector]);

  // Handle triggered mobile button or keyboard interaction from parent
  useEffect(() => {
    if (triggerInteraction && gameRef.current) {
      onInteractionTriggered(triggerInteraction);
    }
  }, [triggerInteraction]);

  return (
    <div
      id="3d-viewport-container"
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#bae6fd] cursor-grab active:cursor-grabbing rounded-2xl border border-sky-300/40 shadow-2xl shadow-sky-950/20"
    />
  );
}
