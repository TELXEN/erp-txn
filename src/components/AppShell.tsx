import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Activity,
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  HardHat,
  Landmark,
  Layers,
  Package,
  ShoppingCart,
  Warehouse,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";
import { TEMAS, useTema } from "@/lib/temas";


type Item = { a: string; texto: string; roles: Rol[]; icono: React.ElementType };
type Categoria = { titulo: string; items: Item[] };

const MENU: Categoria[] = [
  {
    titulo: "REPORTES Y ANALISIS",
    items: [
      { a: "/dashboard", texto: "Dashboard Financiero", roles: ["gerente"], icono: BarChart3 },
      { a: "/dashboard-proyectos", texto: "Dashboard de Proyectos", roles: ["administrador", "gerente"], icono: Gauge },
    ],
  },
  {
    titulo: "Comercial",
    items: [
      { a: "/cotizaciones", texto: "Cotizaciones", roles: ["administrador", "gerente"], icono: FileText },
      { a: "/valorizaciones", texto: "Registro de Ventas", roles: ["administrador", "gerente"], icono: Banknote },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { a: "/proyectos", texto: "Proyectos", roles: ["administrador", "gerente"], icono: Building2 },
      { a: "/partidas", texto: "Partidas", roles: ["administrador", "gerente"], icono: Layers },
      { a: "/avance", texto: "Avance Físico", roles: ["ingeniero", "gerente"], icono: Activity },
      { a: "/tareo", texto: "Tareo Diario", roles: ["administrador", "gerente"], icono: CalendarDays },
    ],
  },
  {
    titulo: "Logística",
    items: [
      { a: "/requerimientos", texto: "Requerimientos", roles: ["ingeniero", "administrador", "gerente"], icono: ClipboardList },
      { a: "/ordenes-compra", texto: "Órdenes de Compra", roles: ["administrador", "gerente"], icono: ShoppingCart },
      { a: "/almacen", texto: "Almacén", roles: ["administrador", "gerente"], icono: Warehouse },
      { a: "/inventario", texto: "Inventario", roles: ["administrador", "gerente"], icono: Package },
    ],
  },
  {
    titulo: "Recursos Humanos",
    items: [
      { a: "/personal", texto: "Personal", roles: ["administrador", "gerente"], icono: Users },
    ],
  },
  {
    titulo: "Finanzas y Contabilidad",
    items: [
      { a: "/gastos-directos", texto: "Costos Directos", roles: ["administrador", "gerente"], icono: HardHat },
      { a: "/gastos-generales", texto: "Gastos Generales", roles: ["administrador", "gerente"], icono: Briefcase },
      { a: "/caja-chica", texto: "Caja Chica", roles: ["administrador", "gerente"], icono: Wallet },
      { a: "/tesoreria", texto: "Tesorería", roles: ["administrador", "gerente"], icono: Landmark },
      { a: "/flujo-caja", texto: "Flujo de Caja", roles: ["administrador", "gerente"], icono: TrendingUp },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { a: "/datos", texto: "Configuración", roles: ["administrador", "gerente"], icono: Settings },
      { a: "/usuarios", texto: "Usuarios y Roles", roles: ["gerente"], icono: ShieldCheck },
    ],
  },
];


const LS_KEY = "erp-telxen-menu-abiertas";

function leerAbiertas(): string[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { nombre, email, rol } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tema, cambiarTema } = useTema();


  const categorias = MENU.map((c) => ({
    ...c,
    items: c.items.filter((m) => (rol ? m.roles.includes(rol) : false)),
  })).filter((c) => c.items.length > 0);

  const [abiertas, setAbiertas] = useState<string[] | null>(null);

  useEffect(() => {
    setAbiertas(leerAbiertas());
  }, []);

  function alternarCategoria(titulo: string) {
    setAbiertas((prev) => {
      const actuales = prev ?? [];
      const siguientes = actuales.includes(titulo)
        ? actuales.filter((t) => t !== titulo)
        : [...actuales, titulo];
      try {
        window.localStorage.setItem(LS_KEY, JSON.stringify(siguientes));
      } catch {
        // almacenamiento no disponible
      }
      return siguientes;
    });
  }

  function estaAbierta(c: Categoria): boolean {
    if (c.items.some((m) => pathname === m.a)) return true;
    return abiertas?.includes(c.titulo) ?? false;
  }

  const iniciales = (nombre || email || "??").slice(0, 2).toUpperCase();

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen w-full text-ink">
      <header className="no-print sticky top-0 z-20 flex items-center gap-4 border-b border-brand bg-brand px-5 py-3 text-brand-foreground">
        <div className="flex w-[212px] shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-cta font-mono text-sm font-bold text-cta-foreground">
            TXN
          </span>
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight">ERP TELXEN SAC</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-foreground/70">Gestión de Proyectos</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-cta text-xs font-semibold text-cta-foreground">
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
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[236px_1fr]">
        <aside className="no-print border-r border-line bg-brand px-3 py-5 text-brand-foreground md:min-h-[calc(100vh-57px)]">
          <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary/60">Módulos</p>
          <nav className="space-y-2 text-sm">
            {categorias.map((c) => {
              const abierta = estaAbierta(c);
              return (
                <div key={c.titulo}>
                  <button
                    type="button"
                    onClick={() => alternarCategoria(c.titulo)}
                    aria-expanded={abierta}
                    className="flex w-full items-center justify-between rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-brand-foreground/60 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground"
                  >
                    <span>{c.titulo}</span>
                    <ChevronDown
                      className={`size-3.5 shrink-0 transition-transform duration-200 ${abierta ? "" : "-rotate-90"}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${abierta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="ml-2 space-y-1 overflow-hidden border-l border-brand-foreground/15 pl-2">
                      {c.items.map((m) => {
                        const activo = pathname === m.a;
                        const Icono = m.icono;
                        return (
                          <Link
                            key={m.a}
                            to={m.a}
                            className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
                              activo ? "bg-cta font-semibold text-cta-foreground" : "text-brand-foreground/85 hover:bg-brand-foreground/10 hover:text-brand-foreground"
                            }`}
                          >
                            <Icono className="size-4 shrink-0 opacity-90" />
                            <span>{m.texto}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-4 flex items-center gap-2 px-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-brand-foreground/45">Tema</span>
            <div className="flex items-center gap-1.5">
              {TEMAS.map((t) => {
                const activo = tema === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => cambiarTema(t.id)}
                    title={t.nombre}
                    aria-label={t.nombre}
                    aria-pressed={activo}
                    className={`grid size-4 place-items-center rounded-full transition-all ${
                      activo ? "ring-2 ring-brand-foreground/70 ring-offset-1 ring-offset-brand" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className="flex size-3 overflow-hidden rounded-full border border-brand-foreground/20">
                      <span className="h-full w-1/2" style={{ background: t.muestraBase }} />
                      <span className="h-full w-1/2" style={{ background: t.muestraAcento }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


          <div className="mt-6 rounded-md border border-line bg-card p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary/60">Rol activo</p>
            <p className="mt-1 text-sm font-semibold">{rol ? ETIQUETA_ROL[rol] : "Sin rol asignado"}</p>
            <p className="mt-1 font-mono text-[10px] text-brand-foreground/60">
              {rol === "ingeniero" ? "Solo avance físico" : "Moneda base: PEN"}
            </p>
          </div>

        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="label-mono mb-1">{subtitulo}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
