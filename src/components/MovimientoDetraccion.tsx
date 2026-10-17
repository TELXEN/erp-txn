import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Landmark, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Input, Select } from "@/components/ui-kit";
import { hoy } from "@/lib/format";
import type { CuentaBancaria } from "@/components/CuentasBancarias";

type Saldo = { c: CuentaBancaria; saldo: number };

const TRIBUTOS = ["IGV - Cuenta propia", "Renta 3ra categoría (pago a cuenta)", "EsSalud (PLAME)", "ONP", "Retenciones 4ta categoría", "Retenciones 5ta categoría", "Multa / Fraccionamiento", "Otro tributo"];
const INGRESOS = ["Depósito de detracción de cliente", "Autodepósito", "Otro ingreso"];

export function MovimientoDetraccion({ cuenta, tipoInicial, onClose }: { cuenta: Saldo; tipoInicial: "ingreso" | "pago_sunat"; onClose: () => void }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState(tipoInicial);
  const [concepto, setConcepto] = useState(tipoInicial === "pago_sunat" ? TRIBUTOS[0] : INGRESOS[0]);
  const [periodo, setPeriodo] = useState(hoy().slice(0, 7));
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [operacion, setOperacion] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const m = Number(monto) || 0;
  const excede = tipo === "pago_sunat" && m > cuenta.saldo;
  const valido = m > 0 && !excede && operacion.trim() && fecha;

  function cambiarTipo(t: "ingreso" | "pago_sunat") { setTipo(t); setConcepto(t === "pago_sunat" ? TRIBUTOS[0] : INGRESOS[0]); }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true); setError("");
    const { error } = await supabase.rpc("registrar_movimiento_detraccion", {
      _banco: cuenta.c.id, _tipo: tipo, _concepto: concepto, _periodo: periodo, _monto: m, _fecha: fecha, _operacion: operacion.trim(), _notas: notas,
    });
    setGuardando(false);
    if (error) return setError(error.message);
    qc.invalidateQueries();
    onClose();
  }

  const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md space-y-3 bg-card p-5 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Landmark size={16} /> Cuenta de detracciones</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-ink"><X size={16} /></button>
        </div>
        <div className="rounded-md border border-line bg-muted/40 p-3">
          <p className="font-semibold text-ink">{cuenta.c.nombre} · {cuenta.c.monedas}</p>
          <p className="text-muted-foreground">Disponible: {soles(cuenta.saldo)} · Fondos intangibles, solo para tributos SUNAT</p>
        </div>
        <div className="flex gap-2">
          {(["ingreso", "pago_sunat"] as const).map((t) => (
            <button key={t} type="button" onClick={() => cambiarTipo(t)}
              className={`flex-1 rounded-full border px-3 py-1 ${tipo === t ? "border-primary bg-primary/10 text-primary" : "border-line text-muted-foreground"}`}>
              {t === "ingreso" ? "Registrar ingreso" : "Pagar a SUNAT"}
            </button>
          ))}
        </div>
        <label className="block">{tipo === "pago_sunat" ? "Tributo" : "Concepto"}
          <Select value={concepto} onChange={(e) => setConcepto(e.target.value)}>
            {(tipo === "pago_sunat" ? TRIBUTOS : INGRESOS).map((t) => <option key={t}>{t}</option>)}
          </Select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">Periodo tributario
            <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </label>
          <label className="block">Monto (S/)
            <Input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus required />
          </label>
          <label className="block">Fecha
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label className="block">{tipo === "pago_sunat" ? "N° de constancia / operación" : "N° de operación"}
            <Input value={operacion} onChange={(e) => setOperacion(e.target.value)} maxLength={30} required />
          </label>
        </div>
        <label className="block">Notas
          <Input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} />
        </label>
        {excede && <p className="text-bad">El pago supera el saldo disponible de la cuenta de detracciones.</p>}
        {error && <p role="alert" className="text-bad">{error}</p>}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="linea" onClick={onClose}>Cancelar</Boton>
          <Boton type="submit" disabled={!valido || guardando}>{guardando ? "Guardando…" : tipo === "pago_sunat" ? "Registrar pago" : "Registrar ingreso"}</Boton>
        </div>
      </form>
    </div>
  );
}
