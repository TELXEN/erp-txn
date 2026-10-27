import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const RanuraEncabezado = createContext<HTMLElement | null>(null);
import { FormatoGlobal } from "@/components/FormatoGlobal";
import { ReciboCodigoBarras, NominaBoletas } from "@/components/icons";
import { Calculator, ChevronDown, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2 } from "lucide-react";

function BotonPantallaCompleta() {
  const [activa, setActiva] = useState(false);
  useEffect(() => {
    const actualizar = () => setActiva(!!document.fullscreenElement);
    actualizar();
    document.addEventListener("fullscreenchange", actualizar);
    return () => document.removeEventListener("fullscreenchange", actualizar);
  }, []);
  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const etiqueta = activa ? "Salir de pantalla completa" : "Pantalla completa";
  return (
    <button
      type="button"
      onClick={alternar}
      title={etiqueta}
      aria-label={etiqueta}
      className="grid size-7 place-items-center rounded-md text-brand-foreground/70 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground"
    >
      {activa ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
    </button>
  );
}
import {
  Activity,
  ChartGantt,
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  ClipboardList,
  ClipboardCheck,
  FileText,
  FileCheck,
  Gauge,
  ShoppingBag,
  Landmark,
  Palette,
  Layers,
  Package,
  ShoppingCart,
  Plane,
  Warehouse,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Handshake,
  Truck,
  Users,
  ReceiptText,
  HandCoins,
  Wallet,
  ShieldCheck,
  FolderClosed,
  HardHat,
  PackageCheck,
  ClipboardPen,
  Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";
import { aplicarTema, leerTema } from "@/lib/temas";
import { aplicarFuenteGlobal, useFuenteDocumento } from "@/lib/fuentes-documentos";


type Item = { a: string; texto: string; roles: Rol[]; icono: React.ElementType; hijos?: Item[] };
type Categoria = { titulo: string; items: Item[] };

const MENU: Categoria[] = [
  {
    titulo: "Comercial",
    items: [
      { a: "/clientes", texto: "Clientes", roles: ["administrador", "gerente"], icono: Users },
      { a: "/datos-apu", texto: "Análisis de Precios Unitarios (APU)", roles: ["administrador", "gerente"], icono: Calculator },
      { a: "/cotizaciones", texto: "Cotizaciones", roles: ["administrador", "gerente"], icono: FileText },
      { a: "/valorizaciones", texto: "Preliquidaciones", roles: ["administrador", "gerente"], icono: Banknote },
      { a: "/facturacion-electronica", texto: "Facturación Electrónica", roles: ["administrador", "gerente"], icono: ReciboCodigoBarras },
      { a: "/registro-ventas", texto: "Registro de Ventas", roles: ["administrador", "gerente"], icono: FolderClosed },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { a: "/dashboard-proyectos", texto: "Dashboard Proyectos", roles: ["ingeniero", "administrador", "gerente"], icono: Gauge },
      { a: "/proyectos", texto: "Proyectos", roles: ["administrador", "gerente"], icono: Building2 },
      { a: "/partidas", texto: "Partidas", roles: ["administrador", "gerente"], icono: Layers },
      { a: "/gantt", texto: "Gantt y Curva S", roles: ["ingeniero", "administrador", "gerente"], icono: ChartGantt },
      { a: "/avance", texto: "Avance Físico", roles: ["ingeniero", "gerente"], icono: Activity },
      { a: "/generar-requerimiento", texto: "Generar Requerimiento", roles: ["ingeniero", "administrador", "gerente"], icono: ClipboardPen },
      { a: "/valorizaciones-obra", texto: "Valorizaciones", roles: ["ingeniero", "administrador", "gerente"], icono: ClipboardCheck },
      { a: "/aprobaciones", texto: "Aprobaciones", roles: ["administrador", "gerente"], icono: ShieldCheck },
    ],
  },
  {
    titulo: "Logística",
    items: [
      { a: "/proveedores", texto: "Proveedores", roles: ["administrador", "gerente"], icono: Handshake },
      { a: "/requerimientos", texto: "Bandeja de Requerimientos", roles: ["administrador", "gerente"], icono: Inbox },
      { a: "/ordenes-compra", texto: "Órdenes de Compra", roles: ["administrador", "gerente"], icono: ShoppingCart },
      { a: "/importaciones", texto: "Importaciones", roles: ["administrador", "gerente"], icono: Plane },
      { a: "/transportistas", texto: "Transportistas", roles: ["administrador", "gerente"], icono: Truck },
      { a: "/almacen", texto: "Almacén", roles: ["ingeniero", "administrador", "gerente"], icono: Warehouse },
      { a: "/inventario", texto: "Inventario", roles: ["administrador", "gerente"], icono: Package },
      { a: "/vehiculos", texto: "Vehículos", roles: ["ingeniero", "administrador", "gerente"], icono: Car },
    ],
  },
  {
    titulo: "Finanzas y Contabilidad",
    items: [
      { a: "/dashboard", texto: "Dashboard Financiero", roles: ["gerente"], icono: BarChart3 },
      { a: "/gastos-directos", texto: "Costos Directos", roles: ["administrador", "gerente"], icono: ShoppingBag },
      { a: "/gastos-generales", texto: "Gastos Generales", roles: ["administrador", "gerente"], icono: Briefcase },
      { a: "/caja-chica", texto: "Caja Chica", roles: ["administrador", "gerente"], icono: Wallet },
      { a: "/tesoreria", texto: "Tesorería", roles: ["administrador", "gerente"], icono: Landmark },
      { a: "/flujo-caja", texto: "Flujo de Caja", roles: ["administrador", "gerente"], icono: TrendingUp },
      { a: "/sire", texto: "SIRE SUNAT", roles: ["administrador", "gerente"], icono: FileCheck },
    ],
  },
  {
    titulo: "Recursos Humanos",
    items: [
      { a: "/personal", texto: "Personal", roles: ["administrador", "gerente"], icono: Users },
      { a: "/tareo", texto: "Control de Asistencia", roles: ["administrador", "gerente"], icono: CalendarDays },
      {
        a: "#epp", texto: "Gestión de EPP", roles: ["administrador", "gerente"], icono: HardHat,
        hijos: [
          { a: "/epp-banco", texto: "Banco de Datos de EPP", roles: ["administrador", "gerente"], icono: ClipboardList },
          { a: "/epp-entregas", texto: "Asignación y Entrega", roles: ["administrador", "gerente"], icono: PackageCheck },
          { a: "/epp-historial", texto: "Historial por Empleado", roles: ["administrador", "gerente"], icono: BarChart3 },
        ],
      },
      { a: "/nomina", texto: "Boletas de Pago", roles: ["administrador", "gerente"], icono: NominaBoletas },
      { a: "/honorarios", texto: "Recibos por Honorarios", roles: ["administrador", "gerente"], icono: ReceiptText },
      { a: "/beneficios", texto: "Beneficios Sociales", roles: ["administrador", "gerente"], icono: HandCoins },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { a: "/datos", texto: "Catalogos Maestros", roles: ["administrador", "gerente"], icono: Settings },
      { a: "/catalogo-tecnico", texto: "Catálogo Técnico", roles: ["administrador", "gerente"], icono: Layers },
      { a: "/maestro-insumos", texto: "Maestro de Insumos", roles: ["administrador", "gerente"], icono: PackageCheck },
      { a: "/configuracion-sistema", texto: "Configuración del Sistema", roles: ["gerente"], icono: SlidersHorizontal },
    ],
  },
  {
    titulo: "Temas de colores",
    items: [
      { a: "/tema-colores", texto: "Temas de colores", roles: ["ingeniero", "administrador", "gerente"], icono: Palette },
    ],
  },
];


const LS_KEY = "erp-telxen-menu-abierta";

function SubgrupoMenu({ item, pathname }: { item: Item; pathname: string }) {
  const contieneActiva = !!item.hijos?.some((h) => h.a === pathname);
  const [abierto, setAbierto] = useState(contieneActiva);
  useEffect(() => { if (contieneActiva) setAbierto(true); }, [contieneActiva]);
  const Icono = item.icono;
  return (
    <div>
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-hover ${contieneActiva ? "font-semibold" : ""}`}>
        <Icono className="size-4 shrink-0 opacity-90" />
        <span className="flex-1">{item.texto}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${abierto ? "" : "-rotate-90"}`} />
      </button>
      {abierto && (
        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-2">
          {item.hijos!.map((h) => {
            const activo = pathname === h.a;
            const IH = h.icono;
            return (
              <Link key={h.a} to={h.a}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${activo ? "bg-cta font-semibold text-cta-foreground" : "text-sidebar-foreground hover:bg-sidebar-hover"}`}>
                <IH className="size-3.5 shrink-0 opacity-90" />
                <span>{h.texto}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function leerAbierta(): string | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return typeof raw === "string" && raw ? raw : null;
  } catch {
    return null;
  }
}

const dbShell = supabase as unknown as { from: (t: string) => any };

/** Total de pendientes en Aprobaciones: requerimientos enviados a Gerencia + solicitudes de desbloqueo. */
function usePendientesAprobacion(rol: Rol | null) {
  return useQuery({
    queryKey: ["aprobaciones-pendientes"],
    enabled: rol === "gerente" || rol === "administrador",
    refetchInterval: 30_000,
    queryFn: async () => {
      const [req, sol] = await Promise.all([
        dbShell.from("requerimientos").select("id", { count: "exact", head: true }).eq("estado", "Enviado a Gerencia"),
        dbShell.from("solicitudes_desbloqueo").select("id", { count: "exact", head: true }).eq("estado", "Pendiente"),
      ]);
      return (req.count ?? 0) + (sol.count ?? 0);
    },
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { nombre, email, rol } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: configuracionDocumentos } = useFuenteDocumento();
  const { data: pendientesAprobacion = 0 } = usePendientesAprobacion(rol);


  const categorias = MENU.map((c) => ({
    ...c,
    items: c.items.filter((m) => (rol ? m.roles.includes(rol) : false)),
  })).filter((c) => c.items.length > 0);

  const [abierta, setAbierta] = useState<string | null>(null);
  const [ranura, setRanura] = useState<HTMLDivElement | null>(null);
  const [colapsado, setColapsado] = useState(false);
  useEffect(() => {
    try { setColapsado(window.localStorage.getItem("erp-telxen-sidebar-colapsado") === "1"); } catch { /* */ }
  }, []);
  function alternarPanel() {
    setColapsado((v) => {
      try { window.localStorage.setItem("erp-telxen-sidebar-colapsado", v ? "0" : "1"); } catch { /* */ }
      return !v;
    });
  }

  useEffect(() => {
    aplicarTema(leerTema());
    setAbierta(leerAbierta());
  }, []);

  useEffect(() => {
    if (!configuracionDocumentos) return;
    aplicarFuenteGlobal(configuracionDocumentos?.fuente_pdf);
  }, [configuracionDocumentos?.fuente_pdf]);

  function alternarCategoria(titulo: string) {
    setAbierta((prev) => {
      const siguiente = prev === titulo ? null : titulo;
      try {
        if (siguiente) {
          window.localStorage.setItem(LS_KEY, siguiente);
        } else {
          window.localStorage.removeItem(LS_KEY);
        }
      } catch {
        // almacenamiento no disponible
      }
      return siguiente;
    });
  }

  function estaAbierta(c: Categoria): boolean {
    if (c.items.some((m) => pathname === m.a || m.hijos?.some((h) => h.a === pathname))) return true;
    return abierta === c.titulo;
  }

  const iniciales = (nombre || email || "??").slice(0, 2).toUpperCase();

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className={`min-h-screen w-full text-ink md:h-screen md:overflow-hidden ${colapsado ? "md:[--app-sidebar-width:56px]" : "md:[--app-sidebar-width:236px]"}`}>
      <FormatoGlobal />
      <aside className="no-print flex min-h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:z-30 md:h-screen md:min-h-0 md:w-[var(--app-sidebar-width)] md:overflow-hidden">
        <div className={`flex h-12 shrink-0 items-center gap-2.5 border-b border-sidebar-border ${colapsado ? "justify-center px-2" : "px-5"}`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-cta font-mono text-sm font-bold text-cta-foreground">
            TXN
          </span>
          <div className={`min-w-0 leading-none ${colapsado ? "hidden" : ""}`}>
            <p className="text-sm font-bold tracking-tight">ERP TELXEN SAC</p>
            <p className="mt-1 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">Gestión de Proyectos</p>
          </div>
        </div>

        <div className={`flex flex-1 flex-col py-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain ${colapsado ? "px-2" : "px-3"}`}>
          <div className={`flex items-center pb-2 ${colapsado ? "justify-center" : "justify-between px-2"}`}>
            {!colapsado && <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">Módulos</p>}
            <button
              type="button"
              onClick={alternarPanel}
              title={colapsado ? "Abrir panel" : "Colapsar panel"}
              aria-label={colapsado ? "Abrir panel de navegación" : "Colapsar panel de navegación"}
              className="hidden size-6 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground md:grid"
            >
              {colapsado ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>
          {colapsado ? (
            <nav className="hidden flex-col items-center gap-1 md:flex">
              {categorias.flatMap((c) => c.items).flatMap((m) => m.hijos ?? [m]).map((m) => {
                const Icono = m.icono;
                const activo = pathname === m.a;
                const distintivo = m.a === "/aprobaciones" ? pendientesAprobacion : 0;
                return (
                  <Link key={m.a} to={m.a} title={m.texto} aria-label={m.texto}
                    className={`relative grid size-9 place-items-center rounded-md ${activo ? "bg-cta text-cta-foreground" : "text-sidebar-foreground hover:bg-sidebar-hover"}`}>
                    <Icono className="size-4" />
                    {distintivo > 0 && (
                      <span className="absolute -top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold leading-[14px] text-destructive-foreground">
                        {distintivo}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          <nav className={`space-y-2 text-sm ${colapsado ? "md:hidden" : ""}`}>
            {categorias.map((c) => {
              const abierta = estaAbierta(c);
              return (
                <div key={c.titulo}>
                  <button
                    type="button"
                    onClick={() => alternarCategoria(c.titulo)}
                    aria-expanded={abierta}
                    className="flex w-full items-center justify-between rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-hover hover:text-sidebar-foreground motion-reduce:transition-none"
                  >
                    <span>{c.titulo}</span>
                    <ChevronDown
                      className={`size-3.5 shrink-0 transition-transform duration-200 ${abierta ? "" : "-rotate-90"}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${abierta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="ml-2 space-y-1 overflow-hidden border-l border-sidebar-border pl-2">
                      {c.items.map((m) => {
                        const activo = pathname === m.a;
                        const Icono = m.icono;
                        if (m.hijos) return <SubgrupoMenu key={m.a} item={m} pathname={pathname} />;
                        const distintivo = m.a === "/aprobaciones" ? pendientesAprobacion : 0;
                        return (
                          <Link
                            key={m.a}
                            to={m.a}
                            className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors duration-200 motion-reduce:transition-none ${
                              activo ? "bg-cta font-semibold text-cta-foreground" : "text-sidebar-foreground hover:bg-sidebar-hover"
                            }`}
                          >
                            <Icono className="size-4 shrink-0 opacity-90" />
                            <span className="flex-1">{m.texto}</span>
                            {distintivo > 0 && (
                              <span className="grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold leading-[14px] text-destructive-foreground" title="Pendientes de aprobación">
                                {distintivo}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className={`mt-6 rounded-md border border-sidebar-border bg-sidebar-panel p-3 ${colapsado ? "md:hidden" : ""}`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">Rol activo</p>
            <p className="mt-1 text-sm font-semibold">{rol ? ETIQUETA_ROL[rol] : "Sin rol asignado"}</p>
            <p className="mt-1 font-mono text-[10px] text-sidebar-muted">
              {rol === "ingeniero" ? "Solo avance físico" : "Moneda base: PEN"}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:ml-[var(--app-sidebar-width)] md:h-screen md:min-h-0 md:w-[calc(100%-var(--app-sidebar-width))] md:overflow-hidden">
        <header className="no-print sticky top-0 z-20 flex min-h-12 shrink-0 items-center gap-3 border-b border-brand bg-brand px-4 py-1.5 text-brand-foreground">
          <div ref={setRanura} className="flex min-w-0 flex-1 items-center" />
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-cta text-xs font-semibold text-cta-foreground">
              {iniciales}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-semibold">{nombre || email}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-brand-foreground/70">
                {rol ? ETIQUETA_ROL[rol] : "Sin rol"}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="rounded-md border border-brand-foreground/25 px-3 py-1.5 font-mono text-xs text-brand-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            Cerrar Sesión
          </button>
          <BotonPantallaCompleta />
        </header>

        <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 md:min-h-0 md:overflow-y-auto md:overscroll-contain"><div className="mx-auto h-full w-full max-w-[1600px]"><RanuraEncabezado.Provider value={ranura}>{children}</RanuraEncabezado.Provider></div></main>
      </div>
    </div>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  acciones,
  className = "mb-3",
}: {
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
  className?: string;
}) {
  const ranura = useContext(RanuraEncabezado);
  if (ranura) {
    return createPortal(
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-base font-bold tracking-tight" title={subtitulo}>{titulo}</h1>
          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-brand-foreground/70">{subtitulo}</p>
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>,
      ranura,
    );
  }
  return (
    <div className={className}>
      <p className="label-mono mb-1">{subtitulo}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight md:text-xl lg:text-2xl">{titulo}</h1>
        {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
