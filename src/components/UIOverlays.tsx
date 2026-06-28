import React, { useState } from "react";
import {
  X,
  Send,
  Code,
  Zap,
  HelpCircle,
  Github,
  Linkedin,
  User,
  Compass,
  CheckCircle,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { GuestbookEntry, UserProgress } from "../types";
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
  // Guestbook Form states
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [guestSuccess, setGuestSuccess] = useState(false);

  // Help Screen overlay
  const [showHelp, setShowHelp] = useState(false);

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
        setGuestError("Failed to sign guestbook. Please try again.");
      }
    } catch (err) {
      setGuestError("Error submitting guestbook details.");
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  // Determine current active sector text based on nearStation
  const getActiveLocationText = () => {
    if (!nearStation || nearStation === "spawn") return "Shrine of Origins";
    if (nearStation === "about") return "Shrine of Wisdom";
    if (nearStation.startsWith("project")) return "Shrine of Creation";
    if (nearStation.startsWith("skill")) return "Shrine of Masteries";
    if (nearStation === "contact") return "Shrine of Connections";
    return "Exploring Shrine";
  };

  // Render contextual card based on nearStation
  const renderContextualPanel = () => {
    if (!nearStation || nearStation === "spawn") {
      return (
        <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-4 text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Sanctuary Connected</h3>
          </div>
          <p className="text-xs leading-relaxed">
            Welcome to Akhilesh Dev's Garden Shrine Sanctuary. Roam around the peaceful lawns to visit each sacred station: Origins, Wisdom, Creation, Masteries, and Connections.
          </p>
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg flex flex-col gap-2">
            <h4 className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Controls:</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
              <div><span className="text-emerald-300">WASD / Keys:</span> Walk</div>
              <div><span className="text-emerald-300">Mouse Drag:</span> Look</div>
              <div><span className="text-emerald-300">Hold Shift:</span> Sprint</div>
              <div><span className="text-emerald-300">Space:</span> Roam freely</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Tip: Click the navigation tabs above to instantly teleport between the garden shrines.
          </p>
        </div>
      );
    }

    if (nearStation === "about") {
      return (
        <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-6 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-5 text-slate-300 overflow-y-auto max-h-[60vh] md:max-h-[75vh]">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 rounded-lg">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-mono uppercase tracking-widest text-xs font-bold">Akhilesh Dev</h2>
              <p className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider">Full Stack & 3D Web Architect</p>
            </div>
          </div>

          <div className="text-xs leading-relaxed space-y-4">
            <p>
              I bridge the gap between creative visual artistry and complex backend computing. I build high-performance 3D interactive interfaces, real-time sync architectures, and server engines that scale gracefully.
            </p>
            <div>
              <h4 className="text-white font-bold mb-2 flex items-center gap-1.5 uppercase font-mono tracking-wider text-[10px]"><BookOpen className="w-4 h-4 text-emerald-400" /> Focus Areas</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { title: "3D & Graphics", desc: "Real-time canvas engines, procedural vertex buffers, and shaders." },
                  { title: "Distributed APIs", desc: "Low-latency Express endpoints, encrypted WebSockets, database design." },
                  { title: "Offline Capabilities", desc: "Robust data sync managers with intelligent client caching." }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/5 p-3 rounded-lg">
                    <span className="text-emerald-300 font-mono uppercase tracking-wider text-[9px] font-bold">{item.title}</span>
                    <p className="text-slate-400 text-[10px] mt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (nearStation.startsWith("project")) {
      const isList = nearStation === "projects";
      if (isList) {
        return (
          <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-3 text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <Code className="w-5 h-5" />
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Shrine of Creation</h3>
            </div>
            <p className="text-xs leading-relaxed">
              Explore my database and visual engineering works. 
            </p>
            <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 p-3 text-[10px] font-mono rounded-lg flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span>Approach any of the 4 project pedestals inside the creation shrine to inspect logs.</span>
            </div>
          </div>
        );
      }

      // Render details of the approached project
      const idx = parseInt(nearStation.split("-")[1]);
      const project = PROJECTS_DATA[idx];
      if (!project) return null;

      return (
        <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-6 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-4 text-slate-300 overflow-y-auto max-h-[60vh] md:max-h-[75vh]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase text-emerald-400 tracking-wider">Project Rune #{idx + 1}</span>
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
              {project.difficulty}
            </span>
          </div>

          <h3 className="text-white font-mono uppercase font-bold text-sm leading-tight">{project.title}</h3>
          
          <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold" style={{ background: project.image }}>
            <span>{project.title.toUpperCase()}</span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            {project.longDescription}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((t) => (
              <span key={t} className="text-[9px] font-mono bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-full text-slate-300">
                #{t.toLowerCase()}
              </span>
            ))}
          </div>

          <div className="flex gap-2.5 mt-2">
            <a
              href={project.demoUrl}
              onClick={(e) => e.preventDefault()}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-lg text-center text-[10px] tracking-widest uppercase font-mono transition-all cursor-pointer border-none"
            >
              Demo
            </a>
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-black hover:bg-white/5 text-slate-300 font-bold py-2 rounded-lg text-center text-[10px] tracking-widest uppercase font-mono border border-white/10 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Github className="w-3.5 h-3.5" />
              Source
            </a>
          </div>
        </div>
      );
    }

    if (nearStation.startsWith("skill")) {
      const isList = nearStation === "skills";
      if (isList) {
        return (
          <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-3 text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <Zap className="w-5 h-5" />
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Shrine of Masteries</h3>
            </div>
            <p className="text-xs leading-relaxed">
              Browse through the technical skills embedded within the stone monolith ring.
            </p>
            <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 p-3 text-[10px] font-mono rounded-lg flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span>Stand next to any floating skill rune inside the stone circle to inspect details.</span>
            </div>
          </div>
        );
      }

      // Render details of the approached skill
      const idx = parseInt(nearStation.split("-")[1]);
      const skill = SKILLS_DATA[idx];
      if (!skill) return null;

      return (
        <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-3.5 text-slate-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 font-mono text-[10px] font-bold flex items-center justify-center border bg-emerald-500 text-black border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] rounded-lg">
                {skill.iconName}
              </div>
              <h4 className="text-white font-mono uppercase font-bold text-xs">{skill.name}</h4>
            </div>
            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/5">
              {skill.category}
            </span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            {skill.description}
          </p>

          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg text-[9px] font-mono text-slate-400 flex flex-col gap-1">
            <div><span className="text-emerald-300">Application:</span> Production grade codebases.</div>
            <div><span className="text-emerald-300">Status:</span> Fluent development capacity.</div>
          </div>
        </div>
      );
    }

    if (nearStation === "contact") {
      return (
        <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 p-6 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col gap-5 text-slate-300 max-h-[60vh] md:max-h-[75vh]">
          <div className="border-b border-white/10 pb-3 flex flex-col gap-1">
            <h3 className="text-white font-mono uppercase font-bold text-xs flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-400" /> Sign Shrine Registry
            </h3>
            <p className="text-slate-400 text-[10px] leading-snug">Leave a message in my guestbook! Your logs will sync to the server.</p>
          </div>

          {/* Guestbook Form */}
          <div className="overflow-y-auto pr-1 flex flex-col gap-4 flex-1">
            {guestSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-4 bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse mb-1.5" />
                <h4 className="text-white font-mono uppercase tracking-widest font-bold text-[10px]">Successfully Signed</h4>
                <p className="text-slate-400 text-[10px] mt-1">Thank you! Your entry has been recorded.</p>
                <button
                  onClick={() => setGuestSuccess(false)}
                  className="mt-3 text-[10px] bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-black font-bold rounded-md font-mono uppercase tracking-wider border-none"
                >
                  Write Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleGuestbookSubmit} className="flex flex-col gap-2.5">
                {guestError && (
                  <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-900/50 p-2 rounded font-mono">
                    ⚠ {guestError}
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-black/60 border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all font-mono"
                    disabled={isSubmittingGuest}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-black/60 border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all font-mono"
                    disabled={isSubmittingGuest}
                  />
                </div>
                <div>
                  <textarea
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Registry Message..."
                    rows={2}
                    className="w-full bg-black/60 border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all font-mono resize-none"
                    disabled={isSubmittingGuest}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-lg text-center text-[9px] tracking-widest uppercase font-mono transition-all cursor-pointer border-none"
                  disabled={isSubmittingGuest}
                >
                  {isSubmittingGuest ? "Saving..." : "Submit Message"}
                </button>
              </form>
            )}

            {/* List of recent visitors */}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold mb-1">Recent Visitors:</span>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                {guestbookEntries.length === 0 ? (
                  <div className="text-center text-slate-500 text-[10px] py-2 font-mono">
                    No registry logs found.
                  </div>
                ) : (
                  guestbookEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="bg-white/[0.02] border border-white/5 p-2 rounded-lg text-[10px]">
                      <div className="flex justify-between font-mono text-[9px] font-bold text-emerald-300">
                        <span>{entry.name}</span>
                        <span className="text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-400 mt-0.5 leading-snug italic">"{entry.message}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div id="ui-overlay-layer" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans select-none z-10">
      
      {/* ========================================================= */}
      {/* HEADER SECTION (Translucent Navigation, current location) */}
      {/* ========================================================= */}
      <div id="app-header" className="w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto bg-slate-950/65 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl shadow-2xl">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-950 to-black border border-emerald-500/40 text-emerald-400 font-mono font-bold flex items-center justify-center rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer" onClick={() => onTeleportToStation("spawn")}>
            AD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-mono uppercase font-bold text-xs tracking-wider leading-none">Akhilesh Dev</h1>
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">{getActiveLocationText()}</span>
            </div>
            <p className="text-[8px] uppercase font-mono tracking-widest text-slate-400 mt-1">Full Stack & 3D Interactive Portfolio</p>
          </div>
        </div>

        {/* Teleporter tabs */}
        <div className="flex items-center gap-1.5">
          {[
            { name: "Origins", key: "spawn", label: "Origins" },
            { name: "Wisdom", key: "about", label: "Wisdom" },
            { name: "Creation", key: "projects", label: "Creation" },
            { name: "Masteries", key: "skills", label: "Masteries" },
            { name: "Connections", key: "contact", label: "Connections" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTeleportToStation(tab.key)}
              className="flex items-center gap-1 bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer pointer-events-auto"
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setShowHelp(true)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white p-1.5 rounded-lg transition-all cursor-pointer pointer-events-auto"
            title="Help Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MIDDLE CONTAINER (Slide-in Sidebar Panels) */}
      {/* ========================================================= */}
      <div id="middle-viewport-ui" className="flex-1 w-full flex items-center justify-end my-4 min-h-0 relative">
        <div className="w-full max-w-sm pointer-events-auto animate-slide-in">
          {renderContextualPanel()}
        </div>
      </div>

      {/* ========================================================= */}
      {/* FOOTER SECTION (Mini Coordinates display & Quick link list) */}
      {/* ========================================================= */}
      <div id="app-footer" className="w-full flex items-center justify-between pointer-events-auto bg-slate-950/45 backdrop-blur-sm border border-white/5 px-4 py-2.5 rounded-xl text-[9px] font-mono text-slate-400">
        <div>
          <span>EXPLORER POS: {Math.round(playerX)}, {Math.round(playerZ)}</span>
        </div>

        <div className="flex gap-4">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-all cursor-pointer">
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-all cursor-pointer">
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </a>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HELP GUIDE OVERLAY */}
      {/* ========================================================= */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-[#0b111e] border border-emerald-500/20 w-full max-w-md p-6 rounded-2xl shadow-2xl flex flex-col text-slate-300">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-white font-mono uppercase tracking-widest font-bold text-xs flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" /> Interactive Guide
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-[11px] leading-relaxed font-mono">
              <p className="text-slate-400">Welcome to Akhilesh Dev's 3D Portfolio world! Use your character to roam around and explore sections dynamically.</p>
              
              <div>
                <h4 className="text-emerald-400 font-bold mb-1 uppercase text-[10px] tracking-wider">🎮 Movement:</h4>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-slate-400">
                  <li>Keyboard <span className="text-white font-bold">W A S D</span> or arrow keys to move.</li>
                  <li>Click and <span className="text-white font-bold">drag the mouse</span> (or swipe on screen) to look around.</li>
                  <li>Hold <span className="text-white font-bold">Shift</span> while walking to sprint.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-emerald-400 font-bold mb-1 uppercase text-[10px] tracking-wider">🌿 Space Exploration:</h4>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-slate-400">
                  <li>Follow the open lawns to travel between different shrines.</li>
                  <li>Approach the stone arches, floating leaves, or standing monoliths: detailed panels load automatically.</li>
                  <li>Teleport instantly using tabs at the top of the screen.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
