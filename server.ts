import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GuestbookEntry, UserProgress } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Database initialization
  const DB_DIR = path.join(process.cwd(), "data");
  const DB_FILE = path.join(DB_DIR, "db.json");

  function readDB(): { guestbook: GuestbookEntry[]; progress: Record<string, UserProgress> } {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const defaultDB = {
        guestbook: [
          {
            id: "g-1",
            name: "Linus Torvalds",
            email: "torvalds@linuxfoundation.org",
            message: "Excellent 3D work! The character controls are fluid and the tech-stack shrine looks amazing. Code looks highly modular too.",
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
          },
          {
            id: "g-2",
            name: "Grace Hopper",
            email: "grace@navy.mil",
            message: "I love exploring portfolios in 3D. Truly interactive and elegant layout! Keep building great things.",
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ],
        progress: {}
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf8");
      return defaultDB;
    }
    try {
      const content = fs.readFileSync(DB_FILE, "utf8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse database, recovering with empty data", e);
      return { guestbook: [], progress: {} };
    }
  }

  function writeDB(data: any) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to write to database file", e);
    }
  }

  // --- API Endpoints ---

  // Guestbook
  app.get("/api/guestbook", (req, res) => {
    const db = readDB();
    // Sort guestbook entries: newest first
    const sorted = [...db.guestbook].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  });

  app.post("/api/guestbook", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const db = readDB();
    const newEntry: GuestbookEntry = {
      id: "g-" + Math.random().toString(36).substring(2, 9),
      name: name.trim().slice(0, 100),
      email: email.trim().slice(0, 150),
      message: message.trim().slice(0, 1000),
      createdAt: new Date().toISOString()
    };

    db.guestbook.push(newEntry);
    writeDB(db);

    res.json({ success: true, entry: newEntry });
  });

  // User Progress
  app.get("/api/progress/:userId", (req, res) => {
    const { userId } = req.params;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const db = readDB();
    let userProgress = db.progress[userId];

    if (!userProgress) {
      // Create default progress
      userProgress = {
        userId,
        nickname: "Player " + Math.floor(1000 + Math.random() * 9000),
        visitedStations: [],
        unlockedSkills: [],
        guestbookSigned: false,
        score: 0,
        updatedAt: new Date().toISOString()
      };
      db.progress[userId] = userProgress;
      writeDB(db);
    }

    res.json(userProgress);
  });

  app.post("/api/progress/:userId", (req, res) => {
    const { userId } = req.params;
    const progressData = req.body as Partial<UserProgress>;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const db = readDB();
    const currentProgress = db.progress[userId] || {
      userId,
      nickname: "Player " + Math.floor(1000 + Math.random() * 9000),
      visitedStations: [],
      unlockedSkills: [],
      guestbookSigned: false,
      score: 0,
      updatedAt: new Date().toISOString()
    };

    const updated: UserProgress = {
      ...currentProgress,
      ...progressData,
      userId, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    };

    // Keep unique elements in lists
    updated.visitedStations = Array.from(new Set(updated.visitedStations));
    updated.unlockedSkills = Array.from(new Set(updated.unlockedSkills));

    // Recalculate score based on actions
    // visited stations = 10xp each, unlocked skills = 5xp each, guestbook signed = 25xp
    const visitScore = updated.visitedStations.length * 10;
    const skillScore = updated.unlockedSkills.length * 5;
    const guestbookScore = updated.guestbookSigned ? 25 : 0;
    updated.score = visitScore + skillScore + guestbookScore;

    db.progress[userId] = updated;
    writeDB(db);

    res.json(updated);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Serve static or Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server listening on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
