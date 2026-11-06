import { createFileRoute } from "@tanstack/react-router";
import { saveRoute } from "@/lib/cloud-save-server";

const handle = ({ request }: { request: Request }) => saveRoute(request);

export const Route = createFileRoute("/api/save")({
  server: { handlers: { GET: handle, PUT: handle, DELETE: handle, OPTIONS: handle } },
});
