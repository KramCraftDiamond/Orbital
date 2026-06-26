import { createElement } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "../components/layout/AppShell";
import { AuditTrailPage } from "../pages/AuditTrailPage";
import { CommandCenterPage } from "../pages/CommandCenterPage";
import { DepartmentsPage } from "../pages/DepartmentsPage";
import { EvidencePortalPage } from "../pages/EvidencePortalPage";
import { LoginPage } from "../pages/LoginPage";
import { MAPCardsPage } from "../pages/MAPCardsPage";
import { ObligationReviewPage } from "../pages/ObligationReviewPage";
import { PolicyComparatorPage } from "../pages/PolicyComparatorPage";
import { SettingsPage } from "../pages/SettingsPage";
import { UploadPage } from "../pages/UploadPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/app",
    Component: AppShell,
    children: [
      { index: true, Component: CommandCenterPage },
      { path: "upload", Component: UploadPage },
      { path: "obligations", Component: ObligationReviewPage },
      { path: "maps", Component: MAPCardsPage },
      { path: "evidence", Component: EvidencePortalPage },
      { path: "audit", Component: AuditTrailPage },
      { path: "departments", Component: DepartmentsPage },
      { path: "comparator", Component: PolicyComparatorPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
  {
    path: "*",
    element: createElement(Navigate, { to: "/app", replace: true }),
  },
]);
