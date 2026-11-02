import { LogOut, FileDigit, FolderKanban, Scale, Plug, Ruler, Shapes, FolderTree, Network, Tag, ListTree, Wrench, Hammer, Percent, LayoutTemplate } from "lucide-react";
import { ContactRound, Factory, Type, UserRoundCheck, Coins, Barcode, Drill, FileSignature, BadgeDollarSign, Boxes, BookOpen, History, LayoutDashboard, Vault, CircleDollarSign, CalendarClock, Route, UserCog, Database, Pickaxe, PackagePlus, ScrollText, ToolCase, Fuel, PiggyBank, ArrowDownLeft, ArrowUpRight, BadgePercent, CircleHelp, NotebookText, BadgeInfo, Stamp } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Ranura = { el: HTMLElement | null; cinta: boolean; setCtx: (c: ContextoCinta | null) => void };
const RanuraEncabezado = createContext<Ranura | null>(null);
/** true cuando las acciones de pantalla viven en la cinta. */
export function useEnCinta() { return !!useContext(RanuraEncabezado)?.cinta; }
// Grupo Ayuda: el botón grande abre el centro de ayuda y las tres opciones pequeñas van apiladas a su derecha.
const SECCIONES_AYUDA = [
  { texto: "Ayuda", corto: "Ayuda", a: "/ayuda", icono: CircleHelp, grande: true },
  { texto: "Manual de usuario", corto: "Manual de usuario", a: "/ayuda", search: { seccion: "manual" }, icono: NotebookText },
  { texto: "Acerca de", corto: "Acerca de", a: "/ayuda", search: { seccion: "acerca" }, icono: BadgeInfo },
  { texto: "Licencia", corto: "Licencia", a: "/ayuda", search: { seccion: "licencia" }, icono: Stamp },
];
const SECCIONES_CONFIG = [
  { texto: "Datos de la empresa", corto: "Empresa", seccion: "empresa", icono: Building2, grande: true },
  { texto: "Usuarios y Roles", corto: "Usuarios", seccion: "usuarios", icono: UserRoundCheck },
  { texto: "Valores normativos (RMV / UIT)", corto: "Normativa", seccion: "normativa", icono: Scale },
  { texto: "Integraciones", corto: "Integraciones", seccion: "integraciones", icono: Plug },
];
const SECCIONES_DATOS = [
  { texto: "Codificación", corto: "Codificación de\nDocumentos", seccion: "codificacion", campo: "pestana", icono: FileDigit, grande: true },
  { texto: "Parámetros de proyectos", corto: "Parametros de Proyectos", seccion: "configuracion", campo: "pestana", icono: FolderKanban },
  { texto: "Recursos Humanos", corto: "Recursos Humanos", seccion: "cargos", campo: "pestana", icono: UserCog },
  { texto: "Costos y Finanzas", corto: "Costos y Finanzas", seccion: "categoriasgg", campo: "pestana", icono: Coins },
];
const SECCIONES_CATALOGO = [
  { texto: "Unidades de medida", corto: "Unidades", seccion: "unidades", campo: "pestana", icono: Ruler, grande: true },
  { texto: "Especialidades", corto: "Especialidades", seccion: "especialidades", campo: "pestana", icono: Shapes },
  { texto: "Categorías", corto: "Categorías", seccion: "categorias", campo: "pestana", icono: FolderTree },
  { texto: "Subcategorías", corto: "Subcategorías", seccion: "subfamilias", campo: "pestana", icono: Network },
  { texto: "Marcas", corto: "Marcas", seccion: "marcas", campo: "pestana", icono: Tag },
  { texto: "Títulos WBS", corto: "Títulos WBS", seccion: "grupos", campo: "pestana", icono: ListTree },
];
const SECCIONES_MAESTRO = [
  { texto: "Materiales", corto: "Materiales", seccion: "MAT", campo: "seccion", icono: Package, grande: true },
  { texto: "Mano de obra", corto: "Mano de obra", seccion: "MO", campo: "seccion", icono: Pickaxe },
  { texto: "Equipos", corto: "Equipos", seccion: "EQ", campo: "seccion", icono: Drill },
  { texto: "Herramientas", corto: "Herramientas", seccion: "HE", campo: "seccion", icono: Hammer },
  { texto: "Subcontratos", corto: "Subcontratos", seccion: "SC", campo: "seccion", icono: FileSignature },
];
const SECCIONES_MAESTRO_CFG = [
  { texto: "Márgenes APU", corto: "Márgenes", seccion: "margenes", campo: "seccion", icono: Percent, grande: true },
  { texto: "Parámetros laborales", corto: "Laboral", seccion: "laboral", campo: "seccion", icono: BadgeDollarSign },
  { texto: "Codificación de insumos", corto: "Codificación", seccion: "codificacion", campo: "seccion", icono: Barcode },
];
import { FormatoGlobal } from "@/components/FormatoGlobal";
import { CintaOpciones, SelectorModoLateral, type ModoNavegacion, type ContextoCinta } from "@/components/CintaOpciones";
import { ReciboCodigoBarras, NominaBoletas, FacturaSello, GraficoFinanciero, HojaVerificada, CajaVerificada, EscudoVerificado, PortapapelesVerificado, PortapapelesLapiz, GanttLineas, CurvaAzul, PortapapelesDatos, BoletaDolar, NotaCreditoRoja, NotaDebitoAzul, TesoreriaEdificio } from "@/components/icons";
import { Calculator, ChevronDown, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2 } from "lucide-react";

function BotonPantallaCompleta({ className = "grid size-7 place-items-center rounded-md text-brand-foreground/70 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground" }: { className?: string }) {
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
      className={className}
    >
      {activa ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
    </button>
  );
}
import {
  Activity,
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  FileText,
  FileX2,
  Gauge,
  ShoppingBag,
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
  FolderClosed,
  HardHat,
  Inbox,
  Grid3x3,
  Sprout,
  Gift,
  UserMinus,


} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";
import { aplicarTema, leerTema } from "@/lib/temas";
import { aplicarFuenteGlobal, useFuenteDocumento } from "@/lib/fuentes-documentos";


const SECCIONES_COTIZ = [
  { texto: "Cotizaciones", corto: "Cotizaciones", seccion: "cotizaciones", icono: FileText, grande: true },
  { texto: "Análisis de Precios Unitarios (APU)", corto: "APU", a: "/datos-apu", icono: Calculator, iconoClase: "text-cinta-verde" },
  { texto: "Plantillas", corto: "Plantillas", seccion: "plantillas", icono: LayoutTemplate },
];

const SECCIONES_FACTURACION = [
  { texto: "Facturas", corto: "Facturas", seccion: "01", campo: "tipo", icono: FacturaSello, grande: true },
  { texto: "Boletas de venta", corto: "Boletas", seccion: "03", campo: "tipo", icono: BoletaDolar },
  { texto: "Notas de crédito", corto: "Nota de crédito", seccion: "07", campo: "tipo", icono: NotaCreditoRoja },
  { texto: "Notas de débito", corto: "Nota de débito", seccion: "08", campo: "tipo", icono: NotaDebitoAzul },
];

// Grupo propio en la cinta: un solo botón grande que abre las guías de remisión.
const SECCIONES_GUIAS = [
  { texto: "Guías de remisión", corto: "Guías de Remisión", seccion: "09", campo: "tipo", icono: CajaVerificada, grande: true },
];

const SECCIONES_VEHICULOS = [
  { texto: "Resumen", corto: "Resumen", seccion: "resumen", campo: "pestana", icono: LayoutDashboard, grande: true },
  { texto: "Flota", corto: "Flota", seccion: "flota", campo: "pestana", icono: Car },
  { texto: "Tareo vehicular", corto: "Tareo de Vehículos", seccion: "tareo", campo: "pestana", icono: CalendarClock },
  { texto: "Traslados", corto: "Traslados", seccion: "traslados", campo: "pestana", icono: Route },
  { texto: "Mantenimiento", corto: "Mantenimiento", seccion: "mantenimiento", campo: "pestana", icono: Wrench },
];

const SECCIONES_ALMACEN = [
  { texto: "Almacén", corto: "Almacén", a: "/almacen", icono: Warehouse, grande: true },
  { texto: "Inventario", corto: "Inventario", a: "/inventario", icono: Boxes, grande: true },
];


const SECCIONES_OP_ESP = [
  { texto: "Retenciones", corto: "Retenciones", seccion: "20", campo: "tipo", icono: Vault, grande: true },
  { texto: "Percepciones", corto: "Percepciones", seccion: "40", campo: "tipo", icono: CircleDollarSign },
  { texto: "Comunicaciones de baja", corto: "Bajas", seccion: "RA", campo: "tipo", icono: FileX2 },
];

const SECCIONES_GG = [
  { texto: "Gastos Generales", corto: "Gastos Generales", seccion: "resumen", campo: "pestana", icono: Briefcase, grande: true },
  { texto: "Gastos generales", corto: "Detalle de Gastos", seccion: "gastos", campo: "pestana", icono: ScrollText },
  { texto: "Mantenimiento de flota", corto: "Mantenimiento de Flota", seccion: "mantenimiento", campo: "pestana", icono: ToolCase },
  { texto: "Combustible de flota", corto: "Combustible", seccion: "combustible", campo: "pestana", icono: Fuel },
];

const SECCIONES_FLUJO = [
  { texto: "Flujo de Caja", corto: "Flujo de Caja", seccion: "resumen", campo: "pestana", icono: TrendingUp, grande: true },
  { texto: "Matriz anual", corto: "Matriz anual", seccion: "matriz", campo: "pestana", icono: Grid3x3 },
];

// Caja y bancos: el icono grande abre las tarjetas de resumen; al lado, en una sola columna, las tres gestiones.
const SECCIONES_TESORERIA = [
  { texto: "Tesorería", corto: "Tesorería", seccion: "resumen", campo: "pestana", icono: TesoreriaEdificio, grande: true, iconoClase: "text-cinta-oro" },
  { texto: "Cuentas por cobrar", corto: "Cuentas por cobrar", seccion: "cxc", campo: "pestana", icono: ArrowDownLeft, iconoClase: "text-cinta-verde" },
  { texto: "Cuentas por pagar", corto: "Cuentas por pagar", seccion: "cxp", campo: "pestana", icono: ArrowUpRight, iconoClase: "text-cinta-rojo" },
  { texto: "Préstamos", corto: "Préstamos", seccion: "financiamiento", campo: "pestana", icono: BadgePercent, iconoClase: "text-cinta-azul" },
];

// Vistas del cronograma: cada opción abre el Gantt o la Curva S en pantalla.
const SECCIONES_VISTAS = [
  { texto: "Diagrama de Gantt", corto: "Gantt", a: "/gantt", search: { vista: "gantt" }, icono: GanttLineas },
  { texto: "Curva S", a: "/gantt", search: { vista: "curva" }, icono: CurvaAzul },
];
const SECCIONES_NOMINA = [
  { texto: "Boletas de Pago", corto: "Boletas de Pago", seccion: "planilla", campo: "pestana", icono: NominaBoletas, grande: true },
  { texto: "Recibos por Honorarios", corto: "Recibos por Honorarios", a: "/honorarios", icono: ReceiptText, grande: true },
];
// Opciones del grupo Beneficios Sociales: Datos de AFP grande a la izquierda y las demás en una columna vertical.
const SECCIONES_BENEFICIOS = [
  { texto: "Datos de AFP", corto: "Datos de AFP", a: "/nomina", search: { pestana: "datos" }, icono: PiggyBank, grande: true },
  { texto: "CTS", corto: "CTS", seccion: "CTS", campo: "tipo", icono: Sprout, iconoClase: "text-cinta-verde" },
  { texto: "Gratificaciones", corto: "Gratificaciones", seccion: "Gratificación", campo: "tipo", icono: Gift, iconoClase: "text-cinta-azul" },
  { texto: "Liquidaciones", corto: "Liquidaciones", seccion: "Liquidación", campo: "tipo", icono: UserMinus, iconoClase: "text-cinta-rojo" },
];



type SubOpcion = { texto: string; seccion?: string; campo?: string; icono?: React.ElementType; corto?: string; a?: string; grande?: boolean; search?: Record<string, string>; iconoClase?: string };
type Item = { a: string; texto: string; roles: Rol[]; icono: React.ElementType; hijos?: Item[]; sub?: SubOpcion[]; subGrupos?: { titulo: string; opciones: SubOpcion[]; subFilas?: number }[]; subFilas?: number; subColumnas?: boolean; unaLinea?: boolean; iconoClase?: string };
type Categoria = { titulo: string; items: Item[] };

const MENU: Categoria[] = [
  {
    titulo: "Inicio",
    items: [
      { a: "/configuracion-sistema", texto: "Configuración del Sistema", roles: ["gerente"], icono: SlidersHorizontal, sub: SECCIONES_CONFIG, subFilas: 3, subColumnas: true },
      { a: "/datos", texto: "Parámetros Generales", roles: ["administrador", "gerente"], icono: Settings, sub: SECCIONES_DATOS, subFilas: 3, subColumnas: true },
      { a: "/tema-colores", texto: "Diseño", roles: ["ingeniero", "administrador", "gerente"], icono: Palette, subFilas: 3, sub: [
        { texto: "Temas de colores", corto: "Temas", a: "/tema-colores", icono: Palette, grande: true },
        { texto: "Tipografía de documentos", corto: "Tipografía", a: "/configuracion-sistema", search: { seccion: "tipografia" }, icono: Type },
      ] },
      { a: "/ayuda", texto: "Ayuda", roles: ["ingeniero", "administrador", "gerente"], icono: CircleHelp, sub: SECCIONES_AYUDA, subFilas: 3 },
    ],
  },
  {
    titulo: "Comercial",
    items: [
      { a: "/clientes", texto: "Clientes", roles: ["administrador", "gerente"], icono: ContactRound },
      { a: "/cotizaciones", texto: "Cotizaciones", roles: ["administrador", "gerente"], icono: FileText, sub: SECCIONES_COTIZ, subFilas: 3 },
      { a: "/valorizaciones", texto: "Preliquidaciones", roles: ["administrador", "gerente"], icono: Banknote },
      { a: "/facturacion-electronica", texto: "Facturación Electrónica", roles: ["administrador", "gerente"], icono: ReciboCodigoBarras, sub: SECCIONES_FACTURACION, subFilas: 3, subGrupos: [{ titulo: "Guías de Remisión", opciones: SECCIONES_GUIAS }, { titulo: "Operaciones especiales", opciones: SECCIONES_OP_ESP }] },
      { a: "/registro-ventas", texto: "Registro de Ventas", roles: ["administrador", "gerente"], icono: FolderClosed },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { a: "/dashboard-proyectos", texto: "Dashboard Proyectos", roles: ["ingeniero", "administrador", "gerente"], icono: Gauge },
      { a: "/proyectos", texto: "Proyectos", roles: ["administrador", "gerente"], icono: Factory },
      { a: "/partidas", texto: "Partidas", roles: ["administrador", "gerente"], icono: Layers },
      { a: "/avance", texto: "Avance Físico", roles: ["ingeniero", "gerente"], icono: Activity },
      { a: "/gantt", texto: "Gantt\nCurva S", roles: ["ingeniero", "administrador", "gerente"], icono: GanttLineas, sub: SECCIONES_VISTAS, subFilas: 3 },
      { a: "/generar-requerimiento", texto: "Generar Requerimiento", roles: ["ingeniero", "administrador", "gerente"], icono: PortapapelesLapiz },
      { a: "/valorizaciones-obra", texto: "Valorizaciones", roles: ["ingeniero", "administrador", "gerente"], icono: PortapapelesVerificado },
      { a: "/aprobaciones", texto: "Aprobaciones", roles: ["administrador", "gerente"], icono: EscudoVerificado },
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
      { a: "/almacen", texto: "Almacén e Inventario", roles: ["administrador", "gerente"], icono: Warehouse, sub: SECCIONES_ALMACEN },

      { a: "/vehiculos", texto: "Vehículos", roles: ["ingeniero", "administrador", "gerente"], icono: Car, sub: SECCIONES_VEHICULOS, subFilas: 3, subColumnas: true },
    ],
  },
  {
    titulo: "Finanzas y Contabilidad",
    items: [
      { a: "/dashboard", texto: "Dashboard Financiero", roles: ["gerente"], icono: GraficoFinanciero },
      { a: "/gastos-directos", texto: "Costos Directos", roles: ["administrador", "gerente"], icono: ShoppingBag },
      { a: "/gastos-generales", texto: "Gastos Generales", roles: ["administrador", "gerente"], icono: Briefcase, sub: SECCIONES_GG, subFilas: 3 },
      { a: "/caja-chica", texto: "Caja Chica", roles: ["administrador", "gerente"], icono: Wallet, unaLinea: true },
      { a: "/tesoreria", texto: "Tesorería", roles: ["administrador", "gerente"], icono: TesoreriaEdificio, sub: SECCIONES_TESORERIA, subFilas: 3 },


      { a: "/flujo-caja", texto: "Flujo de Caja", roles: ["administrador", "gerente"], icono: TrendingUp, sub: SECCIONES_FLUJO, subFilas: 3 },
      { a: "/sire", texto: "SIRE SUNAT", roles: ["administrador", "gerente"], icono: HojaVerificada },
    ],
  },
  {
    titulo: "Recursos Humanos",
    items: [
      { a: "/personal", texto: "Personal", roles: ["administrador", "gerente"], icono: Users },
      { a: "/tareo", texto: "Control de Asistencia", roles: ["administrador", "gerente"], icono: CalendarDays },
      { a: "/nomina", texto: "Boletas de Pago", roles: ["administrador", "gerente"], icono: NominaBoletas, sub: SECCIONES_NOMINA },
      { a: "/beneficios", texto: "Beneficios Sociales", roles: ["administrador", "gerente"], icono: HandCoins, sub: SECCIONES_BENEFICIOS, subFilas: 3 },
      {
        a: "#epp", texto: "Gestión de EPP", roles: ["administrador", "gerente"], icono: HardHat,
        hijos: [
          { a: "/epp-banco", texto: "Banco de Datos de EPP", roles: ["administrador", "gerente"], icono: PortapapelesDatos },
          { a: "/epp-entregas", texto: "Asignación y Entrega", roles: ["administrador", "gerente"], icono: PackagePlus },
          { a: "/epp-historial", texto: "Historial por Empleado", roles: ["administrador", "gerente"], icono: History },
        ],
      },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { a: "/catalogo-tecnico", texto: "Catálogo Técnico", roles: ["administrador", "gerente"], icono: BookOpen, sub: SECCIONES_CATALOGO, subFilas: 3, subColumnas: true },
      { a: "/maestro-insumos", texto: "Maestro de Insumos", roles: ["administrador", "gerente"], icono: Database, sub: SECCIONES_MAESTRO, subGrupos: [{ titulo: "Configuración del maestro", opciones: SECCIONES_MAESTRO_CFG }] },
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

/** Ítem con menú desplegable de secciones en el menú lateral (p. ej. Parámetros Generales). */
function ItemSubMenu({ item, pathname }: { item: Item; pathname: string }) {
  const activo = pathname === item.a;
  const [abierto, setAbierto] = useState(activo);
  useEffect(() => { if (activo) setAbierto(true); }, [activo]);
  const Icono = item.icono;
  const enlaceSeccion = (o: SubOpcion) => {
    const cls = "flex rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-hover";
    return o.a ? (
      <Link key={`${o.a}|${o.texto}`} to={o.a} {...(o.search ? { search: o.search as never } : {})} className={cls}>{o.texto}</Link>
    ) : (
      <Link key={o.seccion} to={item.a} search={{ [o.campo ?? "seccion"]: o.seccion } as never} className={cls}>{o.texto}</Link>
    );
  };
  return (
    <div>
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-hover ${activo ? "font-semibold" : ""}`}>
        <Icono className="size-4 shrink-0 opacity-90" />
        <span className="flex-1">{item.texto}</span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${abierto ? "" : "-rotate-90"}`} />
      </button>
      {abierto && (
        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-2">
          {item.sub!.map(enlaceSeccion)}
          {(item.subGrupos ?? []).map((g) => (
            <div key={g.titulo}>
              <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">{g.titulo}</p>
              {g.opciones.map(enlaceSeccion)}
            </div>
          ))}
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
  const [ranuraCinta, setRanuraCinta] = useState<HTMLDivElement | null>(null);
  const [ctxCinta, setCtxCinta] = useState<ContextoCinta | null>(null);
  const [colapsado, setColapsado] = useState(false);
  const [modoNav, setModoNav] = useState<ModoNavegacion>("clasica");
  useEffect(() => {
    try {
      const m = window.localStorage.getItem("erp-telxen-navegacion");
      if (m === "simplificada" || m === "clasica" || m === "lateral") setModoNav(m);
    } catch { /* */ }
  }, []);
  function cambiarModo(m: ModoNavegacion) {
    setModoNav(m);
    try { window.localStorage.setItem("erp-telxen-navegacion", m); } catch { /* */ }
  }
  const conCinta = modoNav !== "lateral";
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
    if (c.items.some((m) => pathname === m.a || m.hijos?.some((h) => h.a === pathname)
      || m.sub?.some((o) => (o.a ?? m.a) === pathname) || m.subGrupos?.some((g) => g.opciones.some((o) => (o.a ?? m.a) === pathname)))) return true;
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
    <div className={`min-h-screen w-full text-ink md:h-screen md:overflow-hidden ${conCinta ? "md:[--app-sidebar-width:0px]" : colapsado ? "md:[--app-sidebar-width:56px]" : "md:[--app-sidebar-width:236px]"}`}>
      <FormatoGlobal />
      <aside className={`no-print ${conCinta ? "hidden" : "flex"} min-h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:z-30 md:h-screen md:min-h-0 md:w-[var(--app-sidebar-width)] md:overflow-hidden`}>
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
                        if (m.sub) return <ItemSubMenu key={m.a} item={m} pathname={pathname} />;
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
        {conCinta && (
          <CintaOpciones
            contextual={ctxCinta}
            onRanuraContextual={setRanuraCinta}
            categorias={categorias}
            pathname={pathname}
            modo={modoNav as "simplificada" | "clasica"}
            onModo={cambiarModo}
            distintivo={(a) => (a === "/aprobaciones" ? pendientesAprobacion : 0)}
            logo={<span className="mr-1 grid size-6 shrink-0 place-items-center rounded bg-cinta-acento font-mono text-[10px] font-bold text-cinta-acento-foreground" title="ERP TELXEN SAC">TXN</span>}
            usuario={
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap pl-2">
                <span className="grid size-6 place-items-center rounded-full bg-cinta-acento text-[10px] font-semibold text-cinta-acento-foreground">
                  {iniciales}
                </span>
                <div className="hidden max-w-[150px] leading-tight lg:block" title={nombre || email}>
                  <p className="truncate text-[11px] font-semibold">{nombre || email}</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-wide text-cinta-tenue">
                    {rol ? ETIQUETA_ROL[rol] : "Sin rol"}
                  </p>
                </div>
                <button
                  onClick={cerrarSesion} title="Cerrar Sesión" aria-label="Cerrar Sesión"
                  className="flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-cinta-borde px-2 text-[11px] text-cinta-texto transition-colors hover:border-cinta-acento hover:bg-cinta-acento hover:text-cinta-acento-foreground"
                >
                  <LogOut className="size-3.5" /><span className="hidden 2xl:inline">Cerrar Sesión</span>
                </button>
              </div>
            }
            pantallaCompleta={<BotonPantallaCompleta className="grid size-7 place-items-center rounded-md text-cinta-tenue transition-colors hover:bg-cinta-hover hover:text-cinta-texto" />}
          />
        )}
        <header className={`no-print sticky ${conCinta ? "hidden" : ""} top-0 z-20 flex min-h-12 shrink-0 items-center gap-3 border-b border-brand bg-brand px-4 py-1.5 text-brand-foreground`}>
          <div ref={setRanura} className="flex min-w-0 flex-1 items-center" />
          {!conCinta && (
            <>
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
            </>
          )}
          {!conCinta && <BotonPantallaCompleta />}
          {!conCinta && <div className="hidden md:block [&_button]:text-brand-foreground/80"><SelectorModoLateral modo={modoNav} onModo={cambiarModo} /></div>}
        </header>

        <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 md:min-h-0 md:overflow-y-auto md:overscroll-contain"><div className="mx-auto h-full w-full max-w-[1600px]"><RanuraEncabezado.Provider value={{ el: conCinta ? ranuraCinta : ranura, cinta: conCinta, setCtx: setCtxCinta }}>{children}</RanuraEncabezado.Provider></div></main>
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
  const r = useContext(RanuraEncabezado);
  const enCinta = !!r?.cinta;
  const setCtx = r?.setCtx;
  useEffect(() => {
    if (!enCinta || !setCtx || !acciones) return;
    setCtx({ titulo, subtitulo });
    return () => setCtx(null);
  }, [enCinta, setCtx, titulo, subtitulo, !!acciones]);
  if (enCinta) {
    if (!r?.el || !acciones) return null;
    return createPortal(<div>{acciones}</div>, r.el);
  }
  const ranura = r?.el;
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
