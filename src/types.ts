export interface Project {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  image: string; // Color preset or gradient or generated representation
  tags: string[];
  demoUrl?: string;
  githubUrl?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface Skill {
  id: string;
  name: string;
  category: "Frontend" | "Backend" | "DevOps" | "Database";
  iconName: string;
  description: string;
  unlockedAtProgress: number; // Required score or progression to unlock
}

export interface GuestbookEntry {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export interface UserProgress {
  userId: string;
  nickname: string;
  visitedStations: string[]; // "about" | "projects" | "skills" | "contact"
  unlockedSkills: string[];  // skill IDs
  guestbookSigned: boolean;
  score: number;             // Calculated score or XP
  updatedAt: string;
}
