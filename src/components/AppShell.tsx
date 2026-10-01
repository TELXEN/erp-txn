import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import {
  Activity,
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FileStack,
  Gauge,
  ShoppingBag,
  Landmark,
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
  FileSpreadsheet,
  HandCoins,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";


type Item = { a: string; texto: string; roles: Rol[]; icono: React.ElementType };
type Categoria = { titulo: string; items: Item[] };

const MENU: Categoria[] = [
  {
    titulo: "Comercial",
    items: [
      { a: "/clientes", texto: "Clientes", roles: ["administrador", "gerente"], icono: Users },
      { a: "/cotizaciones", texto: "Cotizaciones", roles: ["administrador", "gerente"], icono: FileText },
      { a: "/valorizaciones", texto: "Preliquidaciones", roles: ["administrador", "gerente"], icono: Banknote },
      { a: "/facturacion-electronica", texto: "Facturación Electrónica", roles: ["administrador", "gerente"], icono: ReceiptText },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { a: "/dashboard-proyectos", texto: "Dashboard de Proyectos", roles: ["ingeniero", "administrador", "gerente"], icono: Gauge },
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
      { a: "/importaciones", texto: "Importaciones", roles: ["administrador", "gerente"], icono: Plane },
      { a: "/almacen", texto: "Almacén", roles: ["administrador", "gerente"], icono: Warehouse },
      { a: "/guias-remision", texto: "Guías de Remisión", roles: ["administrador", "gerente"], icono: FileStack },
      { a: "/vehiculos", texto: "Vehículos", roles: ["ingeniero", "administrador", "gerente"], icono: Truck },
      { a: "/inventario", texto: "Inventario", roles: ["administrador", "gerente"], icono: Package },
      { a: "/proveedores", texto: "Proveedores", roles: ["administrador", "gerente"], icono: Handshake },
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
    ],
  },
  {
    titulo: "Recursos Humanos",
    items: [
      { a: "/personal", texto: "Personal", roles: ["administrador", "gerente"], icono: Users },
      { a: "/honorarios", texto: "Recibos por Honorarios", roles: ["administrador", "gerente"], icono: ReceiptText },
      { a: "/nomina", texto: "Nómina y Boletas", roles: ["administrador", "gerente"], icono: FileSpreadsheet },
      { a: "/beneficios", texto: "Beneficios Sociales", roles: ["administrador", "gerente"], icono: HandCoins },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { a: "/datos-apu", texto: "Análisis de Precios Unitarios (APU)", roles: ["administrador", "gerente"], icono: Calculator },
      { a: "/datos", texto: "Catalogos Maestros", roles: ["administrador", "gerente"], icono: Settings },
      { a: "/configuracion-sistema", texto: "Configuración del Sistema", roles: ["gerente"], icono: SlidersHorizontal },
    ],
  },
];


const LS_KEY = "erp-telxen-menu-abierta";

function leerAbierta(): string | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return typeof raw === "string" && raw ? raw : null;
  } catch {
    return null;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { nombre, email, rol } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });


  const categorias = MENU.map((c) => ({
    ...c,
    items: c.items.filter((m) => (rol ? m.roles.includes(rol) : false)),
  })).filter((c) => c.items.length > 0);

  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    setAbierta(leerAbierta());
  }, []);

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
    if (c.items.some((m) => pathname === m.a)) return true;
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
