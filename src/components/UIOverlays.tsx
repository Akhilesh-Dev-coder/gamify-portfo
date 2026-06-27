import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Award,
  BookOpen,
  MessageSquare,
  Send,
  Code,
  Zap,
  MapPin,
  ChevronRight,
  HelpCircle,
  Github,
  Linkedin,
  Twitter,
  User,
  Compass,
  CheckCircle,
} from "lucide-react";
import { Project, Skill, GuestbookEntry, UserProgress } from "../types";
import { PROJECTS_DATA, SKILLS_DATA } from "../data";

interface UIOverlaysProps {
  playerX: number;
  playerZ: number;
  cameraYaw: number;
  nearStation: string | null;
  userProgress: UserProgress;
  onUpdateProgress: (updated: Partial<UserProgress>) => void;
  onTeleportToStation: (stationName: string) => void;
  guestbookEntries: GuestbookEntry[];
  onSignGuestbook: (name: string, email: string, message: string) => Promise<boolean>;
  onTriggerMobileInteraction: () => void;
}

export default function UIOverlays({
  playerX,
  playerZ,
  cameraYaw,
  nearStation,
  userProgress,
  onUpdateProgress,
  onTeleportToStation,
  guestbookEntries,
  onSignGuestbook,
  onTriggerMobileInteraction,
}: UIOverlaysProps) {
  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form states
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestSuccess, setGuestSuccess] = useState(false);

  // Help Screen overlay
  const [showHelp, setShowHelp] = useState(false);

  // Mark nearStation as visited automatically
  useEffect(() => {
    if (nearStation && !userProgress.visitedStations.includes(nearStation)) {
      const updatedStations = [...userProgress.visitedStations, nearStation];
      onUpdateProgress({ visitedStations: updatedStations });
    }
  }, [nearStation]);

  // Compute overall progress percentage
  // 4 stations + 8 skills + 1 guestbook = 13 milestones
  const totalMilestones = 13;
  const completedMilestones =
    userProgress.visitedStations.length +
    userProgress.unlockedSkills.length +
    (userProgress.guestbookSigned ? 1 : 0);
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  const getObjectiveText = () => {
    if (userProgress.visitedStations.length < 4) {
      return `Explore all stations in the world (${userProgress.visitedStations.length}/4 visited)`;
    }
    if (userProgress.unlockedSkills.length < 8) {
      return `Learn and unlock all tech tree skills (${userProgress.unlockedSkills.length}/8 active)`;
    }
    if (!userProgress.guestbookSigned) {
      return "Cross the southern river bridge to the cabin & sign the Guestbook!";
    }
    return "Amazing! You have fully explored the magical island! Leave feedback.";
  };

  const handleGuestbookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError("");
    setGuestSuccess(false);

    if (!guestName.trim()) {
      setGuestError("Please enter your name");
      return;
    }
    if (!guestEmail.trim() || !guestEmail.includes("@")) {
      setGuestError("Please enter a valid email address");
      return;
    }
    if (!guestMessage.trim()) {
      setGuestError("Please write a guestbook message");
      return;
    }

    setIsSubmittingGuest(true);
    try {
      const success = await onSignGuestbook(guestName, guestEmail, guestMessage);
      if (success) {
        setGuestSuccess(true);
        setGuestName("");
        setGuestEmail("");
        setGuestMessage("");
        onUpdateProgress({ guestbookSigned: true });
      } else {
        setGuestError("Failed to sign the guestbook. Please try again.");
      }
    } catch (err) {
      setGuestError("Error submitting guestbook details.");
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    const unlocked = userProgress.unlockedSkills.includes(skillId);
    let updated: string[];
    if (unlocked) {
      updated = userProgress.unlockedSkills.filter((id) => id !== skillId);
    } else {
      updated = [...userProgress.unlockedSkills, skillId];
    }
    onUpdateProgress({ unlockedSkills: updated });
  };

  // Render station trigger button nicely
  const getStationLabel = (key: string) => {
    switch (key) {
      case "about":
        return "About Me Portal";
      case "projects":
        return "Projects Console";
      case "skills":
        return "Skills Shrine";
      case "contact":
        return "Cozy Cabin & Guestbook";
      default:
        return "Interactive Object";
    }
  };

  return (
    <div id="ui-overlay-layer" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans select-none z-10">
      
      {/* ========================================================= */}
      {/* HEADER SECTION (Branding, Navigation Buttons) */}
      {/* ========================================================= */}
      <div id="app-header" className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-auto">
        {/* Left identity card */}
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md border-l-2 border-cyan-500 p-4 shadow-2xl">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-950 to-black border border-cyan-500/40 text-cyan-400 font-mono tracking-widest font-bold flex items-center justify-center text-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            MS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-mono uppercase font-bold text-sm tracking-widest leading-none">Magi Scurra</h1>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono tracking-widest uppercase">LEVEL {Math.floor(userProgress.score / 100) + 1}</span>
            </div>
            <p className="text-slate-400 text-[10px] uppercase font-mono tracking-wider mt-1">Full Stack & 3D Interactive Specialist</p>
          </div>
        </div>

        {/* Navigation Buttons / Quick Teleport */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModal("about")}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-500/50 text-slate-300 hover:text-white px-3.5 py-2 font-mono uppercase tracking-wider text-[10px] transition-all cursor-pointer pointer-events-auto shadow-sm"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            About
          </button>
          <button
            onClick={() => setActiveModal("projects")}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-500/50 text-slate-300 hover:text-white px-3.5 py-2 font-mono uppercase tracking-wider text-[10px] transition-all cursor-pointer pointer-events-auto shadow-sm"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            Projects
          </button>
          <button
            onClick={() => setActiveModal("skills")}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-500/50 text-slate-300 hover:text-white px-3.5 py-2 font-mono uppercase tracking-wider text-[10px] transition-all cursor-pointer pointer-events-auto shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Skills
          </button>
          <button
            onClick={() => setActiveModal("contact")}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-500/50 text-slate-300 hover:text-white px-3.5 py-2 font-mono uppercase tracking-wider text-[10px] transition-all cursor-pointer pointer-events-auto shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Guestbook ({guestbookEntries.length})
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="bg-black/60 hover:bg-white/5 border border-white/10 text-slate-400 hover:text-white p-2 transition-all cursor-pointer pointer-events-auto"
            title="How to play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MIDDLE CONTAINER (Minimap, Stack, Toasts) */}
      {/* ========================================================= */}
      <div id="middle-viewport-ui" className="flex-1 w-full flex items-stretch justify-between my-4 min-h-0">
        
        {/* Left section: Minimap & Tech stack */}
        <div className="flex flex-col gap-4 justify-between h-full pointer-events-auto">
          {/* Top-down Minimap */}
          <div id="game-minimap" className="bg-black/50 backdrop-blur-sm border border-white/10 p-3 w-44 shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-1 mb-1.5 text-cyan-500 text-[10px] font-bold tracking-widest font-mono uppercase">
              <span>World Radar</span>
              <Compass className="w-3.5 h-3.5 text-cyan-500 animate-spin-slow" />
            </div>
            
            {/* 2D Map representation */}
            <div className="w-36 h-36 bg-black/65 border border-cyan-500/20 rounded relative overflow-hidden flex items-center justify-center">
              {/* Radar scanner grid */}
              <div className="absolute w-full h-[1px] bg-cyan-500/10 top-1/2 left-0 pointer-events-none"></div>
              <div className="absolute h-full w-[1px] bg-cyan-500/10 left-1/2 top-0 pointer-events-none"></div>
              <div className="absolute inset-2 rounded-full bg-cyan-500/[0.02] border border-cyan-500/10 pointer-events-none" />
              <div className="absolute inset-6 rounded-full bg-cyan-500/[0.01] border border-cyan-500/5 pointer-events-none" />
              
              {/* Central spawn crosshair */}
              <div className="absolute w-2 h-2 rounded-full border border-cyan-500/30" />

              {/* Station icons on minimap */}
              {/* ABOUT ME (North) */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono ${userProgress.visitedStations.includes("about") ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-black/60 text-slate-500 border border-white/10"}`}
                style={{ top: "10%", left: "46%" }}
                title="About Me"
              >
                A
              </div>
              {/* PROJECTS (West) */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono ${userProgress.visitedStations.includes("projects") ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-black/60 text-slate-500 border border-white/10"}`}
                style={{ top: "45%", left: "10%" }}
                title="Projects"
              >
                P
              </div>
              {/* SKILLS (East) */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono ${userProgress.visitedStations.includes("skills") ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-black/60 text-slate-500 border border-white/10"}`}
                style={{ top: "45%", left: "82%" }}
                title="Skills"
              >
                S
              </div>
              {/* CONTACT (Southeast) */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono ${userProgress.visitedStations.includes("contact") ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-black/60 text-slate-500 border border-white/10"}`}
                style={{ top: "78%", left: "76%" }}
                title="Contact Cabin"
              >
                C
              </div>

              {/* River stream visual representation */}
              <div className="absolute top-[35%] bottom-0 right-[25%] left-[65%] bg-cyan-950/10 border-l border-r border-cyan-500/10 rotate-[30deg] pointer-events-none" />

              {/* Dynamic player pin */}
              {/* Mapping 3D (X range -28 to 28, Z range -28 to 28) to 2D (0 to 100%) */}
              <div
                className="absolute w-4 h-4 flex items-center justify-center z-10 pointer-events-none transition-all duration-75"
                style={{
                  left: `${((playerX + 28) / 56) * 100}%`,
                  top: `${((playerZ + 28) / 56) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Glowing ring */}
                <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
                {/* Real-time pointer arrow */}
                <div
                  className="w-2.5 h-2.5 bg-cyan-400 border border-white rounded-tl-full rounded-tr-md rounded-bl-md rounded-br-full shadow-md shadow-cyan-950"
                  style={{
                    transform: `rotate(${cameraYaw - Math.PI / 4}rad)`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between w-full mt-1.5 text-[8px] font-mono text-cyan-500/80 uppercase tracking-wider">
              <span>POS: {Math.round(playerX)}, {Math.round(playerZ)}</span>
              <span className="opacity-60">Sectors: {userProgress.visitedStations.length}/4</span>
            </div>
          </div>

          {/* Tech Stack widget */}
          <div id="tech-stack-widget" className="bg-black/50 backdrop-blur-sm border border-white/10 p-3.5 w-44 shadow-2xl flex flex-col gap-2">
            <span className="text-[10px] font-bold text-cyan-500 tracking-widest font-mono uppercase border-b border-white/5 pb-1">Core Tech Stack</span>
            <div className="flex flex-col gap-1.5">
              {[
                { name: "React 19 & Vite", color: "bg-cyan-500" },
                { name: "Three.js 3D Engine", color: "bg-cyan-500" },
                { name: "Node & Express", color: "bg-cyan-500" },
                { name: "Tailwind CSS v4", color: "bg-cyan-500" },
              ].map((tech) => (
                <div key={tech.name} className="flex items-center gap-2 bg-white/[0.03] px-2.5 py-1 border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-full ${tech.color} shadow-[0_0_6px_rgba(6,182,212,0.8)]`} />
                  <span className="text-[9px] font-semibold text-slate-300 font-mono">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right section: Blank space, ready to handle overlays */}
        <div className="flex-1 flex flex-col items-center justify-end" />
      </div>

      {/* ========================================================= */}
      {/* FOOTER SECTION (Controls, Tips, Objective progress) */}
      {/* ========================================================= */}
      <div id="app-footer" className="w-full flex flex-col md:flex-row items-end justify-between gap-4 pointer-events-auto">
        
        {/* Keyboard instructions reference (Hidden on small mobile) */}
        <div id="controls-panel" className="hidden md:flex flex-col bg-black/50 backdrop-blur-sm border border-white/10 p-3.5 w-52 shadow-2xl gap-2">
          <span className="text-[10px] font-bold text-cyan-500 tracking-widest font-mono uppercase border-b border-white/5 pb-1.5">Keyboard Guide</span>
          <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between py-0.5"><span className="bg-black border border-white/10 px-1.5 py-0.5 text-cyan-400 font-mono text-[9px]">W A S D</span> <span className="text-right">Move Avatar</span></div>
            <div className="flex justify-between py-0.5"><span className="bg-black border border-white/10 px-1.5 py-0.5 text-cyan-400 font-mono text-[9px]">Mouse Drag</span> <span className="text-right">Look Around</span></div>
            <div className="flex justify-between py-0.5"><span className="bg-black border border-white/10 px-1.5 py-0.5 text-cyan-400 font-mono text-[9px]">E</span> <span className="text-right">Interact</span></div>
            <div className="flex justify-between py-0.5"><span className="bg-black border border-white/10 px-1.5 py-0.5 text-cyan-400 font-mono text-[9px]">Shift</span> <span className="text-right">Sprint</span></div>
          </div>
        </div>

        {/* Dynamic Context Action Trigger ("Press E to Interact" floating billboard) */}
        <div className="flex-1 flex flex-col items-center justify-center select-none py-2 px-6">
          {nearStation ? (
            <button
              onClick={onTriggerMobileInteraction}
              className="bg-cyan-500 text-black px-6 py-3 font-bold text-sm uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-pointer pointer-events-auto hover:bg-cyan-400 transition-all active:scale-95 border-none animate-pulse"
            >
              <span className="border-2 border-black px-1.5 py-0.5 text-xs font-mono font-bold">E</span>
              ENTER {getStationLabel(nearStation).toUpperCase()}
            </button>
          ) : (
            <div className="bg-black/50 border border-white/5 px-4 py-2 text-[10px] text-slate-400 font-mono text-center uppercase tracking-widest">
              System Scan: Approach Interactive Zone & press E
            </div>
          )}
        </div>

        {/* Right side: Objective & Progress Tracker */}
        <div id="objective-tracker" className="bg-black/50 backdrop-blur-sm border border-white/10 p-4 w-full max-w-xs shadow-2xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-cyan-500 tracking-widest font-mono uppercase font-semibold">Current Objective</span>
            <span className="text-xs font-bold text-cyan-400 font-mono">{progressPercent}% Done</span>
          </div>
          <p className="text-white text-xs font-medium leading-tight mb-3 tracking-wide">
            {getObjectiveText()}
          </p>
          <div className="w-full bg-white/5 h-2 border border-white/10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-mono mt-1.5 text-right uppercase tracking-wider">
            Milestones: {completedMilestones} / {totalMilestones} Completed
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALS VIEWPORT (Z-Index Layer) */}
      {/* ========================================================= */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 pointer-events-auto overflow-y-auto">
          <div className="bg-[#0a0f1a]/95 border-2 border-cyan-500/30 w-full max-w-2xl rounded-none md:rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col my-8 max-h-[85vh] backdrop-blur-xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/60">
              <div className="flex items-center gap-2.5">
                {activeModal === "about" && (
                  <>
                    <div className="w-8 h-8 bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20"><User className="w-4 h-4" /></div>
                    <h2 className="text-white font-mono uppercase tracking-widest text-sm font-bold">About Magi Scurra</h2>
                  </>
                )}
                {activeModal === "projects" && (
                  <>
                    <div className="w-8 h-8 bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20"><Code className="w-4 h-4" /></div>
                    <h2 className="text-white font-mono uppercase tracking-widest text-sm font-bold">Projects Console</h2>
                  </>
                )}
                {activeModal === "skills" && (
                  <>
                    <div className="w-8 h-8 bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20"><Zap className="w-4 h-4" /></div>
                    <h2 className="text-white font-mono uppercase tracking-widest text-sm font-bold">Skill Matrix</h2>
                  </>
                )}
                {activeModal === "contact" && (
                  <>
                    <div className="w-8 h-8 bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20"><MessageSquare className="w-4 h-4" /></div>
                    <h2 className="text-white font-mono uppercase tracking-widest text-sm font-bold">Visitor Registry</h2>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedProject(null);
                }}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-300 text-xs leading-relaxed font-sans">
              
              {/* 1. ABOUT ME MODAL */}
              {activeModal === "about" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row gap-5 items-center bg-black/55 p-5 border border-white/5">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-950 to-black border-2 border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono tracking-widest font-bold text-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                      MS
                    </div>
                    <div className="text-center md:text-left flex-1">
                      <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono">Magi Scurra</h3>
                      <p className="text-cyan-400 text-[10px] uppercase font-mono font-semibold tracking-widest mt-1">Sustained Web Engineering & Interactive Graphics</p>
                      <p className="text-slate-400 text-xs mt-2 font-mono">
                        Specializing in building real-time, browser-native 3D simulations, high-performance API architectures, and robust database synchronizations.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-2 flex items-center gap-1.5 uppercase font-mono tracking-wider text-xs"><Award className="w-4 h-4 text-cyan-400" /> Professional Summary</h4>
                    <p className="text-slate-300">
                      I am a multi-disciplinary software builder. I bridge the gap between creative visual artistry and complex backend computing. In 2026, building web experiences requires more than standard static layouts; it demands highly responsive, game-like spatial layouts that captivate users while remaining highly accessible and responsive on mobile devices.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-1.5 uppercase font-mono tracking-wider text-xs"><BookOpen className="w-4 h-4 text-cyan-400" /> Core Achievements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { title: "WebGL & 3D Engineering", desc: "Formulating custom matrix multipliers, procedural rendering loops, and low-latency canvas integrations." },
                        { title: "Full Stack Scaling", desc: "Setting up secure, lightweight Express.js routers and persistent document-stores handling millions of writes." },
                        { title: "Offline-First Design", desc: "Engineering deep state managers and robust localized storage backup syncs for high-availability." },
                        { title: "Dynamic User Interfaces", desc: "Aesthetic pixel-precise configurations pairing modern Display Sans typography with Tailwind CSS utility variables." },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-black/40 border border-white/5 p-4">
                          <span className="text-cyan-400 font-mono uppercase tracking-wider text-xs font-semibold">{item.title}</span>
                          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PROJECTS MODAL */}
              {activeModal === "projects" && (
                <div className="flex flex-col gap-6">
                  {selectedProject ? (
                    // Expanded single project view
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="text-cyan-400 text-xs font-semibold font-mono flex items-center gap-1 hover:underline mb-2 cursor-pointer self-start"
                      >
                        ← Back to console listing
                      </button>

                      <div
                        className="w-full h-44 flex items-center justify-center p-6 text-cyan-400 font-bold text-lg border border-white/10 shadow-2xl relative overflow-hidden bg-black/80"
                        style={{
                          backgroundImage: `linear-gradient(to bottom, rgba(6,182,212,0.05), rgba(0,0,0,0.85)), ${selectedProject.image}`,
                        }}
                      >
                        <div className="absolute top-2 left-2 text-[8px] font-mono opacity-45 tracking-widest uppercase">System Scan: Active Asset</div>
                        <span className="font-mono tracking-widest uppercase text-base">{selectedProject.title}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <h3 className="text-white font-bold text-sm uppercase tracking-wide font-mono">{selectedProject.title}</h3>
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${selectedProject.difficulty === "Advanced" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"}`}>
                          {selectedProject.difficulty}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs mt-1">
                        {selectedProject.longDescription}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedProject.tags.map((t) => (
                          <span key={t} className="text-[9px] font-mono bg-black border border-white/5 px-2 py-1 rounded text-cyan-400/80">
                            #{t.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <a
                          href={selectedProject.demoUrl}
                          onClick={(e) => e.preventDefault()}
                          className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 text-center text-[10px] tracking-widest uppercase font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all cursor-pointer"
                        >
                          Launch Active Live Demo
                        </a>
                        <a
                          href={selectedProject.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-black hover:bg-white/5 text-slate-300 font-bold py-2.5 text-center text-[10px] tracking-widest uppercase font-mono border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Github className="w-3.5 h-3.5" />
                          Explore Source Code
                        </a>
                      </div>
                    </div>
                  ) : (
                    // Default listing grid
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PROJECTS_DATA.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => setSelectedProject(proj)}
                          className="group bg-black/40 border border-white/10 hover:border-cyan-500/50 p-4 rounded-none cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        >
                          <div
                            className="w-full h-24 mb-3 flex items-center justify-center text-cyan-400 font-mono text-xs border border-white/5"
                            style={{ background: proj.image }}
                          >
                            <span className="font-mono tracking-wider opacity-90">{proj.title.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-white font-mono uppercase font-bold group-hover:text-cyan-400 transition-all text-xs tracking-wide">{proj.title}</h4>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                            {proj.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {proj.tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[8px] font-mono bg-black border border-white/5 px-1.5 py-0.5 rounded text-slate-500 uppercase">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SKILLS MODAL */}
              {activeModal === "skills" && (
                <div className="flex flex-col gap-5">
                  <div className="bg-black/40 border border-white/5 p-4 text-center">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">Interaction Center</span>
                    <p className="text-slate-400 text-xs mt-1">
                      Click and activate skills on the tech tree below to demonstrate your focus! Unlocking skills dynamically modifies your total Progress XP!
                    </p>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {SKILLS_DATA.map((skill) => {
                      const isUnlocked = userProgress.unlockedSkills.includes(skill.id);
                      return (
                        <div
                          key={skill.id}
                          className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 border transition-all ${isUnlocked ? "bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-950/10" : "bg-black/30 border-white/10 hover:border-white/20"}`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 font-mono text-xs font-bold flex items-center justify-center border ${isUnlocked ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]" : "bg-black text-slate-500 border-white/10"}`}>
                              {skill.iconName}
                            </div>
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-mono uppercase font-bold text-xs">{skill.name}</h4>
                                <span className="text-[8px] uppercase font-mono px-1.5 py-0.5 rounded bg-black text-slate-500 border border-white/5">{skill.category}</span>
                              </div>
                              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                {skill.description}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleSkill(skill.id)}
                            className={`w-full md:w-auto mt-3 md:mt-0 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer border transition-all ${isUnlocked ? "bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-black hover:bg-white/5 border-white/10 text-slate-300"}`}
                          >
                            {isUnlocked ? "✓ Active (Tap to remove)" : "+ Unlock Skill (Earns 5 XP)"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. CONTACT & GUESTBOOK MODAL */}
              {activeModal === "contact" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Form */}
                  <div className="bg-black/40 p-5 border border-white/10">
                    <h3 className="text-white font-mono uppercase font-bold text-xs mb-1.5 flex items-center gap-1.5"><Send className="w-4 h-4 text-cyan-400" /> Sign the 3D Guestbook</h3>
                    <p className="text-slate-400 text-xs mb-4">Your message will be saved in our persistent database and instantly rendered in the public logs list.</p>
                    
                    {guestSuccess ? (
                      <div className="flex flex-col items-center justify-center text-center py-6 bg-cyan-950/15 border border-cyan-500/30 p-4 rounded-xl">
                        <CheckCircle className="w-10 h-10 text-cyan-400 animate-pulse mb-2" />
                        <h4 className="text-white font-mono uppercase tracking-widest font-bold text-xs">Successfully Signed!</h4>
                        <p className="text-slate-400 text-[11px] mt-1">Thank you! Your visitor entry has been written to our secure file-based database, awarding you 25 XP points.</p>
                        <button
                          onClick={() => setGuestSuccess(false)}
                          className="mt-4 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded text-black font-bold cursor-pointer font-mono uppercase tracking-wider"
                        >
                          Write Another Entry
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleGuestbookSubmit} className="flex flex-col gap-3">
                        {guestError && (
                          <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/50 p-2 rounded font-mono">
                            ⚠ {guestError}
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">Your Name</label>
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-black/80 border border-white/10 focus:border-cyan-500 rounded px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-mono shadow-inner"
                            disabled={isSubmittingGuest}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">Email Address</label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="w-full bg-black/80 border border-white/10 focus:border-cyan-500 rounded px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-mono shadow-inner"
                            disabled={isSubmittingGuest}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">Message</label>
                          <textarea
                            value={guestMessage}
                            onChange={(e) => setGuestMessage(e.target.value)}
                            placeholder="Type your message to Magi Scurra..."
                            rows={3}
                            className="w-full bg-black/80 border border-white/10 focus:border-cyan-500 rounded px-3.5 py-2 text-xs text-white focus:outline-none transition-all font-mono shadow-inner resize-none"
                            disabled={isSubmittingGuest}
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold py-2.5 rounded text-center text-[10px] tracking-widest uppercase font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 border-none"
                          disabled={isSubmittingGuest}
                        >
                          <Send className="w-3 h-3" />
                          {isSubmittingGuest ? "Saving to Database..." : "Publish to Island Log (+25 XP)"}
                        </button>
                      </form>
                    )}

                    <div className="flex justify-center gap-4 border-t border-white/5 mt-5 pt-4">
                      <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 transition-all"><Github className="w-4 h-4" /></a>
                      <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 transition-all"><Linkedin className="w-4 h-4" /></a>
                      <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-400 transition-all"><Twitter className="w-4 h-4" /></a>
                    </div>
                  </div>

                  {/* Right Column: Guest list */}
                  <div className="flex flex-col h-[350px]">
                    <h4 className="text-white font-mono uppercase font-bold text-xs mb-2 flex items-center gap-1.5">👥 Visitor Registry Logs</h4>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                      {guestbookEntries.length === 0 ? (
                        <div className="text-center text-slate-500 text-xs py-8 font-mono">
                          No messages written yet. Be the first!
                        </div>
                      ) : (
                        guestbookEntries.map((entry) => (
                          <div key={entry.id} className="bg-black/40 border border-white/5 p-3 flex flex-col gap-1 hover:border-cyan-500/30 transition-all">
                            <div className="flex justify-between items-center">
                              <span className="text-cyan-400 font-mono uppercase font-bold text-[11px]">{entry.name}</span>
                              <span className="text-[9px] font-mono text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed italic">
                              "{entry.message}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* HOW TO PLAY HELP OVERLAY */}
      {/* ========================================================= */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-[#0a0f1a] border-2 border-cyan-500/30 w-full max-w-md p-6 shadow-2xl flex flex-col text-slate-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="text-white font-mono uppercase tracking-widest font-bold text-sm flex items-center gap-1.5"><Compass className="w-4 h-4 text-cyan-400 animate-pulse" /> Interactive Guide</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs leading-relaxed font-mono">
              <p className="text-slate-400 text-[11px]">Welcome to Magi Scurra's interactive portfolio world! You control a custom 3D avatar exploring a beautiful procedural island.</p>
              
              <div>
                <h4 className="text-cyan-400 font-bold mb-1 uppercase text-[10px] tracking-wider">🎮 Control Mechanics:</h4>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-[11px] text-slate-300">
                  <li><strong>Desktop Keys</strong>: Move with <kbd className="px-1 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">W</kbd> <kbd className="px-1 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">A</kbd> <kbd className="px-1 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">S</kbd> <kbd className="px-1 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">D</kbd> or arrow keys.</li>
                  <li><strong>Camera Orientation</strong>: Click and drag your mouse anywhere on the screen to look around.</li>
                  <li><strong>Sprinting</strong>: Hold down <kbd className="px-1 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">Shift</kbd> to sprint.</li>
                  <li><strong>Mobile Screens</strong>: Use the touch joystick on the left to walk, and drag anywhere on the right to look.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-cyan-400 font-bold mb-1 uppercase text-[10px] tracking-wider">🏰 Objectives:</h4>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-[11px] text-slate-300">
                  <li>Approach any of the four interactive shrines.</li>
                  <li>Press <kbd className="px-1.5 py-0.5 bg-black border border-white/10 text-cyan-400 text-[9px]">E</kbd> or tap the action button to access them!</li>
                  <li>Unlock technical skills on the skills shrine, explore projects on the projects screen, and cross the southern bridge to sign the guestbook!</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-cyan-500 text-black font-bold py-2.5 text-center text-[10px] font-mono tracking-widest uppercase cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-all border-none"
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
