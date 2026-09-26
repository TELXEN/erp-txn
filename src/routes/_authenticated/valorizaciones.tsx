import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { ofertaProyecto, usePartidas, useProyectos, useTiposPresupuesto, useVentas } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { CamposCondicion, InsigniaPago, condicionVacia, datosCondicion } from "@/components/CondicionPago";
import { Preliquidaciones, calcularMontos, type Preliquidacion } from "@/components/Preliquidaciones";

export const Route = createFileRoute("/_authenticated/valorizaciones")({
  head: () => ({
    meta: [
      { title: "Facturación — ERP TELXEN" },
      { name: "description", content: "Preliquidaciones y facturas emitidas con detracciones, crédito y cobranza." },
      { property: "og:title", content: "Facturación — ERP TELXEN" },
      { property: "og:description", content: "Preliquidaciones y facturas emitidas por obra." },
    ],
  }),
  component: Valorizaciones,
});

function Valorizaciones() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: ventas = [] } = useVentas();
  const { data: partidas = [] } = usePartidas();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: clientes = [] } = useQuery({
    queryKey: ["terceros", "clientes-activos"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("terceros")
        .select("id, razon_social, numero_documento, direccion")
        .eq("es_cliente", true)
        .eq("activo", true)
        .order("razon_social");
      if (err) throw err;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({
    proyecto_id: "",
    cliente_id: "",
    concepto: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    numero_factura: "",
    fecha_pago: hoy(),
    estado: "Pendiente de Pago",
    fecha_emision: hoy(),
    ...condicionVacia("Crédito"),
    pct_detraccion: "4",
    preliquidacion_id: "",
  });
  const [pestana, setPestana] = useState<"pre" | "fac">("pre");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [avisoCobro, setAvisoCobro] = useState("");

  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
  const nombreCliente = (id: string | null) => clientes.find((c) => c.id === id)?.razon_social ?? "—";
  const ventasFiltradas = ventas.filter((v) =>
    coincide(busqueda, v.concepto, nombreCliente(v.cliente_id), nombreProy(v.proyecto_id), v.numero_factura),
  );
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);
  const totalCobrado = ventas.filter((v) => v.estado === "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
  const totalPendiente = ventas.filter((v) => v.estado !== "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);

  /** Presupuesto ofertado neto (costo directo + GG + utilidad) de una obra. */
  function ofertadoDe(proyectoId: string) {
    const proy = proyectos.find((p) => p.id === proyectoId);
    if (!proy) return 0;
    return ofertaProyecto(
      partidas.filter((p) => p.proyecto_id === proyectoId),
      tiposPresupuesto,
      Number(proy.pct_gastos_generales ?? 0),
      Number(proy.pct_utilidad ?? 0),
    ).ofertado;
  }

  function facturadoDe(proyectoId: string, excluirId?: string) {
    return ventas
      .filter((v) => v.proyecto_id === proyectoId && v.id !== excluirId)
      .reduce((s, v) => s + Number(v.monto_soles), 0);
  }

  const ofertadoSel = form.proyecto_id ? ofertadoDe(form.proyecto_id) : 0;
  const facturadoSel = form.proyecto_id ? facturadoDe(form.proyecto_id) : 0;
  const saldoSel = ofertadoSel - facturadoSel;
  const tcForm = form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1;
  const montosForm = calcularMontos(Number(form.monto || 0), Number(form.pct_detraccion || 0), tcForm);

  function facturarDesde(pl: Preliquidacion, neto: number) {
    setForm({
      ...form,
      proyecto_id: pl.proyecto_id,
      cliente_id: pl.cliente_id ?? "",
      concepto: pl.concepto,
      monto: String(Math.round(neto * 100) / 100),
      moneda: pl.moneda,
      tipo_cambio: String(pl.tipo_cambio),
      numero_factura: "",
      fecha_emision: hoy(),
      condicion_pago: pl.condicion_pago,
      dias_credito: String(pl.dias_credito),
      estado: "Pendiente de Pago",
      pct_detraccion: String(pl.pct_detraccion),
      preliquidacion_id: pl.id,
    });
    setError("");
    setPestana("fac");
  }

  async function marcarDetraccion(id: string) {
    const constancia = window.prompt("N° de constancia de depósito de detracción (Banco de la Nación):");
    if (constancia === null) return;
    await supabase
      .from("ventas")
      .update({ detraccion_estado: "Depositada", detraccion_fecha: hoy(), detraccion_constancia: constancia.trim().slice(0, 40) } as never)
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["ventas"] });
  }

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const nuevoSoles = Number(form.monto || 0) * tc;
    const ofertado = ofertadoDe(form.proyecto_id);
    const facturado = facturadoDe(form.proyecto_id);
    const saldo = ofertado - facturado;
    if (ofertado <= 0)
      return setError(
        "Esta obra aún no tiene presupuesto ofertado. Registra primero sus partidas y los porcentajes de gastos generales y utilidad.",
      );
    if (nuevoSoles > saldo + 0.01)
      return setError(
        `El importe de ${soles(nuevoSoles)} supera el saldo disponible por facturar (${soles(Math.max(saldo, 0))}). ` +
          `El presupuesto ofertado de la obra es ${soles(ofertado)} y ya hay ${soles(facturado)} registrados. ` +
          "Registra las partidas contractuales o adicionales que falten, o corrige el valor neto.",
      );
    const mm = calcularMontos(Number(form.monto || 0), Number(form.pct_detraccion || 0), tc);
    const { error: err } = await supabase.from("ventas").insert({
      preliquidacion_id: form.preliquidacion_id || null,
      igv: mm.igv,
      total: mm.total,
      pct_detraccion: mm.aplica ? Number(form.pct_detraccion || 0) : 0,
      monto_detraccion: mm.detraccion,
      detraccion_estado: mm.aplica ? "Pendiente" : "No aplica",
      proyecto_id: form.proyecto_id,
      cliente_id: form.cliente_id,
      concepto: form.concepto.trim(),
      monto: Number(form.monto || 0),
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: Number(form.monto || 0) * tc,
      numero_factura: form.numero_factura.trim(),
      fecha_pago: form.fecha_pago || null,
      estado: form.estado as "Pagado" | "Pendiente de Pago",
      fecha_emision: form.fecha_emision,
      ...datosCondicion(form, form.fecha_emision),
    } as never);
    if (err) return setError(err.message);
    if (form.preliquidacion_id) {
      await supabase.from("preliquidaciones").update({ estado: "Facturada" } as never).eq("id", form.preliquidacion_id);
      qc.invalidateQueries({ queryKey: ["preliquidaciones"] });
    }
    setForm({ ...form, cliente_id: "", concepto: "", monto: "", numero_factura: "", preliquidacion_id: "" });
    qc.invalidateQueries({ queryKey: ["ventas"] });
  }

  async function cambiarEstado(id: string, estado: string) {
    setAvisoCobro("");
    const venta = ventas.find((v) => v.id === id);
    if (venta && estado === "Pagado") {
      const ofertado = ofertadoDe(venta.proyecto_id);
      const cobrado = ventas
        .filter((v) => v.proyecto_id === venta.proyecto_id && v.estado === "Pagado" && v.id !== id)
        .reduce((s, v) => s + Number(v.monto_soles), 0);
      if (cobrado + Number(venta.monto_soles) > ofertado + 0.01) {
        setAvisoCobro(
          `No se puede marcar como cobrado: el total cobrado llegaría a ${soles(cobrado + Number(venta.monto_soles))} ` +
            `y el presupuesto ofertado de la obra es ${soles(ofertado)}.`,
        );
        return;
      }
    }
    await supabase
      .from("ventas")
      .update({ estado: estado as "Pagado" | "Pendiente de Pago" })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["ventas"] });
  }

  return (
    <>
      <Encabezado
        titulo="Facturación"
        subtitulo="Comercial · preliquidaciones y facturas emitidas"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("valorizaciones", [
                {
                  nombre: "Ingresos",
                  filas: ventas.map((v) => ({
                    Proyecto: nombreProy(v.proyecto_id),
                    Cliente: nombreCliente(v.cliente_id),
                    Concepto: v.concepto,
                    Monto: Number(v.monto),
                    Moneda: v.moneda,
                    "Tipo de Cambio": Number(v.tipo_cambio),
                    "Equivalente (S/)": Number(v.monto_soles),
                    Factura: v.numero_factura,
                    "Fecha de Pago": v.fecha_pago ?? "",
                    Estado: v.estado,
                  })),
                },
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <div className="mb-4 flex gap-2">
        <Boton variante={pestana === "pre" ? "primario" : "linea"} onClick={() => setPestana("pre")}>Preliquidaciones</Boton>
        <Boton variante={pestana === "fac" ? "primario" : "linea"} onClick={() => setPestana("fac")}>Facturas emitidas</Boton>
      </div>

      {pestana === "pre" ? (
        <Preliquidaciones
          proyectos={proyectos}
          clientes={clientes}
          ofertadoDe={ofertadoDe}
          facturadoDe={(id) => facturadoDe(id)}
          onFacturar={facturarDesde}
        />
      ) : (
      <>
      <Panel titulo={form.preliquidacion_id ? "Registrar factura desde preliquidación" : "Registrar factura emitida"} className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Proyecto">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Cliente">
            <Select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razon_social} · {cliente.numero_documento}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Concepto">
            <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="Monto valorizado (valor neto sin IGV)">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 (neto sin IGV)"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              required
            />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Ingresa solo la base imponible, sin IGV. Este importe se compara con el presupuesto ofertado de la obra.
            </p>
          </Campo>
          <Campo etiqueta="Moneda">
            <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo etiqueta="Tipo de cambio">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.tipo_cambio}
              onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })}
              disabled={form.moneda === "PEN"}
              required={form.moneda === "USD"}
            />
          </Campo>
          <Campo etiqueta="Serie y N° SUNAT (ej. F001-123)">
            <Input value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} maxLength={40} />
          </Campo>
          <Campo etiqueta="Fecha de emisión">
            <Input type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} />
          </Campo>
          <CamposCondicion valor={form} fechaBase={form.fecha_emision} onChange={(c) => setForm({ ...form, ...c })} />
          <Campo etiqueta="% Detracción (SPOT)">
            <Input type="number" step="0.01" min="0" max="100" value={form.pct_detraccion} onChange={(e) => setForm({ ...form, pct_detraccion: e.target.value })} />
          </Campo>
          <Campo etiqueta="Fecha de pago">
            <Input type="date" value={form.fecha_pago} onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estado">
            <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="Pendiente de Pago">Pendiente de Pago</option>
              <option value="Pagado">Pagado</option>
            </Select>
          </Campo>
          {form.proyecto_id && (
            <div className="sm:col-span-4 grid gap-3 rounded-lg border border-line bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Presupuesto ofertado (neto)</p>
                <p className="font-mono text-sm font-semibold text-ink">{soles(ofertadoSel)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Facturado a la fecha</p>
                <p className="font-mono text-sm font-semibold text-ink">{soles(facturadoSel)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Saldo disponible</p>
                <p className={`font-mono text-sm font-semibold ${saldoSel > 0 ? "text-good" : "text-bad"}`}>
                  {saldoSel > 0 ? soles(saldoSel) : `${soles(saldoSel)} · sin saldo`}
                </p>
              </div>
            </div>
          )}
          <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
            <Boton type="submit">Registrar factura</Boton>
            <span className="font-mono text-xs text-muted-foreground">
              Neto: <strong className="text-ink">{soles(equivalente)}</strong> · IGV {soles(montosForm.igv * tcForm)} · Total{" "}
              <strong className="text-ink">{soles(montosForm.total * tcForm)}</strong> · Detracción {soles(montosForm.detraccion * tcForm)} · Neto a cobrar{" "}
              <strong className="text-ink">{soles(montosForm.cobrar * tcForm)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Facturas emitidas"
        extra={
          <div className="flex items-center gap-2">
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              total={ventasFiltradas.length}
              placeholder="Buscar por concepto, cliente, proyecto o factura..."
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              Cobrado {soles(totalCobrado)} · Pendiente {soles(totalPendiente)}
            </span>
          </div>
        }
      >
        {avisoCobro && <p className="px-5 pt-3 font-mono text-xs text-bad">{avisoCobro}</p>}
        {ventasFiltradas.length === 0 ? (
          <Vacio
            texto={
              busqueda
                ? `Sin coincidencias para «${busqueda}»`
                : "Aún no hay facturas registradas."
            }
          />
        ) : ventas.length === 0 ? (
          <Vacio texto="Aún no hay valorizaciones." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Factura</th>
                <th className="px-3 py-2 font-medium">Condición</th>
                <th className="px-3 py-2 font-medium">Pago</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-right font-medium">Neto S/</th>
                <th className="px-3 py-2 text-right font-medium">Detracción</th>
                <th className="px-5 py-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((v) => (
                <tr key={v.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink"><Resaltar texto={v.concepto} termino={busqueda}/></td>
                  <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={nombreCliente(v.cliente_id)} termino={busqueda}/></td>
                  <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={nombreProy(v.proyecto_id)} termino={busqueda}/></td>
                  <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={v.numero_factura || "—"} termino={busqueda}/></td>
                  <td className="px-3 py-2.5">
                    <InsigniaPago
                      condicion={(v as { condicion_pago?: string }).condicion_pago}
                      vencimiento={(v as { fecha_vencimiento?: string | null }).fecha_vencimiento}
                      pagado={v.estado === "Pagado"}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.fecha_pago ? fmtFecha(v.fecha_pago) : "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {v.moneda === "USD" ? `US$ ${Number(v.monto).toFixed(2)}` : soles(Number(v.monto))}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{soles(Number(v.monto_soles))}</td>
                  <td className="px-3 py-2.5 text-right">
                    {(() => {
                      const x = v as unknown as { monto_detraccion?: number; detraccion_estado?: string; detraccion_constancia?: string };
                      if (!x.monto_detraccion) return <span className="text-muted-foreground">—</span>;
                      const monto = Number(x.monto_detraccion) * Number(v.tipo_cambio || 1);
                      return x.detraccion_estado === "Depositada" ? (
                        <span className="text-good" title={`Constancia ${x.detraccion_constancia ?? ""}`}>{soles(monto)} · Depositada</span>
                      ) : (
                        <button onClick={() => marcarDetraccion(v.id)} className="text-bad underline-offset-2 hover:underline" title="Marcar como depositada">
                          {soles(monto)} · Pendiente
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Etiqueta tono={v.estado === "Pagado" ? "good" : "bad"}>{v.estado}</Etiqueta>
                      <Select className="w-44" value={v.estado} onChange={(e) => cambiarEstado(v.id, e.target.value)}>
                        <option value="Pendiente de Pago">Pendiente de Pago</option>
                        <option value="Pagado">Pagado</option>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      </>
      )}
    </>
  );
}
