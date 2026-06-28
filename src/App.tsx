/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import GameCanvas from "./components/GameCanvas";
import Joystick, { JoystickVector } from "./components/Joystick";
import UIOverlays from "./components/UIOverlays";
import { UserProgress, GuestbookEntry } from "./types";

export default function App() {
  // Coordinates and angle for Minimap tracking
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, angle: 0 });
  const [nearStation, setNearStation] = useState<string | null>(null);

  // Mobile virtual joystick input vector
  const [joystickVector, setJoystickVector] = useState<JoystickVector>({ x: 0, y: 0 });
  const [isRunningMobile, setIsRunningMobile] = useState(false);

  // Interaction trigger to signal the GameCanvas to fire an event
  const [triggerInteraction, setTriggerInteraction] = useState<string | null>(null);

  // Guestbook and Progress Database records
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    userId: "",
    nickname: "Player",
    visitedStations: [],
    unlockedSkills: [],
    guestbookSigned: false,
    score: 0,
    updatedAt: new Date().toISOString(),
  });

  // Check if device is mobile to enable on-screen joystick
  useEffect(() => {
    const checkMobile = () => {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;
      setIsRunningMobile(isMobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize or fetch unique userId
  useEffect(() => {
    const fetchSessionData = async () => {
      // Get or create unique anonymous user session ID in client storage
      let uid = localStorage.getItem("magi_portfolio_uid");
      if (!uid) {
        uid = "u-" + Math.random().toString(36).substring(2, 9);
        localStorage.setItem("magi_portfolio_uid", uid);
      }

      try {
        // 1. Get/Create User progress record from Express SQLite/JSON DB
        const progressRes = await fetch(`/api/progress/${uid}`);
        if (progressRes.ok) {
          const progressData = (await progressRes.json()) as UserProgress;
          setUserProgress(progressData);
        }

        // 2. Load public guestbook visitor logs
        const guestbookRes = await fetch("/api/guestbook");
        if (guestbookRes.ok) {
          const guestbookData = (await guestbookRes.json()) as GuestbookEntry[];
          setGuestbookEntries(guestbookData);
        }
      } catch (e) {
        console.error("Connection to portfolio backend failed, using localized memory state.", e);
        // Fail-safe default progress state
        setUserProgress({
          userId: uid,
          nickname: "Offline Explorer",
          visitedStations: [],
          unlockedSkills: [],
          guestbookSigned: false,
          score: 0,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    fetchSessionData();
  }, []);

  // Persistent save handler to push updates to backend
  const updateProgress = async (updatedFields: Partial<UserProgress>) => {
    if (!userProgress.userId) return;

    // Local update first (optimistic UI render)
    const localUpdated = { ...userProgress, ...updatedFields };
    setUserProgress(localUpdated);

    try {
      const res = await fetch(`/api/progress/${userProgress.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        const syncedProgress = (await res.json()) as UserProgress;
        setUserProgress(syncedProgress);
      }
    } catch (e) {
      console.warn("Could not sync progress to database server. Kept local memory copy.", e);
    }
  };

  // Teleport or force-walk avatar to station (optional fun feature or quick navigation helper)
  const handleTeleportToStation = (stationName: string) => {
    // If we want to simulate an interaction trigger directly when they click navigation tabs:
    setTriggerInteraction(stationName);
    // Reset trigger immediately after
    setTimeout(() => setTriggerInteraction(null), 100);
  };

  // Sign Guestbook submit handler
  const handleSignGuestbook = async (
    name: string,
    email: string,
    message: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        // Re-fetch updated guestbook entries to render live logs list
        const guestbookRes = await fetch("/api/guestbook");
        if (guestbookRes.ok) {
          const guestbookData = (await guestbookRes.json()) as GuestbookEntry[];
          setGuestbookEntries(guestbookData);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sign guestbook server record:", e);
      return false;
    }
  };

  // Handle triggered interaction from the bottom action button (for mobile or click)
  const handleTriggerMobileInteraction = () => {
    if (nearStation) {
      setTriggerInteraction(nearStation);
      setTimeout(() => setTriggerInteraction(null), 50);
    }
  };

  return (
    <div id="portfolio-root" className="relative w-screen h-screen bg-[#0c1524] text-white font-sans overflow-hidden select-none">
      
      {/* Atmosphere Gradient Backdrop & Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/15 via-transparent to-[#0c1524]/60"></div>
        {/* System Scanlines/Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))", backgroundSize: "100% 4px, 3px 100%" }}></div>
      </div>

      {/* 3D WebGL Canvas Layer */}
      <div id="canvas-container-layer" className="absolute inset-0 w-full h-full z-0">
        <GameCanvas
          onPositionUpdate={(x, z, angle) => setPlayerPos({ x, z, angle })}
          onNearStation={(station) => setNearStation(station)}
          triggerInteraction={triggerInteraction}
          onInteractionTriggered={(station) => {
            // Signal navigation or toggle corresponding modal panel directly from 3D zone trigger!
            const element = document.getElementById("ui-overlay-layer");
            if (element) {
              // Clicking the modal triggers click events
              const buttons = element.querySelectorAll("button");
              buttons.forEach((btn) => {
                if (btn.innerText.toLowerCase().includes(station.toLowerCase()) || 
                    (station === "contact" && btn.innerText.toLowerCase().includes("guestbook"))) {
                  (btn as HTMLButtonElement).click();
                }
              });
            }
          }}
          joystickVector={joystickVector}
          isRunningMobile={isRunningMobile}
        />
      </div>

      {/* On-screen touch D-pad overlay on mobile */}
      {isRunningMobile && (
        <div id="mobile-joystick-touchzone" className="absolute bottom-6 left-6 z-20 pointer-events-auto">
          <Joystick onChange={(v) => setJoystickVector(v)} />
        </div>
      )}

      {/* 2D HUD UI Overlays (Header, Minimap, Objectives, Modals, Action Prompt) */}
      <UIOverlays
        playerX={playerPos.x}
        playerZ={playerPos.z}
        cameraYaw={playerPos.angle}
        nearStation={nearStation}
        userProgress={userProgress}
        onUpdateProgress={updateProgress}
        onTeleportToStation={handleTeleportToStation}
        guestbookEntries={guestbookEntries}
        onSignGuestbook={handleSignGuestbook}
        onTriggerMobileInteraction={handleTriggerMobileInteraction}
      />

    </div>
  );
}
