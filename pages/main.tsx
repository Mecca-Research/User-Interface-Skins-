import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NexusApp } from "@/components/nexus/NexusApp";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AuthProvider } from "@/lib/auth/provider";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <PreviewHostBridge />
    <AuthProvider>
      <NexusApp />
    </AuthProvider>
  </StrictMode>,
);
