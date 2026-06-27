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
    height = 128,
    isHex = false
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Draw background
    ctx.fillStyle = bgColor;
    if (isHex) {
      ctx.beginPath();
      const size = width / 2;
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + size * 0.9 * Math.cos(angle);
        const y = cy + size * 0.9 * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // Hexagon border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.fillRect(0, 0, width, height);
    }

    // Draw text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${width * 0.3}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP SCENE, CAMERA, RENDERER ---
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || 500;

    const scene = new THREE.Scene();
    // Beautiful skybox blue sky fog
    scene.background = new THREE.Color("#0a0f1d");
    scene.fog = new THREE.FogExp2("#0a0f1d", 0.015);

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
    const ambientLight = new THREE.AmbientLight("#2e3d52", 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#e0f2fe", 1.8);
    sunLight.position.set(30, 40, 20);
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

    // Subtle colored point lights for accents
    const purpleLight = new THREE.PointLight("#c084fc", 4, 15);
    purpleLight.position.set(0, 3, -15);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight("#22d3ee", 4, 15);
    cyanLight.position.set(-15, 3, -5);
    scene.add(cyanLight);

    const greenLight = new THREE.PointLight("#4ade80", 4, 15);
    greenLight.position.set(15, 3, -5);
    scene.add(greenLight);

    const orangeLight = new THREE.PointLight("#fb923c", 4, 15);
    orangeLight.position.set(12, 3, 12);
    scene.add(orangeLight);

    // --- TERRAIN & ENVIRONMENT ---
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // Large main ground plateau (grass)
    const grassGeo = new THREE.CylinderGeometry(26, 28, 2, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: "#1e3a27",
      roughness: 0.9,
      metalness: 0.1,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = -1;
    grassMesh.receiveShadow = true;
    terrainGroup.add(grassMesh);

    // Sand rim around island
    const sandGeo = new THREE.CylinderGeometry(28, 30, 1.8, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: "#c2a67a",
      roughness: 0.95,
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.position.y = -1.1;
    sandMesh.receiveShadow = true;
    terrainGroup.add(sandMesh);

    // Surrounding Ocean Water
    const waterGeo = new THREE.PlaneGeometry(300, 300);
    const waterMat = new THREE.MeshStandardMaterial({
      color: "#034c76",
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -1.5;
    scene.add(waterMesh);

    // --- THE RIVER & WOODEN BRIDGE ---
    // River cut-out box on island
    const riverGeo = new THREE.BoxGeometry(4, 2.1, 30);
    const riverMat = new THREE.MeshStandardMaterial({
      color: "#0575b5",
      roughness: 0.3,
      metalness: 0.6,
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.set(10, -1, 5);
    riverMesh.rotation.y = Math.PI / 6; // Angled slightly
    terrainGroup.add(riverMesh);

    // Wooden Bridge spanning the river
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(9.5, -0.1, 4.2);
    bridgeGroup.rotation.y = Math.PI / 6;

    // Bridge floor planks
    const woodMat = new THREE.MeshStandardMaterial({
      color: "#5c4033",
      roughness: 0.95,
    });
    const bridgeFloor = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.2, 2.8),
      woodMat
    );
    bridgeFloor.receiveShadow = true;
    bridgeFloor.castShadow = true;
    bridgeGroup.add(bridgeFloor);

    // Rails
    const railMat = new THREE.MeshStandardMaterial({
      color: "#3d2b1f",
      roughness: 0.9,
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 0.1), railMat);
    railL.position.set(0, 0.6, 1.4);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 0.1), railMat);
    railR.position.set(0, 0.6, -1.4);
    bridgeGroup.add(railL, railR);

    // Small bridge posts
    for (let i = -2; i <= 2; i += 1) {
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7), railMat);
      postL.position.set(i * 1.2, 0.3, 1.4);
      postL.castShadow = true;
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7), railMat);
      postR.position.set(i * 1.2, 0.3, -1.4);
      postR.castShadow = true;
      bridgeGroup.add(postL, postR);
    }
    terrainGroup.add(bridgeGroup);

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

    // Twin Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.8 });
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), pillarMat);
    pillarL.position.set(-2, 1.7, 0);
    pillarL.castShadow = true;

    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), pillarMat);
    pillarR.position.set(2, 1.7, 0);
    pillarR.castShadow = true;

    // Portal arch header
    const archHeader = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.5, 1.2),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.8 })
    );
    archHeader.position.set(0, 3.45, 0);
    archHeader.castShadow = true;

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
    aboutGroup.add(pillarL, pillarR, archHeader, portalCore);

    // Float About Me Billboard
    const aboutBillboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: createTextTexture("ABOUT ME", "#a855f7", "#ffffff", 256, 128),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    aboutBillboard.position.set(0, 4.4, 0.1);
    aboutGroup.add(aboutBillboard);

    scene.add(aboutGroup);

    // 2. PROJECTS Terminal at (-15, 0, -5)
    const projGroup = new THREE.Group();
    projGroup.position.set(-15, 0, -5);

    // Terminal Base pedestal
    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.3, 2.5),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8 })
    );
    pedestal.position.y = 0.15;
    pedestal.receiveShadow = true;
    projGroup.add(pedestal);

    const pillarCenter = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.7 })
    );
    pillarCenter.position.set(0, 0.8, 0);
    pillarCenter.castShadow = true;
    projGroup.add(pillarCenter);

    // Big neon screen
    const displayScreen = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.8, 0.2),
      new THREE.MeshStandardMaterial({
        color: "#0f172a",
        roughness: 0.1,
      })
    );
    displayScreen.position.set(0, 2.0, 0);
    displayScreen.rotation.x = -Math.PI / 12; // tilted up
    displayScreen.castShadow = true;
    projGroup.add(displayScreen);

    // Screen display core (glowing cyan interface)
    const screenCore = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.6),
      new THREE.MeshBasicMaterial({
        map: createTextTexture("PROJECTS\nCONSOLE", "#06b6d4", "#ffffff", 512, 256),
        side: THREE.DoubleSide,
      })
    );
    screenCore.position.set(0, 2.02, 0.11);
    screenCore.rotation.x = -Math.PI / 12;
    projGroup.add(screenCore);

    // Floater Title
    const projBillboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: createTextTexture("PROJECTS", "#06b6d4", "#ffffff", 256, 128),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    projBillboard.position.set(0, 3.4, 0.1);
    projGroup.add(projBillboard);

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

    // Pillars (Archway)
    const archL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), pillarMat);
    archL.position.set(-1.6, 1.6, 0);
    archL.castShadow = true;
    const archR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), pillarMat);
    archR.position.set(1.6, 1.6, 0);
    archR.castShadow = true;
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 0.8), pillarMat);
    archTop.position.set(0, 3.2, 0);
    archTop.castShadow = true;
    skillsGroup.add(archL, archR, archTop);

    // Rotating skills hexagons in the center of arch
    const hexGroup = new THREE.Group();
    hexGroup.position.set(0, 1.6, 0);

    const skillsNames = ["JS", "TS", "React", "Node", "MDB", "FS"];
    const skillHexMeshes: THREE.Mesh[] = [];
    skillsNames.forEach((name, idx) => {
      // Create Hexagon shapes
      const hexGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 6);
      const hexTex = createTextTexture(name, "#10b981", "#ffffff", 128, 128, true);
      const hexMat = new THREE.MeshBasicMaterial({ map: hexTex });
      const hexMesh = new THREE.Mesh(hexGeo, hexMat);

      // Distribute in circle
      const angle = (idx / skillsNames.length) * Math.PI * 2;
      hexMesh.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 0.8, 0);
      hexMesh.rotation.x = Math.PI / 2;
      hexMesh.rotation.y = Math.random() * Math.PI;
      hexGroup.add(hexMesh);
      skillHexMeshes.push(hexMesh);
    });
    skillsGroup.add(hexGroup);

    // Floater Title
    const skillsBillboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: createTextTexture("SKILLS", "#10b981", "#ffffff", 256, 128),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    skillsBillboard.position.set(0, 3.9, 0.1);
    skillsGroup.add(skillsBillboard);

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

    // Walls (Cozy Brown Wood)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.2, 3.6),
      new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.9 })
    );
    walls.position.y = 1.25;
    walls.castShadow = true;
    cabinGroup.add(walls);

    // Roof (Dark grey triangular prism)
    const roofGeo = new THREE.ConeGeometry(3.2, 1.6, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.85, flatShading: true });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 3.0, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    cabinGroup.add(roof);

    // Little door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.6, 0.1),
      new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 })
    );
    door.position.set(0, 0.95, 1.81);
    cabinGroup.add(door);

    // Window on left
    const windowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: "#fef08a", emissive: "#fef08a", emissiveIntensity: 0.6 })
    );
    windowMesh.position.set(-1.2, 1.4, 1.81);
    cabinGroup.add(windowMesh);

    // Signboard "Let's work together!"
    const boardTex = createTextTexture("Let's work together!", "#f97316", "#ffffff", 256, 128);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.9),
      new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide })
    );
    board.position.set(1.4, 1.3, 1.81);
    cabinGroup.add(board);

    // Floater Title
    const contactBillboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: createTextTexture("CONTACT", "#f97316", "#ffffff", 256, 128),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    contactBillboard.position.set(0, 4.0, 0.1);
    cabinGroup.add(contactBillboard);

    scene.add(cabinGroup);

    // --- PLAYABLE PLAYER AVATAR ---
    const player = new THREE.Group();
    player.position.set(0, 0, 0);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({ color: "#fbcfe8", roughness: 0.6 }) // light skin tone
    );
    head.position.y = 1.65;
    head.castShadow = true;
    player.add(head);

    // Stylized Dark Hair
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.25, 0.72),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 })
    );
    hair.position.set(0, 1.8, 0.05);
    player.add(hair);

    const hairTuft = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.3),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 })
    );
    hairTuft.position.set(0, 1.85, 0.3);
    player.add(hairTuft);

    // Torso (Hoodie with "MS" canvas texture on the back)
    const hoodieTex = createTextTexture("MS", "#0f172a", "#a855f7", 128, 128);
    // Let's create materials array so the MS texture is mapped on the back face!
    // Cylinders take 3 materials (side, top, bottom).
    // Let's make it simple: build a hoodie box or cylindrical trunk with a specific material.
    // Let's use a nice dark grey box representing the hoodie!
    const bodyMaterials = [
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 }), // right
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 }), // left
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 }), // top
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 }), // bottom
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.8 }), // front
      new THREE.MeshStandardMaterial({ map: hoodieTex, roughness: 0.8 }),   // back with "MS"
    ];

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), bodyMaterials);
    body.position.y = 1.05;
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    // Limbs (Legs and Arms)
    const limbMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.9 });
    const handMat = new THREE.MeshStandardMaterial({ color: "#fbcfe8" });

    // Left Leg
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), limbMat);
    legL.position.set(-0.25, 0.3, 0);
    legL.castShadow = true;

    // Right Leg
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), limbMat);
    legR.position.set(0.25, 0.3, 0);
    legR.castShadow = true;

    player.add(legL, legR);

    // Left Arm
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), limbMat);
    armL.position.set(-0.5, 1.1, 0);
    armL.castShadow = true;

    // Right Arm
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), limbMat);
    armR.position.set(0.5, 1.1, 0);
    armR.castShadow = true;

    player.add(armL, armR);

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

      // 1. ANIME WATER WAVE
      waterMesh.position.y = -1.5 + Math.sin(time * 1.5) * 0.05;

      // 2. ANIME SKILLS HEXAGONS
      hexGroup.rotation.y = time * 0.4;
      skillHexMeshes.forEach((mesh, idx) => {
        mesh.rotation.x = Math.PI / 2 + Math.sin(time * 2 + idx) * 0.15;
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

        // Limb swing animation based on walking frequency
        const animFreq = keys.shift ? 12 : 7;
        const swing = Math.sin(time * animFreq) * 0.45;
        legL.rotation.x = swing;
        legR.rotation.x = -swing;
        armL.rotation.x = -swing * 0.8;
        armR.rotation.x = swing * 0.8;

        // Small body bounce
        body.position.y = 1.05 + Math.abs(Math.sin(time * animFreq)) * 0.05;
      } else {
        // Idle animation: breathing and slight head tilt
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        armL.rotation.x = Math.sin(time * 2) * 0.05;
        armR.rotation.x = -Math.sin(time * 2) * 0.05;
        body.position.y = 1.05 + Math.sin(time * 1.5) * 0.015;
        head.rotation.z = Math.sin(time * 0.5) * 0.02;
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

      // 5. CAMERA ORBIT FOLLOW PLAYER
      const radiusCam = 8.5; // distance from player
      const yaw = game.cameraAngleYaw;
      const pitch = game.cameraAnglePitch;

      const camX = player.position.x + radiusCam * Math.cos(yaw) * Math.cos(pitch);
      const camY = player.position.y + radiusCam * Math.sin(pitch) + 1.2;
      const camZ = player.position.z + radiusCam * Math.sin(yaw) * Math.cos(pitch);

      camera.position.set(camX, camY, camZ);
      // Look slightly above the player head
      camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);

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
      className="w-full h-full relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950"
    />
  );
}
