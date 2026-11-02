import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeInfo, CircleHelp, NotebookText, Stamp } from "lucide-react";
import { Encabezado, useEnCinta } from "@/components/AppShell";
import { CabeceraModulo, Panel, Pestanas } from "@/components/ui-kit";

const TITULO = "Ayuda — TELXEN ERP";
const DESC = "Manual de usuario, información del sistema y condiciones de licencia del ERP TELXEN SAC.";

type Seccion = "manual" | "acerca" | "licencia";
const SECCIONES: [Seccion, string][] = [
  ["manual", "Manual de usuario"],
  ["acerca", "Acerca de"],
  ["licencia", "Licencia"],
];

export const Route = createFileRoute("/_authenticated/ayuda")({
  validateSearch: (s: Record<string, unknown>): { seccion?: Seccion } =>
    typeof s["seccion"] === "string" && SECCIONES.some(([x]) => x === s["seccion"]) ? { seccion: s["seccion"] as Seccion } : {},
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ayuda,
});

/** Fila etiqueta / valor para la ficha del sistema. */
function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-2 last:border-b-0">
      <p className="label-mono shrink-0 text-muted-foreground">{etiqueta}</p>
      <p className="min-w-0 text-sm text-ink">{valor}</p>
    </div>
  );
}

function Punto({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-ink">
      <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Manual() {
  return (
    <div className="space-y-4">
      <Panel titulo="Cómo moverse por el sistema" extra={<NotebookText className="size-5 text-muted-foreground" />}>
        <ul className="space-y-2 p-4">
          <Punto>
            Arriba están las pestañas de trabajo: <strong>Inicio, Comercial, Operaciones, Logística, Finanzas, Personal y Datos</strong>.
            Debajo, cada grupo reúne las pantallas del mismo flujo; el botón grande abre la vista principal del grupo.
          </Punto>
          <Punto>
            Puede elegir la forma de navegar en <strong>Diseño</strong> (extremo derecho de la barra): cinta clásica, cinta simplificada
            o menú lateral. La elección se recuerda en este equipo.
          </Punto>
          <Punto>
            El buscador <strong>«¿Qué desea hacer?»</strong> encuentra cualquier pantalla por su nombre; ábralo con <kbd className="rounded border border-line bg-muted px-1 font-mono text-[11px]">Alt</kbd> + <kbd className="rounded border border-line bg-muted px-1 font-mono text-[11px]">Q</kbd> y entre con Enter.
          </Punto>
          <Punto>
            Clic derecho sobre un botón de la cinta lo ancla a <strong>Inicio</strong> como favorito para tenerlo siempre a mano.
          </Punto>
          <Punto>
            Las acciones de la pantalla que está usando (crear, exportar, filtrar) aparecen a la derecha de la cinta, separadas por una línea.
          </Punto>
          <Punto>
            La cinta se puede contraer con la flecha de su esquina derecha para dejar más espacio a la tabla.
          </Punto>
        </ul>
      </Panel>

      <Panel titulo="Ruta de trabajo habitual" extra={<CircleHelp className="size-5 text-muted-foreground" />}>
        <ol className="space-y-3 p-4 text-sm text-ink">
          {[
            ["Cotizar", "En Comercial, arme la cotización con partidas del banco de APU; los análisis de precios unitarios y las plantillas están en el mismo grupo."],
            ["Vender", "Con la cotización aprobada genere preliquidaciones y los comprobantes del grupo Facturación Electrónica: facturas, boletas, notas de crédito y de débito, y las guías de remisión."],
            ["Ejecutar", "En Operaciones registre el avance físico de la obra y siga el calendario con el diagrama de Gantt o la Curva S."],
            ["Abastecer", "Genere el requerimiento desde obra; el gerente lo aprueba, la bandeja de cotizaciones de proveedores produce la orden de compra y el almacén la recibe."],
            ["Controlar el dinero", "En Finanzas revise costos directos y generales, caja y bancos, cuentas por cobrar y por pagar, préstamos y el flujo de caja."],
            ["Pagar al personal", "En Personal valide las boletas de pago y los recibos por honorarios, y liquide beneficios sociales: AFP, CTS, gratificaciones y liquidaciones."],
            ["Mantener los catálogos", "En Datos y en Inicio estão los parámetros que alimentan todo lo anterior: codificación, unidades, especialidades, insumos y márgenes de APU."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">{i + 1}</span>
              <span className="min-w-0"><strong className="font-semibold">{t}. </strong>{d}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel titulo="Detalles útiles" extra={<BadgeInfo className="size-5 text-muted-foreground" />}>
        <ul className="space-y-2 p-4">
          <Punto>Los importes se consolidan en soles (PEN); cuando un documento está en dólares se muestra también su equivalente.</Punto>
          <Punto>Los colores de la interfaz se cambian en <strong>Inicio › Diseño › Tema</strong> y la letra de los documentos impresos en <strong>Tipografía</strong>.</Punto>
          <Punto>Lo que cada usuario puede ver y hacer depende de su rol; los roles se definen en <strong>Configuración del Sistema › Usuarios y Roles</strong>.</Punto>
          <Punto>Si una pantalla no carga lo que espera, recargue la vista; si el problema persiste, avise al administrador del sistema.</Punto>
        </ul>
      </Panel>
    </div>
  );
}

function Acerca() {
  return (
    <Panel titulo="Ficha del sistema" extra={<BadgeInfo className="size-5 text-muted-foreground" />}>
      <div className="px-4 py-2">
        <Fila etiqueta="Aplicación" valor="ERP TELXEN SAC — Gestión de Proyectos" />
        <Fila etiqueta="Empresa" valor="TELXEN SAC — servicios para proyectos de construcción en el Perú" />
        <Fila etiqueta="Moneda de consolidación" valor="Soles (PEN)" />
        <Fila etiqueta="Módulos" valor="Inicio, Comercial, Operaciones, Logística, Finanzas y Contabilidad, Personal y Datos" />
        <Fila etiqueta="Roles" valor="Ingeniero, Administrador y Gerente" />
        <Fila etiqueta="Presentación" valor="Aplicación web: se usa desde el navegador, sin instalación" />
        <Fila etiqueta="Datos" valor="Se guardan en la nube del proyecto; cada usuario ve lo que su rol permite" />
      </div>
    </Panel>
  );
}

function Licencia() {
  return (
    <Panel titulo="Licencia de uso" extra={<Stamp className="size-5 text-muted-foreground" />}>
      <div className="space-y-3 p-4 text-sm leading-relaxed text-ink">
        <p>
          Este sistema es <strong>software propietario de TELXEN SAC</strong> y se entrega bajo licencia de uso interno,
          exclusiva y no transferible, para el personal autorizado de la empresa y para los colaboradores que esta habilite.
        </p>
        <p>
          Quedan prohibidas, sin autorización escrita de TELXEN SAC, la copia, la distribución, la venta, la cesión a terceros
          y la modificación total o parcial del sistema o de su documentación.
        </p>
        <p>
          La información registrada —cotizaciones, obras, compras, nómina y datos de personal— es confidencial y pertenece a
          TELXEN SAC; solo puede usarse para la gestión de sus proyectos.
        </p>
        <p>
          El sistema se proporciona «tal cual», sin garantía de que funcione sin interrupciones. TELXEN SAC no responde por el
          uso que cada usuario haga de los datos que ingresa.
        </p>
        <p className="text-muted-foreground">
          Esta nota es el texto de licencia del sistema. Si la empresa cuenta con un contrato o condiciones propias, reemplace
          este contenido por el texto oficial.
        </p>
      </div>
    </Panel>
  );
}

function Ayuda() {
  const { seccion: enUrl } = Route.useSearch();
  const navigate = useNavigate({ from: "/ayuda" });
  const enCinta = useEnCinta();
  const seccion: Seccion = enUrl ?? "manual";
  const opciones = [
    { id: "manual" as const, texto: "Manual de usuario", icono: <NotebookText className="size-4" /> },
    { id: "acerca" as const, texto: "Acerca de", icono: <BadgeInfo className="size-4" /> },
    { id: "licencia" as const, texto: "Licencia", icono: <Stamp className="size-4" /> },
  ];

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Sistema › Ayuda"
        titulo="Ayuda"
        descripcion="Manual de usuario, información del sistema y su licencia."
        icono={<CircleHelp className="h-5 w-5" />}
      />
      {enCinta ? (
        <Encabezado titulo="Ayuda" subtitulo="Sistema › Ayuda" />
      ) : (
        <Pestanas etiqueta="Secciones de ayuda" valor={seccion} onCambiar={(v) => navigate({ search: { seccion: v }, replace: true })} variante="boton" opciones={opciones} />
      )}
      {seccion === "manual" ? <Manual /> : seccion === "acerca" ? <Acerca /> : <Licencia />}
    </div>
  );
}
