import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  BookUser,
  Building2,
  CalendarDays,
  ClipboardList,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";

type Item = { a: string; texto: string; roles: Rol[]; icono: React.ElementType };
type Categoria = { titulo: string; items: Item[] };

const MENU: Categoria[] = [
  {
    titulo: "Operaciones",
    items: [
      { a: "/proyectos", texto: "Proyectos", roles: ["administrador", "gerente"], icono: Building2 },
      { a: "/partidas", texto: "Partidas", roles: ["administrador", "gerente"], icono: Layers },
      { a: "/avance", texto: "Avance Físico", roles: ["ingeniero", "gerente"], icono: Activity },
    ],
  },
  {
    titulo: "Recursos Humanos",
    items: [
      { a: "/personal", texto: "Personal", roles: ["administrador", "gerente"], icono: Users },
      { a: "/tareo", texto: "Tareo Diario", roles: ["administrador", "gerente"], icono: CalendarDays },
    ],
  },
  {
    titulo: "Finanzas y Contabilidad",
    items: [
      { a: "/dashboard", texto: "Dashboard Financiero", roles: ["gerente"], icono: BarChart3 },
      { a: "/gastos-directos", texto: "Gastos Directos", roles: ["administrador", "gerente"], icono: ArrowDownCircle },
      { a: "/gastos-generales", texto: "Gastos Generales", roles: ["administrador", "gerente"], icono: ArrowUpCircle },
    ],
  },
  {
    titulo: "Comercial",
    items: [
      { a: "/valorizaciones", texto: "Valorizaciones", roles: ["administrador", "gerente"], icono: Banknote },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { a: "/usuarios", texto: "Usuarios y Roles", roles: ["gerente"], icono: ShieldCheck },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { a: "/datos", texto: "Catálogos Maestros", roles: ["administrador", "gerente"], icono: BookUser },
    ],
  },
];


export function AppShell({ children }: { children: ReactNode }) {
  const { nombre, email, rol } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const categorias = MENU.map((c) => ({
    ...c,
    items: c.items.filter((m) => (rol ? m.roles.includes(rol) : false)),
  })).filter((c) => c.items.length > 0);

  const iniciales = (nombre || email || "??").slice(0, 2).toUpperCase();

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen w-full text-ink">
      <header className="no-print sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur">
        <div className="flex w-[212px] shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
            CO
          </span>
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight">ERP TELXEN</p>
            <p className="mt-1 label-mono">Gestión de Proyectos</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {iniciales}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-semibold">{nombre || email}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {rol ? ETIQUETA_ROL[rol] : "Sin rol"}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-bad hover:text-bad"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[236px_1fr]">
        <aside className="no-print border-r border-line px-3 py-5">
          <p className="px-2 pb-2 label-mono">Módulos</p>
          <nav className="space-y-4 text-sm">
            {categorias.map((c) => (
              <div key={c.titulo} className="space-y-1">
                <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.titulo}
                </p>
                {c.items.map((m) => {
                  const activo = pathname === m.a;
                  const Icono = m.icono;
                  return (
                    <Link
                      key={m.a}
                      to={m.a}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
                        activo ? "bg-primary/10 font-semibold text-primary" : "text-ink hover:bg-ink/5"
                      }`}
                    >
                      <Icono className="size-4 shrink-0 opacity-90" />
                      <span>{m.texto}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mt-6 rounded-md border border-line bg-card p-3">
            <p className="label-mono">Rol activo</p>
            <p className="mt-1 text-sm font-semibold">{rol ? ETIQUETA_ROL[rol] : "Sin rol asignado"}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
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
