import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { TaskFeed } from "./components/TaskFeed";
import { Leaderboard } from "./components/Leaderboard";
import { EvidencePortal } from "./components/EvidencePortal";
import { AuditTrail } from "./components/AuditTrail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "tasks", Component: TaskFeed },
      { path: "leaderboard", Component: Leaderboard },
      { path: "evidence", Component: EvidencePortal },
      { path: "audit", Component: AuditTrail },
    ],
  },
]);
