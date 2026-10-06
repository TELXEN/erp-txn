import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Recarga única cuando un módulo de página no se puede descargar (versión desactualizada tras una actualización).
const RELOAD_KEY = "chunk-reload-at";
function recargarSiModuloFalla(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) return false;
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - last < 10000) return false;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    recargarSiModuloFalla((e as Event & { payload?: unknown }).payload ?? "Failed to fetch dynamically imported module");
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (recargarSiModuloFalla(e.reason)) e.preventDefault();
  });
  window.addEventListener("error", (e) => {
    recargarSiModuloFalla(e.error ?? e.message);
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (err) => {
      if (typeof window !== "undefined") recargarSiModuloFalla(err);
    },
  });

  return router;
};
