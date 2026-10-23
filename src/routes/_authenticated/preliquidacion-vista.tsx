import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Link2 } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Vacio } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { calcularMontos, type TipoTributario } from "@/lib/preliquidacion-montos";
import { HojaPreliquidacion, type HojaPLCuenta } from "@/components/HojaPreliquidacion";
import type { Preliquidacion } from "@/components/Preliquidaciones";

export const Route = createFileRoute("/_authenticated/preliquidacion-vista")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Vista previa de preliquidación — ERP TELXEN" },
      { name: "description", content: "Previsualización del documento de preliquidación con detracciones y datos de cobro." },
      { property: "og:title", content: "Vista previa de preliquidación — ERP TELXEN" },
      { property: "og:description", content: "Documento comercial de preliquidación listo para descargar en PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaPreliquidacion,
});

type ItemFila = { id: string; descripcion: string; unidad: string; cantidad: number; precio_unitario: number };

function VistaPreliquidacion() {
  const { id } = Route.useSearch();
  const { data: empresa, isLoading: cargandoEmpresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const [pdfCargando, setPdfCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { data: pl, isLoading: cargandoPl } = useQuery({
    queryKey: ["preliquidacion", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("preliquidaciones").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Preliquidacion | null;
    },
  });

  const { data: lineas = [], isLoading: cargandoItems } = useQuery({
    queryKey: ["preliquidacion_items", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preliquidacion_items")
        .select("id, descripcion, unidad, cantidad, precio_unitario")
        .eq("preliquidacion_id", id)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as ItemFila[];
    },
  });

  const { data: cliente } = useQuery({
    queryKey: ["tercero-preliquidacion", pl?.cliente_id],
    enabled: Boolean(pl?.cliente_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terceros")
        .select("razon_social, numero_documento, direccion")
        .eq("id", pl?.cliente_id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: proyecto } = useQuery({
    queryKey: ["proyecto-preliquidacion", pl?.proyecto_id],
    enabled: Boolean(pl?.proyecto_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("nombre, codigo").eq("id", pl?.proyecto_id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos", "cuentas-cobro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bancos")
        .select("nombre, numero_cuenta, cci, tipo_cuenta, monedas, activo")
        .eq("activo", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as HojaPLCuenta[];
    },
  });

  const cargando = cargandoPl || cargandoItems || cargandoEmpresa;

  if (cargando) {
    return (
      <Panel titulo="Vista previa de preliquidación">
        <div className="p-6 font-mono text-xs text-muted-foreground">Cargando documento…</div>
      </Panel>
    );
  }

  if (!id || !pl) {
    return (
      <Panel titulo="Vista previa de preliquidación">
        <div className="p-5"><Vacio texto="Selecciona una preliquidación registrada para visualizarla." /></div>
        <div className="border-t border-line p-4">
          <Link to="/valorizaciones"><Boton variante="linea"><ArrowLeft size={13} /> Volver a facturación</Boton></Link>
        </div>
      </Panel>
    );
  }

  const bruto = lineas.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio_unitario), 0);
  const amortizacion = Number(pl.amortizacion ?? 0);
  const neto = bruto - amortizacion;
  const tc = Number(pl.tipo_cambio || 1);
  const tipo = (pl.tipo_tributario ?? "detraccion") as TipoTributario;
  const mm = calcularMontos(neto, Number(pl.pct_detraccion || 0), tc, tipo);
  const ctaDetraccion = cuentas.find((c) => c.tipo_cuenta === "Detracciones") ?? null;
  const cuentasOrdenadas = [...cuentas].sort((a, b) => Number(a.tipo_cuenta === "Detracciones") - Number(b.tipo_cuenta === "Detracciones"));

  function copiarEnlace() {
    const url = `${window.location.origin}/preliquidacion-vista?id=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2500);
      })
      .catch(() => window.prompt("Copia este enlace de vista previa:", url));
  }

  async function descargarPdf() {
    if (!pl) return;
    setPdfCargando(true);
    try {
      const { descargarPreliquidacionPdf } = await import("@/components/PreliquidacionPdf");
      await descargarPreliquidacionPdf({
        codigo: pl.codigo,
        fecha: pl.fecha,
        estado: pl.estado,
        fuentePdf: fuente.id,
        empresa: {
          razonSocial: empresa?.razon_social || "TELXEN SAC",
          eslogan: empresa?.eslogan || "",
          ruc: empresa?.ruc || "",
          direccion: empresa?.direccion || "",
          telefono: empresa?.telefono || "",
          email: empresa?.email || "",
          web: empresa?.web || "",
          logoUrl: empresa?.logo_url || "",
        },
        cliente: {
          razonSocial: cliente?.razon_social || "—",
          ruc: cliente?.numero_documento || "",
          direccion: cliente?.direccion || "",
        },
        proyecto: proyecto?.nombre || "—",
        ordenCompra: pl.orden_compra ?? "",
        concepto: pl.concepto,
        moneda: pl.moneda,
        tipoCambio: tc,
        lineas: lineas.map((l) => ({
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precio_unitario),
        })),
        valorEjecutado: bruto,
        amortizacion,
        valorNeto: mm.neto,
        igv: mm.igv,
        total: mm.total,
        tipoTributario: tipo,
        porcentajeTributario: Number(pl.pct_detraccion || 0),
        aplicaTributo: mm.aplica,
        detraccionPen: mm.detraccionPen,
        retencionPen: mm.retencionPen,
        netoDepositar: mm.cobrar,
        condicionPago: pl.condicion_pago,
        diasCredito: Number(pl.dias_credito || 0),
        fechaVencimiento: pl.fecha_vencimiento || "",
        cuentaDetracciones: ctaDetraccion ? { nombre: ctaDetraccion.nombre, numero: ctaDetraccion.numero_cuenta, cci: ctaDetraccion.cci } : null,
        cuentasTodas: cuentasOrdenadas.map((c) => ({ nombre: c.nombre, numero: c.numero_cuenta, cci: c.cci, moneda: c.monedas, tipoCuenta: c.tipo_cuenta, esDetraccion: c.tipo_cuenta === "Detracciones" })),
        observacion: pl.observacion || "",
      });
    } catch (err) {
      window.alert(err instanceof Error ? `No se pudo generar el PDF: ${err.message}` : "No se pudo generar el PDF.");
    } finally {
      setPdfCargando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Vista previa de preliquidación"
        subtitulo={`${pl.codigo} · ${cliente?.razon_social || "Cliente sin registrar"}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link to="/valorizaciones">
              <Boton variante="linea"><ArrowLeft size={13} /> Volver</Boton>
            </Link>
            <Boton variante="linea" onClick={copiarEnlace}>
              <Link2 size={14} /> {copiado ? "Enlace copiado" : "Copiar enlace"}
            </Boton>
            <Boton variante="accion" onClick={() => void descargarPdf()} disabled={pdfCargando}>
              <FileDown size={14} /> {pdfCargando ? "Generando..." : "Descargar PDF"}
            </Boton>
          </div>
        }
      />

      <div className="overflow-x-auto pb-8">
        <HojaPreliquidacion
          empresa={empresa}
          codigo={pl.codigo}
          estado={pl.estado}
          fecha={pl.fecha}
          moneda={pl.moneda}
          tipoCambio={tc}
          cliente={cliente ?? null}
          proyectoNombre={proyecto?.nombre || "—"}
          concepto={pl.concepto}
          ordenCompra={pl.orden_compra ?? ""}
          lineas={lineas.map((l) => ({
            descripcion: l.descripcion,
            unidad: l.unidad,
            cantidad: String(l.cantidad),
            precio_unitario: String(l.precio_unitario),
          }))}
          amortizacion={amortizacion}
          tipoTributario={tipo}
          pctDetraccion={Number(pl.pct_detraccion || 0)}
          condicionPago={pl.condicion_pago}
          diasCredito={Number(pl.dias_credito || 0)}
          fechaVencimiento={pl.fecha_vencimiento || ""}
          observacion={pl.observacion || ""}
          cuentas={cuentas}
        />
      </div>
    </>
  );
}
