// migrate-helper — endpoint vacío, lista para completar.
// Equivalente en este proyecto a una "edge function": ruta de servidor de TanStack.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/migrate-helper")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ ok: true, funcion: "migrate-helper" }),
    },
  },
});
