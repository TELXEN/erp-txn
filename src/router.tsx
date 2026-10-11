import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PantallaCarga } from "./components/PantallaCarga";

// Recarga única cuando el navegador conserva módulos incompatibles tras una actualización en caliente.
const RELOAD_KEY = "chunk-reload-at";
function recargarSiModuloFalla(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  const moduloDesactualizado = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
  const reactDesactualizado = /Cannot read properties of null \(reading ['"](?:useContext|useState|useEffect)['"]\)|Invalid hook call/i.test(msg);
  if (!moduloDesactualizado && !reactDesactualizado) return false;
  // Permite hasta 2 recargas en 60 s: una sola recarga a veces no basta si el
  // navegador conserva varios módulos desactualizados encadenados.
  const raw = sessionStorage.getItem(RELOAD_KEY) ?? "0:0";
  const [firstAt = 0, count = 0] = raw.split(":").map(Number);
  const now = Date.now();
  if (now - firstAt < 60000 && count >= 2) return false;
  sessionStorage.setItem(RELOAD_KEY, now - firstAt < 60000 ? `${firstAt}:${count + 1}` : `${now}:1`);
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
    defaultPendingComponent: () => <PantallaCarga />,
    defaultPendingMs: 200,
    defaultOnCatch: (err) => {
      if (typeof window !== "undefined") recargarSiModuloFalla(err);
    },
  });

  return router;
};
