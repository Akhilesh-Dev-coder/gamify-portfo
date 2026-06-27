import { Project, Skill } from "./types";

export const PROJECTS_DATA: Project[] = [
  {
    id: "p-1",
    title: "DevQuest 3D Engine",
    description: "Lightweight 3D WebGL engine in TypeScript.",
    longDescription: "A custom, low-overhead 3D game engine built on top of vanilla WebGL and TypeScript. Features procedural terrain generation, frustum culling, realistic shadows, custom GLSL fragment shaders, and integrated bounding-box physics. Fully responsive and optimized for mobile browsers.",
    image: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    tags: ["TypeScript", "WebGL", "Three.js", "Vite"],
    demoUrl: "#",
    githubUrl: "https://github.com",
    difficulty: "Advanced"
  },
  {
    id: "p-2",
    title: "CloudSync Real-time Storage",
    description: "Encrypted cloud storage with instant syncing.",
    longDescription: "An end-to-end encrypted cloud storage platform with a beautiful drag-and-drop dashboard. Implements delta-compression algorithms for instant file syncing, detailed version history, secure public file sharing, and automated image compression.",
    image: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    tags: ["React", "Express", "MongoDB", "WebSockets"],
    demoUrl: "#",
    githubUrl: "https://github.com",
    difficulty: "Intermediate"
  },
  {
    id: "p-3",
    title: "QueryFlow Schema Planner",
    description: "Visual database schema architect powered by AI.",
    longDescription: "An interactive, visual database architect that lets developers model schemas using custom nodes. Features automatic SQL translation, interactive ER diagrams, collaborative workspace sharing, and a Gemini-powered copilot that suggests indexes and checks normalization rules.",
    image: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    tags: ["React", "D3.js", "Node.js", "Gemini API"],
    demoUrl: "#",
    githubUrl: "https://github.com",
    difficulty: "Advanced"
  },
  {
    id: "p-4",
    title: "Mindsync AI Assistant",
    description: "Serverless workspace chatbot & summarizer.",
    longDescription: "A comprehensive chat and document management system integrated with Google Workspace. Uses Gemini models to scan PDFs, generate visual markdown summaries, extract action items, and organize them directly inside standard database structures.",
    image: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    tags: ["TypeScript", "Next.js", "Tailwind CSS", "Firebase"],
    demoUrl: "#",
    githubUrl: "https://github.com",
    difficulty: "Intermediate"
  }
];

export const SKILLS_DATA: Skill[] = [
  {
    id: "s-1",
    name: "JavaScript",
    category: "Frontend",
    iconName: "JS",
    description: "Modern ES6+, closures, prototype-chain, async/await, and DOM manipulation.",
    unlockedAtProgress: 0
  },
  {
    id: "s-2",
    name: "TypeScript",
    category: "Frontend",
    iconName: "TS",
    description: "Strong typing, generics, utility types, and decorators for robust programming.",
    unlockedAtProgress: 5
  },
  {
    id: "s-3",
    name: "React.js",
    category: "Frontend",
    iconName: "React",
    description: "Virtual DOM, hooks, state engines, context API, and high-performance rendering.",
    unlockedAtProgress: 15
  },
  {
    id: "s-4",
    name: "Three.js",
    category: "Frontend",
    iconName: "3D",
    description: "WebGL layers, meshes, lighting, shaders, cameras, and raycasting controls.",
    unlockedAtProgress: 30
  },
  {
    id: "s-5",
    name: "Node.js",
    category: "Backend",
    iconName: "Node",
    description: "V8-powered event-driven backend runtime, streams, cluster clustering, and fs modules.",
    unlockedAtProgress: 10
  },
  {
    id: "s-6",
    name: "Express.js",
    category: "Backend",
    iconName: "Express",
    description: "Minimalist server routing, secure cookie parsers, and custom API middleware design.",
    unlockedAtProgress: 20
  },
  {
    id: "s-7",
    name: "MongoDB",
    category: "Database",
    iconName: "MDB",
    description: "Scalable document-oriented databases, aggregation pipelines, and schema indexing.",
    unlockedAtProgress: 25
  },
  {
    id: "s-8",
    name: "Firestore",
    category: "Database",
    iconName: "FS",
    description: "Real-time document sync, security rules engineering, and low-latency cloud data store.",
    unlockedAtProgress: 35
  }
];
