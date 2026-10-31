import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PantallaCarga } from "./components/PantallaCarga";

// Recarga cuando el navegador conserva módulos incompatibles tras una actualización en caliente.
const RELOAD_KEY = "chunk-reload-at";
const MAX_INTENTOS = 3;
const VENTANA_MS = 90000;
function recargarSiModuloFalla(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  const moduloDesactualizado = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Cannot read properties of undefined \(reading ['"]component['"]\)/i.test(msg);
  const reactDesactualizado = /Cannot read properties of null \(reading ['"](?:useContext|useState|useEffect)['"]\)|Invalid hook call/i.test(msg);
  if (!moduloDesactualizado && !reactDesactualizado) return false;
  // Permite varias recargas en una ventana corta: una sola a veces no basta si el
  // navegador conserva varios módulos desactualizados encadenados.
  const raw = sessionStorage.getItem(RELOAD_KEY) ?? "0:0";
  const [firstAt = 0, count = 0] = raw.split(":").map(Number);
  const now = Date.now();
  if (now - firstAt < VENTANA_MS && count >= MAX_INTENTOS) return false;
  sessionStorage.setItem(RELOAD_KEY, now - firstAt < VENTANA_MS ? `${firstAt}:${count + 1}` : `${now}:1`);
  // Recarga con un parámetro nuevo para no reutilizar módulos en caché que
  // siguen apuntando a la versión anterior (la causa de la pantalla en blanco).
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(now));
  window.location.replace(url.toString());
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

// Último recurso: si las recargas automáticas no bastaron, muestra un aviso en
// vez de dejar la pantalla en blanco.
function PantallaError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-lg font-semibold text-foreground">No se pudo cargar esta pantalla</p>
      <p className="max-w-md text-sm text-muted-foreground">
        La aplicación se actualizó mientras navegabas. Recarga la página para continuar.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Recargar
      </button>
    </div>
  );
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
    defaultErrorComponent: PantallaError,
    defaultOnCatch: (err) => {
      if (typeof window !== "undefined" && recargarSiModuloFalla(err)) return;
      throw err;
    },
  });

  return router;
};
