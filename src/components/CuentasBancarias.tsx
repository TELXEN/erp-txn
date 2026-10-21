import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { fecha, hoy } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export type CuentaBancaria = {
  id: string;
  nombre: string;
  monedas: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  cci: string;
  saldo_inicial: number;
  fecha_saldo_inicial: string;
  activo: boolean;
};

const TIPOS = ["Corriente", "Ahorros", "Detracciones"];
const MONEDAS: Record<string, string> = { PEN: "Soles (S/)", USD: "Dólares (US$)" };

const vacio = {
  nombre: "",
  monedas: "PEN",
  tipo_cuenta: "Corriente",
  numero_cuenta: "",
  cci: "",
  saldo_inicial: "0",
  fecha_saldo_inicial: hoy(),
};

const dinero = (n: number, m: string) =>
  `${m === "USD" ? "US$" : "S/"} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function validar(f: { nombre: string; numero_cuenta: string; cci: string; saldo_inicial: string }) {
  if (!f.nombre.trim()) return "Indica el nombre del banco.";
  if (!f.numero_cuenta.trim()) return "Indica el número de cuenta.";
  const cci = f.cci.replace(/[\s-]/g, "").replace(/\D/g, "");
  if (f.cci.trim() && cci.length !== 20) return "La cuenta interbancaria (CCI) debe tener 20 dígitos.";
  if (!Number.isFinite(Number(f.saldo_inicial))) return "El saldo inicial no es válido.";
  return "";
}

export function CuentasBancarias() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const esGerente = rol === "gerente";
  const [form, setForm] = useState(vacio);
  const [edit, setEdit] = useState<(typeof vacio & { id: string; activo: boolean }) | null>(null);
  const [error, setError] = useState("");
  const [verInactivas, setVerInactivas] = useState(false);
  const [sel, setSel] = useState("");

  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return (data ?? []) as unknown as CuentaBancaria[];
    },
  });

  const payload = (f: typeof vacio) => ({
    nombre: f.nombre.trim(),
    monedas: f.monedas,
    tipo_cuenta: f.tipo_cuenta,
    numero_cuenta: f.numero_cuenta.trim(),
    cci: f.cci.replace(/[\s-]/g, "").replace(/\D/g, ""),
    saldo_inicial: Number(f.saldo_inicial || 0),
    fecha_saldo_inicial: f.fecha_saldo_inicial || hoy(),
  });

  const msg = (e: { code?: string; message: string }) =>
    e.code === "23505" ? "Esa cuenta ya está registrada en ese banco." : e.message;

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const v = validar(form);
    if (v) return setError(v);
    setError("");
    const { error: err } = await supabase.from("bancos").insert(payload(form) as never);
    if (err) return setError(msg(err));
    setForm({ ...vacio, fecha_saldo_inicial: hoy() });
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  async function actualizar() {
    if (!edit) return;
    const v = validar(edit);
    if (v) return setError(v);
    setError("");
    const { error: err } = await supabase
      .from("bancos")
      .update({ ...payload(edit), activo: edit.activo } as never)
      .eq("id", edit.id);
    if (err) return setError(msg(err));
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  async function alternar(c: CuentaBancaria) {
    const { error: err } = await supabase.from("bancos").update({ activo: !c.activo } as never).eq("id", c.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta cuenta bancaria? Esta acción no se puede deshacer.")) return;
    const { error: err } = await supabase.from("bancos").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  const editarCuenta = (c: CuentaBancaria) => setEdit({ id: c.id, activo: c.activo, nombre: c.nombre, monedas: c.monedas,
    tipo_cuenta: c.tipo_cuenta, numero_cuenta: c.numero_cuenta, cci: c.cci,
    saldo_inicial: String(c.saldo_inicial), fecha_saldo_inicial: c.fecha_saldo_inicial });

  const actualSel = (id: string) => visibles.find((c) => c.id === id);
  const visibles = cuentas.filter((c) => verInactivas || c.activo);
  const totalPEN = cuentas.filter((c) => c.activo && c.monedas === "PEN").reduce((s, c) => s + Number(c.saldo_inicial), 0);
  const totalUSD = cuentas.filter((c) => c.activo && c.monedas === "USD").reduce((s, c) => s + Number(c.saldo_inicial), 0);

  const campos = (f: typeof vacio, set: (f: typeof vacio) => void, nueva = false) => (
    <>
      <Campo etiqueta="Banco">
        <Input className="py-1.5" value={f.nombre} maxLength={120} required
          onChange={(e) => set({ ...f, nombre: e.target.value })} placeholder="BCP, BBVA, Interbank…" />
      </Campo>
      <Campo etiqueta="Moneda">
        <Select className="py-1.5" value={f.monedas} onChange={(e) => set({ ...f, monedas: e.target.value })}>
          {Object.entries(MONEDAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo etiqueta="Tipo de cuenta">
        <Select className="py-1.5" value={f.tipo_cuenta} onChange={(e) => set({ ...f, tipo_cuenta: e.target.value })}>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Campo>
      <Campo etiqueta="N° de cuenta">
        <Input className="py-1.5" value={f.numero_cuenta} maxLength={30} required disabled={!esGerente && !nueva}
          onChange={(e) => set({ ...f, numero_cuenta: e.target.value })} />
      </Campo>
      <Campo etiqueta="Cuenta interbancaria (CCI)">
        <Input className="py-1.5" value={f.cci} maxLength={28} disabled={!esGerente && !nueva} placeholder="20 dígitos (puedes usar guiones)"
          onChange={(e) => set({ ...f, cci: e.target.value })} />
      </Campo>
      <Campo etiqueta="Saldo inicial">
        <Input className="py-1.5 text-right" type="number" step="0.01" value={f.saldo_inicial} disabled={!esGerente} title={esGerente ? undefined : "Solo la Gerencia puede definir el saldo inicial"}
          onChange={(e) => set({ ...f, saldo_inicial: e.target.value })} />
      </Campo>
      <Campo etiqueta="Fecha del saldo inicial">
        <Input className="py-1.5" type="date" value={f.fecha_saldo_inicial} disabled={!esGerente}
          onChange={(e) => set({ ...f, fecha_saldo_inicial: e.target.value })} />
      </Campo>
    </>
  );

  return (
    <>
      <Panel titulo="Nueva cuenta bancaria" className="mb-4">
        <form onSubmit={crear} className="grid gap-2 p-3 sm:grid-cols-4">
          {campos(form, setForm, true)}
          <div className="flex items-end">
            <Boton type="submit">Registrar cuenta</Boton>
          </div>
        </form>
        {!esGerente && <p className="px-3 pb-2 font-mono text-[11px] text-muted-foreground">El saldo inicial, N° de cuenta, CCI y la eliminación de cuentas están reservados a la Gerencia.</p>}
        {error && <p className="px-3 pb-3 font-mono text-xs text-bad">{error}</p>}
      </Panel>

      {edit && (
        <Panel titulo="Editar cuenta bancaria" className="mb-4">
          <div className="grid gap-2 p-3 sm:grid-cols-4">
            {campos(edit, (f) => setEdit({ ...edit, ...f }))}
            <div className="flex items-end gap-2">
              <Boton type="button" onClick={actualizar}><Check size={14} /> Guardar</Boton>
              <Boton type="button" variante="linea" onClick={() => setEdit(null)}><X size={14} /> Cancelar</Boton>
            </div>
          </div>
        </Panel>
      )}

      <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1"
        titulo="Cuentas bancarias de la empresa"
        extra={
          <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span>Saldo inicial: <b className="text-ink">{dinero(totalPEN, "PEN")}</b> · <b className="text-ink">{dinero(totalUSD, "USD")}</b></span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={verInactivas} onChange={(e) => setVerInactivas(e.target.checked)} />
              Ver inactivas
            </label>
          </div>
        }
      >
        {visibles.length === 0 ? (
          <Vacio texto="Aún no hay cuentas bancarias registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Banco</th>
                  <th className="px-3 py-2 font-medium">Moneda</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">N° Cuenta</th>
                  <th className="px-3 py-2 font-medium">CCI</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo inicial</th>
                  <th className="px-3 py-2 font-medium">Al</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} onClick={() => setSel(c.id)} onDoubleClick={() => editarCuenta(c)} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === c.id ? "bg-primary/10" : ""} ${c.activo ? "" : "opacity-50"}`}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{c.nombre}</td>
                    <td className="px-3 py-2.5">{c.monedas}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.tipo_cuenta}</td>
                    <td className="px-3 py-2.5">{c.numero_cuenta || "—"}</td>
                    <td className="px-3 py-2.5">{c.cci || "—"}</td>
                    <td className="px-3 py-2.5 text-right">{dinero(c.saldo_inicial, c.monedas)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{fecha(c.fecha_saldo_inicial)}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => alternar(c)}
                        className={`rounded px-2 py-0.5 text-[10px] ${c.activo ? "bg-good/15 text-good" : "bg-muted text-muted-foreground"}`}>
                        {c.activo ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <BarraIconosHoja objeto="cuenta" haySeleccion={!!actualSel(sel)}
        onAgregar={() => { setEdit(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onEditar={() => { const c = actualSel(sel); if (c) editarCuenta(c); }}
        onEliminar={esGerente ? () => { if (sel) void eliminar(sel).then(() => setSel("")); } : undefined} />
      </div>
    </>
  );
}
