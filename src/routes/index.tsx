import { createFileRoute } from "@tanstack/react-router";
import { NexusApp } from "@/components/nexus/NexusApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NexusApp />;
}
