import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Input, Select } from "@/components/ui-kit";
import { hoy } from "@/lib/format";
import type { CuentaBancaria } from "@/components/CuentasBancarias";

type Saldo = { c: CuentaBancaria; saldo: number };

const dinero = (n: number, m: string) =>
  `${m === "USD" ? "US$" : "S/"} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransferenciaCuentas({ origen, saldos, tcSugerido, onClose }: {
  origen: Saldo; saldos: Saldo[]; tcSugerido: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const destinos = saldos.filter((s) => s.c.activo && s.c.id !== origen.c.id && !/detracc/i.test(s.c.tipo_cuenta ?? ""));
  const [destino, setDestino] = useState(destinos[0]?.c.id ?? "");
  const [monto, setMonto] = useState("");
  const [tc, setTc] = useState(tcSugerido > 0 ? tcSugerido.toFixed(3) : "");
  const [fecha, setFecha] = useState(hoy());
  const [operacion, setOperacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const d = destinos.find((s) => s.c.id === destino);
  const mo = origen.c.monedas, md = d?.c.monedas ?? mo;
  const cambio = mo !== md;
  const m = Number(monto) || 0, t = Number(tc) || 0;
  const recibe = !cambio ? m : mo === "USD" ? m * t : t > 0 ? m / t : 0;
  const excede = m > origen.saldo;
  const valido = d && m > 0 && !excede && (!cambio || t > 0) && operacion.trim() && fecha;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true); setError("");
    const { error } = await supabase.rpc("registrar_transferencia", {
      _origen: origen.c.id, _destino: destino, _monto: m, _tc: cambio ? t : 1, _fecha: fecha, _operacion: operacion.trim(),
    });
    setGuardando(false);
    if (error) return setError(error.message);
    qc.invalidateQueries();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md space-y-3 bg-card p-5 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ArrowLeftRight size={16} /> Transferencia entre cuentas</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-ink"><X size={16} /></button>
        </div>
        <div className="rounded-md border border-line bg-muted/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Cuenta origen</p>
          <p className="font-semibold text-ink">{origen.c.nombre} · {mo}</p>
          <p className={origen.saldo < 0 ? "text-bad" : "text-muted-foreground"}>Disponible: {dinero(origen.saldo, mo)}</p>
        </div>
        {destinos.length === 0 ? <p className="text-bad">No hay otra cuenta comercial activa.</p> : (
          <label className="block">Cuenta destino
            <Select value={destino} onChange={(e) => setDestino(e.target.value)}>
              {destinos.map((s) => <option key={s.c.id} value={s.c.id}>{s.c.nombre} · {s.c.monedas} ({dinero(s.saldo, s.c.monedas)})</option>)}
            </Select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">Monto ({mo})
            <Input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus required />
          </label>
          {cambio && (
            <label className="block">Tipo de cambio
              <Input type="number" step="0.0001" min="0" value={tc} onChange={(e) => setTc(e.target.value)} required />
            </label>
          )}
          <label className="block">Fecha
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label className="block">N° de operación
            <Input value={operacion} onChange={(e) => setOperacion(e.target.value)} maxLength={30} required />
          </label>
        </div>
        {excede && <p className="text-bad">El monto supera el saldo disponible de la cuenta origen.</p>}
        {d && m > 0 && (
          <p className="rounded-md bg-primary/5 p-2 text-ink">Ingresa a {d.c.nombre}: <b className="tabular-nums">{dinero(recibe, md)}</b></p>
        )}
        {error && <p role="alert" className="text-bad">{error}</p>}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="linea" onClick={onClose}>Cancelar</Boton>
          <Boton type="submit" disabled={!valido || guardando}>{guardando ? "Transfiriendo…" : "Transferir"}</Boton>
        </div>
      </form>
    </div>
  );
}
