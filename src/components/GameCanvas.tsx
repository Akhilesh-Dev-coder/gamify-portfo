import React, { useEffect, useRef } from "react";
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
    clock: THREE.Clock;
    isDestroyed: boolean;
    teleportTarget: THREE.Vector3 | null;
  } | null>(null);

  // Helper: Create a dynamic grid-like or holographic texture
  const createHoloTexture = (color: string, width = 512, height = 256) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#111827";
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

    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    const cx = width / 2;
    const cy = height / 2;
    
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(width * 0.1, 50, 100, 10);
    ctx.fillRect(width * 0.1, 80, 80, 10);
    ctx.fillRect(width * 0.1, 110, 90, 10);
    ctx.fillRect(width * 0.7, 50, 100, 10);
    ctx.fillRect(width * 0.7, 80, 110, 10);
    ctx.fillRect(width * 0.7, 110, 70, 10);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP SCENE, CAMERA, RENDERER ---
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bae6fd"); // Light blue garden sky
    scene.fog = new THREE.FogExp2("#fef08a", 0.015); // Golden sunlight mist

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight("#fef08a", 1.2); // Warm daytime ambient
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#fffbeb", 2.2); // Golden sun
    sunLight.position.set(-30, 45, -20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 45;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Colored accent point lights
    const cyanLight = new THREE.PointLight("#10b981", 1.5, 12);
    cyanLight.position.set(-15, 2, -4);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight("#059669", 1.5, 12);
    emeraldLight.position.set(15, 2, -4);
    scene.add(emeraldLight);

    const purpleLight = new THREE.PointLight("#c084fc", 1.5, 12);
    purpleLight.position.set(0, 2, -14);
    scene.add(purpleLight);

    // Material definitions for high-fidelity assets
    const goldMat = new THREE.MeshStandardMaterial({
      color: "#fbbf24",
      roughness: 0.1,
      metalness: 0.9,
    });
    
    const stoneTableMat = new THREE.MeshStandardMaterial({
      color: "#57534e", // Slate stone pylon
      roughness: 0.9,
      metalness: 0.1,
    });

    const projHoloMat = new THREE.MeshBasicMaterial({
      map: createHoloTexture("#10b981", 256, 128),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });

    const frontendCrystalMat = new THREE.MeshStandardMaterial({
      color: "#34d399",
      emissive: "#059669",
      emissiveIntensity: 1.8,
    });
    const backendCrystalMat = new THREE.MeshStandardMaterial({
      color: "#10b981",
      emissive: "#047857",
      emissiveIntensity: 1.8,
    });
    const databaseCrystalMat = new THREE.MeshStandardMaterial({
      color: "#a855f7",
      emissive: "#7e22ce",
      emissiveIntensity: 1.8,
    });

    const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
    const skillsCount = 8;

    // --- SLOW-DRIFTING SAKURA BLOSSOM PETALS ---
    const leafCount = 280;
    const leafGroup = new THREE.Group();
    scene.add(leafGroup);

    // Soft Japanese sakura pink tones
    const sakuraPink1 = new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.6, side: THREE.DoubleSide }); 
    const sakuraPink2 = new THREE.MeshStandardMaterial({ color: "#fda4af", roughness: 0.5, side: THREE.DoubleSide }); 
    const sakuraPink3 = new THREE.MeshStandardMaterial({ color: "#ec4899", roughness: 0.5, side: THREE.DoubleSide }); 

    const leaves: THREE.Mesh[] = [];
    const leafGeo = new THREE.BoxGeometry(0.055, 0.007, 0.115);

    for (let i = 0; i < leafCount; i++) {
      const rand = Math.random();
      const mat = rand < 0.4 ? sakuraPink1 : rand < 0.75 ? sakuraPink2 : sakuraPink3;
      const mesh = new THREE.Mesh(leafGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 110,
        5 + Math.random() * 25,
        (Math.random() - 0.5) * 110
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        speedY: 0.55 + Math.random() * 0.95, // slow drifting feel
        speedRot: 0.25 + Math.random() * 0.85,
        waveOffset: Math.random() * Math.PI * 2
      };
      leafGroup.add(mesh);
      leaves.push(mesh);
    }

    // --- CONTINUOUS PARK MEADOW GROUND & BOUNDARY WALL ---
    const parkGroup = new THREE.Group();
    scene.add(parkGroup);

    const parkRadius = 25.0;

    // Grass terrain circular mesh (Clear floor, no path stripes)
    const grassGeo = new THREE.CylinderGeometry(parkRadius, parkRadius + 0.5, 0.6, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: "#166534", // Lush grass green
      roughness: 0.95,
      metalness: 0.05
    });
    const grassFloor = new THREE.Mesh(grassGeo, grassMat);
    grassFloor.position.y = -0.3;
    grassFloor.receiveShadow = true;
    parkGroup.add(grassFloor);

    // Bounding stone wall
    const wallStoneMat = new THREE.MeshStandardMaterial({
      color: "#78716c", // Stone gray
      roughness: 0.9,
      metalness: 0.1
    });
    const wall = new THREE.Mesh(new THREE.TorusGeometry(parkRadius, 0.15, 8, 48), wallStoneMat);
    wall.rotation.x = Math.PI / 2;
    wall.position.y = 0.05;
    parkGroup.add(wall);

    // Decorative shrubs and stones along perimeter wall
    const boundaryClumps = 48;
    const perimeterRockGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const perimeterBushGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const perimeterBushMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 });
    for (let i = 0; i < boundaryClumps; i++) {
      const angle = (i / boundaryClumps) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const dist = parkRadius - 0.3;
      const ox = Math.cos(angle) * dist;
      const oz = Math.sin(angle) * dist;

      if (Math.random() > 0.5) {
        const rock = new THREE.Mesh(perimeterRockGeo, wallStoneMat);
        rock.position.set(ox, 0.05, oz);
        rock.scale.set(0.8 + Math.random() * 0.8, 0.6 + Math.random() * 1.0, 0.8 + Math.random() * 0.6);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        parkGroup.add(rock);
      } else {
        const bush = new THREE.Mesh(perimeterBushGeo, perimeterBushMat);
        bush.position.set(ox, 0.15, oz);
        bush.scale.set(1.1 + Math.random() * 0.4, 0.7 + Math.random() * 0.4, 1.1 + Math.random() * 0.4);
        parkGroup.add(bush);
      }
    }

    // --- STYLIZED SAKURA TREES (CHERRY BLOSSOMS) ---
    const createSakuraTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Curved organic trunk (wood color)
      const trunkMat = new THREE.MeshStandardMaterial({ color: "#5c4033", roughness: 0.9 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 1.8 * scale, 8), trunkMat);
      trunk.position.y = 0.9 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      // Sprouting branches
      const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.85 * scale, 6), trunkMat);
      branch1.position.set(0.24 * scale, 1.45 * scale, 0.1 * scale);
      branch1.rotation.z = -0.45;
      branch1.castShadow = true;
      tree.add(branch1);

      const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.85 * scale, 6), trunkMat);
      branch2.position.set(-0.24 * scale, 1.45 * scale, -0.1 * scale);
      branch2.rotation.z = 0.45;
      branch2.castShadow = true;
      tree.add(branch2);

      // Cherry blossom flower clusters (spheres of distinct pink tones)
      const pinkMat1 = new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.95 }); // Soft pink
      const pinkMat2 = new THREE.MeshStandardMaterial({ color: "#fda4af", roughness: 0.95 }); // Light pink
      const pinkMat3 = new THREE.MeshStandardMaterial({ color: "#ec4899", roughness: 0.95 }); // Vibrant rose pink

      const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.72 * scale, 8, 8), pinkMat1);
      f1.position.set(0, 1.95 * scale, 0);
      f1.castShadow = true;

      const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.56 * scale, 8, 8), pinkMat2);
      f2.position.set(0.42 * scale, 2.15 * scale, 0.2 * scale);
      f2.castShadow = true;

      const f3 = new THREE.Mesh(new THREE.SphereGeometry(0.56 * scale, 8, 8), pinkMat3);
      f3.position.set(-0.42 * scale, 2.15 * scale, -0.2 * scale);
      f3.castShadow = true;

      const f4 = new THREE.Mesh(new THREE.SphereGeometry(0.46 * scale, 6, 6), pinkMat2);
      f4.position.set(0.1 * scale, 2.35 * scale, -0.4 * scale);
      f4.castShadow = true;

      tree.add(f1, f2, f3, f4);
      parkGroup.add(tree);
    };

    // Instantiate 6 Sakura Trees framing the Shrines
    createSakuraTree(-4.5, -10.5, 1.15); // Frame Shrine of Wisdom left
    createSakuraTree(4.5, -10.5, 1.15);  // Frame Shrine of Wisdom right
    createSakuraTree(-18.5, -8.0, 1.2);  // Near Shrine of Creation
    createSakuraTree(18.5, -8.0, 1.2);   // Near Shrine of Masteries
    createSakuraTree(-5.0, 10.5, 1.1);   // Frame Shrine of Connections left
    createSakuraTree(5.0, 10.5, 1.1);    // Frame Shrine of Connections right

    // --- INTERACTIVE ELEMENTS POOL ---
    const animRefs = {
      // Spawn (Origins)
      spawnPrism: null as THREE.Mesh | null,
      spawnLanterns: [] as THREE.Mesh[],
      // About Me (Wisdom)
      aboutCrest: null as THREE.Group | null,
      aboutLeaves: [] as THREE.Mesh[],
      // Projects (Creation)
      projectsSunCore: null as THREE.Mesh | null,
      projectsObelisks: [] as THREE.Group[],
      projectsScreens: [] as THREE.Mesh[],
      // Skills (Masteries)
      skillsCrystals: [] as THREE.Mesh[],
      skillsCentralMonolith: null as THREE.Mesh | null,
      // Contact (Connections)
      contactHoloEnvelope: null as THREE.Mesh | null,
      contactLanterns: [] as THREE.Mesh[],
    };

    const stoneMat = new THREE.MeshStandardMaterial({ color: "#8c8782", roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.85 });
    const lanternGlowMat = new THREE.MeshStandardMaterial({ color: "#fef08a", emissive: "#eab308", emissiveIntensity: 2.2 });

    // 1. Shrine of Origins (Spawn Hub - Center `(0, 0, 0)`)
    const originsShrine = new THREE.Group();
    originsShrine.position.set(0, 0, 0);
    parkGroup.add(originsShrine);

    // Stone base ring
    const originsPaving = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.08, 16), stoneMat);
    originsPaving.position.y = 0.04;
    originsPaving.receiveShadow = true;
    originsShrine.add(originsPaving);

    // Twin stone arch pillars
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), stoneMat);
    pillarL.position.set(-0.65, 0.9, 0);
    pillarL.castShadow = true;
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), stoneMat);
    pillarR.position.set(0.65, 0.9, 0);
    pillarR.castShadow = true;
    originsShrine.add(pillarL, pillarR);

    // Wooden lintel bar on top
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), woodMat);
    crossbar.position.set(0, 1.8, 0);
    crossbar.castShadow = true;
    originsShrine.add(crossbar);

    // Two hanging lanterns
    const createHangingLantern = (x: number, y: number, z: number) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(x, y, z);

      // String line
      const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), woodMat);
      stringMesh.position.y = -0.08;
      lanternGroup.add(stringMesh);

      // Glowing body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8), lanternGlowMat);
      body.position.y = -0.235;
      lanternGroup.add(body);

      // Light
      const pLight = new THREE.PointLight("#fef08a", 0.7, 4.0);
      pLight.position.set(0, -0.235, 0);
      lanternGroup.add(pLight);

      originsShrine.add(lanternGroup);
      return body;
    };
    const originsLanL = createHangingLantern(-0.45, 1.8, 0);
    const originsLanR = createHangingLantern(0.45, 1.8, 0);
    animRefs.spawnLanterns.push(originsLanL, originsLanR);

    // Central floating Star Prism
    const spawnPrism = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), goldMat);
    spawnPrism.position.set(0, 1.15, 0);
    spawnPrism.castShadow = true;
    originsShrine.add(spawnPrism);
    animRefs.spawnPrism = spawnPrism;

    // 2. Shrine of Wisdom (Biography / About - North `(0, 0, -14)`)
    const wisdomShrine = new THREE.Group();
    wisdomShrine.position.set(0, 0, -14);
    parkGroup.add(wisdomShrine);

    // Circular stone base
    const wisdomPaving = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.65, 0.08, 16), stoneMat);
    wisdomPaving.position.y = 0.04;
    wisdomPaving.receiveShadow = true;
    wisdomShrine.add(wisdomPaving);

    // Overgrown stone-arch gate (Torii-style columns)
    const wisdomColL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), stoneMat);
    wisdomColL.position.set(-0.9, 1.1, 0);
    wisdomColL.castShadow = true;
    const wisdomColR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), stoneMat);
    wisdomColR.position.set(0.9, 1.1, 0);
    wisdomColR.castShadow = true;
    wisdomShrine.add(wisdomColL, wisdomColR);

    const wisdomArchTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.2), stoneMat);
    wisdomArchTop.position.set(0, 2.2, 0);
    wisdomArchTop.castShadow = true;
    wisdomShrine.add(wisdomArchTop);

    // Creeping ivy leaves around pillars
    for (let i = 0; i < 10; i++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.95 })
      );
      const isLeft = i < 5;
      const px = isLeft ? -0.9 : 0.9;
      const py = 0.3 + (i % 5) * 0.4;
      leaf.position.set(px + (Math.random() - 0.5) * 0.1, py, (Math.random() - 0.5) * 0.1);
      leaf.scale.set(1.4, 0.8, 0.6);
      wisdomShrine.add(leaf);
    }

    // Central Stone Pedestal
    const stoneTable = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.7, 8), stoneMat);
    stoneTable.position.set(0, 0.35, 0);
    stoneTable.castShadow = true;
    wisdomShrine.add(stoneTable);

    // Floating Golden Crest bobbing/spinning
    const crestObj = new THREE.Group();
    crestObj.position.set(0, 1.2, 0);
    const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
    const starOuter = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.015, 6, 24), goldMat);
    starOuter.rotation.x = Math.PI / 2;
    crestObj.add(starCore, starOuter);
    wisdomShrine.add(crestObj);
    animRefs.aboutCrest = crestObj;

    // 3. Shrine of Creation (Projects - West `(-15, 0, -4)`)
    const creationShrine = new THREE.Group();
    creationShrine.position.set(-15, 0, -4);
    parkGroup.add(creationShrine);

    // Central stone obelisk
    const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.8, 8), stoneMat);
    centerPillar.position.y = 0.9;
    centerPillar.receiveShadow = true;
    centerPillar.castShadow = true;
    creationShrine.add(centerPillar);

    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 12),
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#d97706",
        emissiveIntensity: 2.0,
      })
    );
    sunCore.position.y = 1.95;
    creationShrine.add(sunCore);
    animRefs.projectsSunCore = sunCore;

    // 4 Project Pedestals framing the center
    const pedestalPositions = [
      { x: -17.6, z: -6.6 },
      { x: -12.4, z: -6.6 },
      { x: -12.4, z: -1.4 },
      { x: -17.6, z: -1.4 }
    ];

    pedestalPositions.forEach((pos, idx) => {
      const pedestal = new THREE.Group();
      pedestal.position.set(pos.x, 0, pos.z);

      // Stone Pedestal Stand
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), stoneMat);
      stand.position.y = 0.425;
      stand.castShadow = true;
      stand.receiveShadow = true;
      pedestal.add(stand);

      // Embedded Holographic project screen above pedestal
      const screenHolo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.12, 0.66),
        projHoloMat
      );
      screenHolo.position.set(0, 1.25, 0.02);
      pedestal.add(screenHolo);
      animRefs.projectsScreens.push(screenHolo);

      // Frame bars holding hologram
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.66, 0.02), stoneMat);
      frameL.position.set(-0.57, 1.25, 0.02);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.66, 0.02), stoneMat);
      frameR.position.set(0.57, 1.25, 0.02);
      pedestal.add(frameL, frameR);

      // Golden base collar
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), goldMat);
      collar.position.y = 0.85;
      pedestal.add(collar);

      parkGroup.add(pedestal);
      animRefs.projectsObelisks.push(pedestal);
    });

    // 4. Shrine of Masteries (Skills - East `(15, 0, -4)`)
    const masteriesShrine = new THREE.Group();
    masteriesShrine.position.set(15, 0, -4);
    parkGroup.add(masteriesShrine);

    // Central ancient rune obelisk
    const stoneMonolith = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.8, 0.45),
      stoneMat
    );
    stoneMonolith.position.y = 0.9;
    stoneMonolith.receiveShadow = true;
    stoneMonolith.castShadow = true;
    masteriesShrine.add(stoneMonolith);

    const runeMat = new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#10b981", emissiveIntensity: 2.2 });
    const runePlate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.04), runeMat);
    runePlate.position.set(0, 0.9, 0.23);
    masteriesShrine.add(runePlate);
    animRefs.skillsCentralMonolith = runePlate;

    // 8 Standing Monoliths in a circle (mini Stonehenge)
    for (let idx = 0; idx < skillsCount; idx++) {
      const angle = (idx / skillsCount) * Math.PI * 2;
      const sx = 15 + Math.cos(angle) * 2.3;
      const sz = -4 + Math.sin(angle) * 2.3;

      const monoGroup = new THREE.Group();
      monoGroup.position.set(sx, 0, sz);
      monoGroup.rotation.y = -angle; // face towards center

      // Standing Stone monolith
      const monolith = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.25, 0.24), stoneMat);
      monolith.position.y = 0.625;
      monolith.castShadow = true;
      monolith.receiveShadow = true;
      monoGroup.add(monolith);

      // Ivy leaves on monolith
      for (let j = 0; j < 3; j++) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 4, 4),
          new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.95 })
        );
        leaf.position.set((Math.random() - 0.5) * 0.15, 0.2 + j * 0.35, 0.135);
        monoGroup.add(leaf);
      }

      // Floating skill crystal in front of monolith
      const cMat = idx < 4 ? frontendCrystalMat : idx < 6 ? backendCrystalMat : databaseCrystalMat;
      const crystal = new THREE.Mesh(crystalGeo, cMat);
      crystal.position.set(0, 1.35, 0.08);
      crystal.castShadow = true;
      monoGroup.add(crystal);
      animRefs.skillsCrystals.push(crystal);

      // Light from crystal
      const pLight = new THREE.PointLight(cMat.color, 1.2, 3.0);
      pLight.position.set(0, 1.35, 0.08);
      monoGroup.add(pLight);

      parkGroup.add(monoGroup);
    }

    // 5. Shrine of Connections (Contact Observatory - South `(0, 0, 14)`)
    const connectionsShrine = new THREE.Group();
    connectionsShrine.position.set(0, 0, 14);
    parkGroup.add(connectionsShrine);

    // Circular base with wood inlay
    const connectionsBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.85, 0.1, 16), stoneMat);
    connectionsBase.position.y = 0.05;
    connectionsBase.receiveShadow = true;
    connectionsBase.castShadow = true;
    connectionsShrine.add(connectionsBase);

    const connectionsWood = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.02, 16), woodMat);
    connectionsWood.position.y = 0.11;
    connectionsWood.receiveShadow = true;
    connectionsShrine.add(connectionsWood);

    // Wooden shrine arch columns
    const conColL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), woodMat);
    conColL.position.set(-0.7, 0.9, 0);
    conColL.castShadow = true;
    const conColR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), woodMat);
    conColR.position.set(0.7, 0.9, 0);
    conColR.castShadow = true;
    connectionsShrine.add(conColL, conColR);

    // Wooden crossbar
    const conCrossbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), woodMat);
    conCrossbar.position.set(0, 1.8, 0);
    conCrossbar.castShadow = true;
    connectionsShrine.add(conCrossbar);

    // Two hanging lanterns casting yellow light
    const createLocalLantern = (x: number, y: number, z: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), woodMat);
      str.position.y = -0.08;
      grp.add(str);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 8), lanternGlowMat);
      body.position.y = -0.235;
      grp.add(body);
      const pLight = new THREE.PointLight("#fef08a", 0.7, 4.0);
      pLight.position.set(0, -0.235, 0);
      grp.add(pLight);
      connectionsShrine.add(grp);
      return body;
    };
    const cLanL = createLocalLantern(-0.48, 1.8, 0);
    const cLanR = createLocalLantern(0.48, 1.8, 0);
    animRefs.contactLanterns.push(cLanL, cLanR);

    // Central Stone Podium
    const conPodium = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.8, 8), stoneMat);
    conPodium.position.set(0, 0.4, 0);
    conPodium.castShadow = true;
    connectionsShrine.add(conPodium);

    // Spinning hologram guestbook envelope
    const mailEnvelope = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.12, 0.01),
      new THREE.MeshStandardMaterial({
        color: "#34d399",
        emissive: "#059669",
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.85
      })
    );
    mailEnvelope.position.set(0, 1.15, 0);
    connectionsShrine.add(mailEnvelope);
    animRefs.contactHoloEnvelope = mailEnvelope;

    // --- SPAWNING PARTICLE EFFECTS POOL ---
    const poolSize = 60;
    const particles: THREE.Mesh[] = [];
    const pMat = new THREE.MeshBasicMaterial({
      color: "#10b981",
      transparent: true,
      opacity: 0.85
    });
    const pGeo = new THREE.SphereGeometry(0.07, 4, 4);
    for (let i = 0; i < poolSize; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.visible = false;
      scene.add(p);
      particles.push(p);
    }
    let pIndex = 0;

    const spawnParticle = (pos: THREE.Vector3, velocity: THREE.Vector3, colorStr = "#10b981", life = 1.0) => {
      const p = particles[pIndex];
      p.position.copy(pos);
      p.userData = { vel: velocity.clone(), maxLife: life, life };
      (p.material as THREE.MeshBasicMaterial).color.set(colorStr);
      p.visible = true;
      p.scale.setScalar(1.0);
      pIndex = (pIndex + 1) % poolSize;
    };

    const triggerLandingParticles = (pos: THREE.Vector3) => {
      for (let i = 0; i < 20; i++) {
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 2.0,
          (Math.random() - 0.5) * 4
        );
        spawnParticle(pos, vel, "#10b981", 0.6 + Math.random() * 0.4);
      }
    };

    // --- PLAYABLE PLAYER AVATAR (STYLIZED SHIH TZU DOG WITH RICH CARAMEL FUR & WHITE SOCKS) ---
    const player = new THREE.Group();
    player.position.set(0, 0, 0);

    const brownMat = new THREE.MeshStandardMaterial({ color: "#8c7258", roughness: 0.85 }); 
    const whiteMat = new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.9 });  
    const blackMat = new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.95 }); 
    const tongueMat = new THREE.MeshStandardMaterial({ color: "#fb7185", roughness: 0.7 }); 
    const eyeHighlightMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1, emissive: "#ffffff", emissiveIntensity: 0.5 });
    const collarMat = new THREE.MeshStandardMaterial({ color: "#b22222", roughness: 0.6 }); 
    const buckleMat = new THREE.MeshStandardMaterial({ color: "#d1d5db", metalness: 0.95, roughness: 0.1 }); 

    // Dog Body
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 0.45, 0);
    
    const dogBody = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.82, 12), brownMat);
    dogBody.rotation.x = Math.PI / 2; 
    dogBody.castShadow = true;
    dogBody.receiveShadow = true;
    bodyGroup.add(dogBody);

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

    const chestPatch1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), whiteMat);
    chestPatch1.position.set(0, 0.08, 0.33);
    chestPatch1.scale.set(0.95, 1.1, 0.85);
    bodyGroup.add(chestPatch1);

    const chestPatch2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), whiteMat);
    chestPatch2.position.set(0, -0.12, 0.28);
    chestPatch2.scale.set(0.85, 0.95, 0.8);
    bodyGroup.add(chestPatch2);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.32, 12), brownMat);
    neckMesh.position.set(0, 0.29, 0.23);
    neckMesh.rotation.x = Math.PI / 6;
    neckMesh.castShadow = true;
    bodyGroup.add(neckMesh);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.08, 12), collarMat);
    collar.position.set(0, 0.32, 0.25);
    collar.rotation.x = Math.PI / 6;
    collar.castShadow = true;
    bodyGroup.add(collar);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.04), buckleMat);
    buckle.position.set(0, 0.32, 0.37);
    buckle.rotation.x = Math.PI / 6;
    bodyGroup.add(buckle);
    player.add(bodyGroup);

    // Dog Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.92, 0.4); 

    const dogHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), brownMat);
    dogHead.castShadow = true;
    headGroup.add(dogHead);

    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), brownMat);
    topknot.position.set(0, 0.2, -0.05);
    topknot.scale.set(1.15, 0.85, 1);
    headGroup.add(topknot);

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), brownMat);
    cheekL.position.set(-0.21, -0.08, 0.12);
    cheekL.scale.set(1.0, 1.35, 1.05);
    headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), brownMat);
    cheekR.position.set(0.21, -0.08, 0.12);
    cheekR.scale.set(1.0, 1.35, 1.05);
    headGroup.add(cheekR);

    const blaze1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), whiteMat);
    blaze1.position.set(0, 0.08, 0.29);
    blaze1.scale.set(0.9, 1.6, 0.8);
    headGroup.add(blaze1);

    const blaze2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), whiteMat);
    blaze2.position.set(0, 0.22, 0.22);
    blaze2.scale.set(1, 1, 0.9);
    headGroup.add(blaze2);

    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.22), blackMat);
    earL.position.set(-0.32, -0.12, -0.02);
    earL.rotation.z = Math.PI / 15;
    earL.castShadow = true;

    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.22), blackMat);
    earR.position.set(0.32, -0.12, -0.02);
    earR.rotation.z = -Math.PI / 15;
    earR.castShadow = true;

    const earDrapeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), blackMat);
    earDrapeL.position.set(0, -0.22, 0.02);
    earDrapeL.scale.set(1.15, 1.5, 1.15);
    earL.add(earDrapeL);

    const earDrapeR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), blackMat);
    earDrapeR.position.set(0, -0.22, 0.02);
    earDrapeR.scale.set(1.15, 1.5, 1.15);
    earR.add(earDrapeR);
    headGroup.add(earL, earR);

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

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.055, 0.065), blackMat);
    nose.position.set(0, -0.015, 0.38);
    headGroup.add(nose);

    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.08), tongueMat);
    tongue.position.set(0, -0.08, 0.32);
    headGroup.add(tongue);

    const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: "#1c0d0d", roughness: 0.9 }));
    mouthCavity.position.set(0, -0.08, 0.3);
    headGroup.add(mouthCavity);

    const lowerJaw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), brownMat);
    lowerJaw.position.set(0, -0.15, 0.3);
    lowerJaw.scale.set(1.1, 0.7, 1.05);
    headGroup.add(lowerJaw);

    const teethMat = new THREE.MeshStandardMaterial({ color: "#f8f9fa", roughness: 0.1 });
    const toothGeo = new THREE.BoxGeometry(0.015, 0.025, 0.015);
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(toothGeo, teethMat);
      tooth.position.set(-0.045 + i * 0.03, -0.07, 0.34 + (i === 1 || i === 2 ? 0.005 : 0));
      headGroup.add(tooth);
    }

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), blackMat);
    eyeL.position.set(-0.13, 0.07, 0.27);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), blackMat);
    eyeR.position.set(0.13, 0.07, 0.27);

    const highlightL = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 6), eyeHighlightMat);
    highlightL.position.set(0.02, 0.02, 0.04);
    eyeL.add(highlightL);
    const highlightR = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 6), eyeHighlightMat);
    highlightR.position.set(0.02, 0.02, 0.04);
    eyeR.add(highlightR);
    headGroup.add(eyeL, eyeR);

    const browL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), brownMat);
    browL.position.set(-0.11, 0.15, 0.27);
    browL.scale.set(1.3, 0.75, 0.9);
    browL.rotation.z = -Math.PI / 10;
    const browR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), brownMat);
    browR.position.set(0.11, 0.15, 0.27);
    browR.scale.set(1.3, 0.75, 0.9);
    browR.rotation.z = Math.PI / 10;
    headGroup.add(browL, browR);

    player.add(headGroup);

    // Legs
    const legFL = new THREE.Group(); legFL.position.set(-0.24, 0.22, 0.26);
    const legFR = new THREE.Group(); legFR.position.set(0.24, 0.22, 0.26);
    const legBL = new THREE.Group(); legBL.position.set(-0.24, 0.22, -0.26);
    const legBR = new THREE.Group(); legBR.position.set(0.24, 0.22, -0.26);

    const makeLegSocks = (grp: THREE.Group) => {
      const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 8), brownMat);
      upperLeg.position.y = 0.1;
      upperLeg.castShadow = true;
      grp.add(upperLeg);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8), whiteMat);
      cuff.position.y = 0.01;
      grp.add(cuff);

      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8), whiteMat);
      lowerLeg.position.y = -0.1;
      lowerLeg.castShadow = true;
      grp.add(lowerLeg);

      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), whiteMat);
      paw.position.set(0, -0.2, 0.04);
      paw.scale.set(1.05, 0.75, 1.3);
      paw.castShadow = true;
      grp.add(paw);
    };
    makeLegSocks(legFL); makeLegSocks(legFR); makeLegSocks(legBL); makeLegSocks(legBR);
    player.add(legFL, legFR, legBL, legBR);

    // Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.65, -0.4);
    const tailPuffs = [
      { x: 0, y: 0.1, z: -0.05, r: 0.1 },
      { x: 0, y: 0.22, z: -0.08, r: 0.11 },
      { x: 0, y: 0.35, z: -0.06, r: 0.12 },
      { x: 0, y: 0.46, z: 0.02, r: 0.13 },
      { x: 0, y: 0.52, z: 0.12, r: 0.12 },
      { x: 0, y: 0.48, z: 0.22, r: 0.1 }
    ];
    tailPuffs.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 8, 8), brownMat);
      puff.position.set(p.x, p.y, p.z);
      puff.castShadow = true;
      tailGroup.add(puff);
    });
    player.add(tailGroup);
    scene.add(player);

    // --- CONTROLS REFS ---
    const keys: Record<string, boolean> = {
      w: false, a: false, s: false, d: false,
      arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
      shift: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse drag view rotation
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
      game.cameraAnglePitch = Math.max(0.1, Math.min(Math.PI / 2.5, game.cameraAnglePitch - deltaY * 0.005));
    };

    const handleMouseUp = () => { isDragging = false; };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Mobile touch look around
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
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
        game.cameraAnglePitch = Math.max(0.1, Math.min(Math.PI / 2.5, game.cameraAnglePitch - deltaY * 0.008));
      }
    };

    renderer.domElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", handleMouseUp);

    const game = {
      scene,
      camera,
      renderer,
      player,
      playerVelocity: new THREE.Vector3(0, 0, 0),
      playerHeading: 0,
      cameraAngleYaw: Math.PI / 2, 
      cameraAnglePitch: Math.PI / 6, 
      keys,
      clock,
      isDestroyed: false,
      teleportTarget: null as THREE.Vector3 | null,
    };
    gameRef.current = game;

    // --- ANIMATION LOOP ---
    const tick = () => {
      if (game.isDestroyed) return;
      requestAnimationFrame(tick);

      const delta = Math.min(clock.getDelta(), 0.1); 
      const time = clock.getElapsedTime();

      // Handle Teleportation trigger from UI
      if (game.teleportTarget) {
        player.position.copy(game.teleportTarget);
        triggerLandingParticles(player.position);
        game.teleportTarget = null;
      }

      // Drift background Sakura petals
      leaves.forEach((l) => {
        l.position.y -= l.userData.speedY * delta;
        l.position.x += Math.sin(time * 0.8 + l.userData.waveOffset) * delta * 0.6;
        l.rotation.x += l.userData.speedRot * delta;
        l.rotation.y += l.userData.speedRot * 0.5 * delta;
        if (l.position.y < -5) {
          l.position.y = 20 + Math.random() * 10;
          l.position.x = (Math.random() - 0.5) * 100;
          l.position.z = (Math.random() - 0.5) * 100;
        }
      });

      // Update custom particle pool
      particles.forEach((p) => {
        if (!p.visible) return;
        p.userData.life -= delta;
        if (p.userData.life <= 0) {
          p.visible = false;
        } else {
          p.position.addScaledVector(p.userData.vel, delta);
          const lifePercent = p.userData.life / p.userData.maxLife;
          p.scale.setScalar(lifePercent);
        }
      });

      // --- ANIMATING HIGH-FIDELITY ASSETS ---
      // 1. Shrine of Origins
      if (animRefs.spawnPrism) {
        animRefs.spawnPrism.rotation.y = time * 1.8;
        animRefs.spawnPrism.rotation.x = time * 0.6;
        animRefs.spawnPrism.position.y = 1.15 + Math.sin(time * 2.5) * 0.08;
      }
      animRefs.spawnLanterns.forEach((lan, idx) => {
        lan.rotation.y = time * 1.5;
        lan.position.y = -0.235 + Math.sin(time * 2.5 + idx) * 0.02;
      });

      // 2. Shrine of Wisdom
      if (animRefs.aboutCrest) {
        animRefs.aboutCrest.rotation.y = time * 1.5;
        animRefs.aboutCrest.position.y = 1.2 + Math.sin(time * 2.0) * 0.08;
      }

      // 3. Shrine of Creation
      if (animRefs.projectsSunCore) {
        animRefs.projectsSunCore.rotation.y = time * 1.5;
        const pulse = 1.0 + Math.sin(time * 3.0) * 0.08;
        animRefs.projectsSunCore.scale.setScalar(pulse);
      }
      animRefs.projectsObelisks.forEach((ob, idx) => {
        ob.position.y = Math.sin(time * 1.2 + idx) * 0.04;
      });
      animRefs.projectsScreens.forEach((panel, idx) => {
        panel.position.y = 1.25 + Math.sin(time * 1.8 + idx) * 0.03;
      });

      // 4. Shrine of Masteries
      if (animRefs.skillsCentralMonolith) {
        (animRefs.skillsCentralMonolith.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(time * 3.0) * 0.6;
      }
      animRefs.skillsCrystals.forEach((crystal, idx) => {
        crystal.rotation.y = time * 1.8;
        crystal.position.y = 1.35 + Math.sin(time * 2.2 + idx) * 0.08;
      });

      // 5. Shrine of Connections
      if (animRefs.contactHoloEnvelope) {
        animRefs.contactHoloEnvelope.rotation.y = time * 1.5;
        animRefs.contactHoloEnvelope.position.y = 1.15 + Math.sin(time * 2.5) * 0.05;
      }
      animRefs.contactLanterns.forEach((lan, idx) => {
        lan.rotation.y = time * 1.5;
        lan.position.y = -0.235 + Math.sin(time * 2.5 + idx) * 0.02;
      });

      // --- PLAYER MOVEMENT & PHYSICS ---
      let moveX = 0;
      let moveZ = 0;

      if (keys.w || keys.arrowup) moveZ -= 1;
      if (keys.s || keys.arrowdown) moveZ += 1;
      if (keys.a || keys.arrowleft) moveX -= 1;
      if (keys.d || keys.arrowright) moveX += 1;

      if (joystickVector.x !== 0 || joystickVector.y !== 0) {
        moveX = joystickVector.x;
        moveZ = -joystickVector.y;
      }

      const hasMoveInput = moveX !== 0 || moveZ !== 0;

      if (hasMoveInput) {
        const camYaw = game.cameraAngleYaw;
        const speed = keys.shift ? 6.5 : 3.5;

        const forwardVec = new THREE.Vector3(-Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();
        const rightVec = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardVec).normalize();

        const moveDir = new THREE.Vector3()
          .addScaledVector(forwardVec, -moveZ)
          .addScaledVector(rightVec, moveX)
          .normalize();

        player.position.addScaledVector(moveDir, speed * delta);

        const targetHeading = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetHeading - game.playerHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        game.playerHeading += diff * 12 * delta;
        player.rotation.y = game.playerHeading;

        const animFreq = keys.shift ? 12 : 7;
        const swing = Math.sin(time * animFreq) * 0.55;
        legFL.rotation.x = swing;
        legBR.rotation.x = swing;
        legFR.rotation.x = -swing;
        legBL.rotation.x = -swing;
        
        tailGroup.rotation.y = Math.sin(time * animFreq * 1.5) * 0.45;
        tailGroup.rotation.x = -Math.PI / 4 + Math.sin(time * animFreq) * 0.1;

        // Bouncy running motion
        bodyGroup.position.y = 0.5 + Math.abs(Math.sin(time * animFreq)) * 0.07;
        bodyGroup.rotation.x = Math.sin(time * animFreq) * 0.06;
        bodyGroup.rotation.y = Math.cos(time * animFreq * 0.5) * 0.04;
        
        headGroup.position.y = 0.95 + Math.sin(time * animFreq) * 0.04;
        
        // Floppy ears bouncing
        earL.rotation.z = Math.PI / 15 + Math.sin(time * animFreq) * 0.1;
        earR.rotation.z = -Math.PI / 15 - Math.sin(time * animFreq) * 0.1;

        // Keep eyes open while running
        eyeL.scale.y = 1.0;
        lowerJaw.position.y = -0.15;
        tongue.position.z = 0.32;
      } else {
        legFL.rotation.x = 0;
        legFR.rotation.x = 0;
        legBL.rotation.x = 0;
        legBR.rotation.x = 0;
        bodyGroup.rotation.x = 0;
        bodyGroup.rotation.y = 0;

        // Floppy ears twitching softly
        earL.rotation.z = Math.PI / 15 + Math.sin(time * 0.8) * 0.02;
        earR.rotation.z = -Math.PI / 15 - Math.sin(time * 0.8) * 0.02;

        // Winking mechanism (wink left eye occasionally)
        const winking = Math.sin(time * 1.8) > 0.93;
        eyeL.scale.y = winking ? 0.1 : 1.0;

        // Barking vs. Panting Idle cycle
        const barkCycle = time % 12; // bark once every 12 seconds
        if (barkCycle > 9.5 && barkCycle < 10.1) {
          // BARKING: Tilt head up, open mouth, wag tail frantically, and bounce body up
          headGroup.rotation.x = -0.3;
          headGroup.rotation.z = 0;
          lowerJaw.position.y = -0.21;
          tongue.position.z = 0.35;
          tailGroup.rotation.y = Math.sin(time * 30.0) * 0.55;
          bodyGroup.position.y = 0.53 + Math.abs(Math.sin(time * 20.0)) * 0.07;
        } else {
          // PANTING: Open mouth slightly, head cocked/tilting
          headGroup.rotation.x = Math.sin(time * 0.8) * 0.03;
          headGroup.rotation.z = Math.sin(time * 0.6) * 0.07; // cute head tilt
          
          // Panting mouth sync
          lowerJaw.position.y = -0.14 - Math.abs(Math.sin(time * 4.0)) * 0.025;
          tongue.position.z = 0.315 + Math.abs(Math.sin(time * 4.0)) * 0.02;
          
          tailGroup.rotation.y = Math.sin(time * 2.0) * 0.22;
          tailGroup.rotation.x = -Math.PI / 4 + Math.sin(time * 0.5) * 0.05;
          bodyGroup.position.y = 0.5 + Math.sin(time * 1.5) * 0.012;
        }
        headGroup.position.y = 0.95 + Math.sin(time * 1.5) * 0.008;
      }

      // Snap player permanently to flat Y = 0
      const pPos = player.position;
      pPos.y = 0;

      // --- OUT OF BOUNDS COLLISION CHECK ---
      const distToCenter = Math.sqrt(pPos.x * pPos.x + pPos.z * pPos.z);
      const playableRadius = parkRadius - 0.5;
      if (distToCenter > playableRadius) {
        const pushDir = new THREE.Vector3(pPos.x, 0, pPos.z).normalize();
        pPos.x = pushDir.x * playableRadius;
        pPos.z = pushDir.z * playableRadius;
      }

      // --- OBSTACLE COLLISIONS (Shrines & Sakura Trees Trunks) ---
      const obstacles = [
        { center: new THREE.Vector3(0, 0, 0), r: 0.8 },   // Shrine of Origins
        { center: new THREE.Vector3(0, 0, -14), r: 0.55 }, // Shrine of Wisdom pedestal
        { center: new THREE.Vector3(-15, 0, -4), r: 0.6 },  // Shrine of Creation center
        { center: new THREE.Vector3(15, 0, -4), r: 0.6 },   // Shrine of Masteries center
        { center: new THREE.Vector3(0, 0, 14), r: 0.45 },   // Shrine of Connections podium
        // Sakura Tree trunk locations
        { center: new THREE.Vector3(-4.5, 0, -10.5), r: 0.3 },
        { center: new THREE.Vector3(4.5, 0, -10.5), r: 0.3 },
        { center: new THREE.Vector3(-18.5, 0, -8.0), r: 0.3 },
        { center: new THREE.Vector3(18.5, 0, -8.0), r: 0.3 },
        { center: new THREE.Vector3(-5.0, 0, 10.5), r: 0.3 },
        { center: new THREE.Vector3(5.0, 0, 10.5), r: 0.3 }
      ];
      obstacles.forEach((ob) => {
        const distXZ = Math.sqrt(Math.pow(pPos.x - ob.center.x, 2) + Math.pow(pPos.z - ob.center.z, 2));
        if (distXZ < ob.r) {
          const pushDir = new THREE.Vector3(pPos.x - ob.center.x, 0, pPos.z - ob.center.z).normalize();
          pPos.x = ob.center.x + pushDir.x * ob.r;
          pPos.z = ob.center.z + pushDir.z * ob.r;
        }
      });

      // --- CAMERA ORBIT FOLLOW ---
      const radiusCam = 8.0;
      const yaw = game.cameraAngleYaw;
      const pitch = game.cameraAnglePitch;
      const camX = player.position.x + radiusCam * Math.cos(yaw) * Math.cos(pitch);
      const camY = player.position.y + radiusCam * Math.sin(pitch) + 0.8;
      const camZ = player.position.z + radiusCam * Math.sin(yaw) * Math.cos(pitch);
      camera.position.set(camX, Math.max(0.4, camY), camZ); 
      camera.lookAt(player.position.x, player.position.y + 0.6, player.position.z);

      // --- DYNAMIC CONTENT DETECTIONS ---
      let nearStationId: string | null = null;
      const distToAbout = player.position.distanceTo(new THREE.Vector3(0, 0, -14));
      const distToContact = player.position.distanceTo(new THREE.Vector3(0, 0, 14));
      const distToSpawn = player.position.distanceTo(new THREE.Vector3(0, 0, 0));

      if (distToAbout < 3.2) {
        nearStationId = "about";
      } else if (distToContact < 3.2) {
        nearStationId = "contact";
      } else if (distToSpawn < 2.8) {
        nearStationId = "spawn";
      } else {
        // Projects coordinates check
        const projPositions = [
          new THREE.Vector3(-17.6, 0, -6.6),
          new THREE.Vector3(-12.4, 0, -6.6),
          new THREE.Vector3(-12.4, 0, -1.4),
          new THREE.Vector3(-17.6, 0, -1.4),
        ];
        let closestProjIdx = -1;
        let minProjDist = Infinity;
        projPositions.forEach((pos, idx) => {
          const dist = player.position.distanceTo(pos);
          if (dist < minProjDist) {
            minProjDist = dist;
            closestProjIdx = idx;
          }
        });

        if (minProjDist < 2.0) {
          nearStationId = `project-${closestProjIdx}`;
        } else {
          const distToProjectsIsland = player.position.distanceTo(new THREE.Vector3(-15, 0, -4));
          if (distToProjectsIsland < 4.2) {
            nearStationId = "projects";
          } else {
            // Skills coordinates check
            let closestSkillIdx = -1;
            let minSkillDist = Infinity;
            for (let idx = 0; idx < skillsCount; idx++) {
              const angle = (idx / skillsCount) * Math.PI * 2;
              const sx = 15 + Math.cos(angle) * 2.3;
              const sz = -4 + Math.sin(angle) * 2.3;
              const sPos = new THREE.Vector3(sx, 0, sz);
              const dist = player.position.distanceTo(sPos);
              if (dist < minSkillDist) {
                minSkillDist = dist;
                closestSkillIdx = idx;
              }
            }

            if (minSkillDist < 1.8) {
              nearStationId = `skill-${closestSkillIdx}`;
            } else {
              const distToSkillsIsland = player.position.distanceTo(new THREE.Vector3(15, 0, -4));
              if (distToSkillsIsland < 4.2) {
                nearStationId = "skills";
              }
            }
          }
        }
      }

      onNearStation(nearStationId);
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
      if (gameRef.current) gameRef.current.isDestroyed = true;
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      renderer.dispose();
    };
  }, [joystickVector]);

  // Handle direct Teleport target setting from top-navigation
  useEffect(() => {
    if (triggerInteraction && gameRef.current) {
      let target = new THREE.Vector3(0, 0, 0);
      if (triggerInteraction === "about") target.set(0, 0, -12);
      else if (triggerInteraction === "projects") target.set(-15, 0, -2);
      else if (triggerInteraction === "skills") target.set(15, 0, -2);
      else if (triggerInteraction === "contact") target.set(0, 0, 12);
      else if (triggerInteraction === "spawn") target.set(0, 0, 0);

      gameRef.current.teleportTarget = target;
    }
  }, [triggerInteraction]);

  return (
    <div
      id="3d-viewport-container"
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#bae6fd] cursor-grab active:cursor-grabbing rounded-2xl border border-white/5 shadow-2xl"
    />
  );
}
