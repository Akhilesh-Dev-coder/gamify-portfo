import React, { useRef, useState, useEffect } from "react";

export interface JoystickVector {
  x: number;
  y: number;
}

interface JoystickProps {
  onChange: (vector: JoystickVector) => void;
}

export default function Joystick({ onChange }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const maxDistance = 40; // Max drag radius in pixels

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let finalX = dx;
    let finalY = dy;

    if (distance > maxDistance) {
      finalX = (dx / distance) * maxDistance;
      finalY = (dy / distance) * maxDistance;
    }

    setKnobPosition({ x: finalX, y: finalY });

    // Normalize to range [-1, 1]
    onChange({
      x: finalX / maxDistance,
      y: -finalY / maxDistance, // Invert Y so up is positive
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  // Setup global event listeners to handle touches cleanly even if they slide outside the container
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      if (isDragging) handleEnd();
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      id="mobile-joystick-container"
      className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center relative touch-none select-none shadow-2xl"
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      {/* Outer ring guide */}
      <div className="absolute inset-2 rounded-full border border-cyan-500/10 pointer-events-none" />

      {/* Interactive knob */}
      <div
        id="mobile-joystick-knob"
        className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-transparent border border-white/30 flex items-center justify-center shadow-2xl transition-transform duration-75 active:scale-95 cursor-pointer"
        style={{
          transform: `translate(${knobPosition.x}px, ${knobPosition.y}px)`,
          boxShadow: isDragging ? "0 0 20px rgba(6, 182, 212, 0.5)" : undefined,
          borderColor: isDragging ? "rgba(6,182,212,0.5)" : undefined,
        }}
      >
        <div className={`w-2 h-2 rounded-full ${isDragging ? "bg-cyan-400 animate-pulse" : "bg-white/40"}`} />
      </div>
    </div>
  );
}
