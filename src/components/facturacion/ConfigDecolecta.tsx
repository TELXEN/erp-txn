import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { Boton } from "@/components/ui-kit";
import { estadoDecolecta, guardarDecolecta, probarDecolecta } from "@/lib/decolecta.functions";

/** Botón + panel para que Gerencia/Administración configure la clave de Decolecta. */
export function ConfigDecolecta() {
  const estado = useServerFn(estadoDecolecta);
  const guardar = useServerFn(guardarDecolecta);
  const probar = useServerFn(probarDecolecta);
  const [abierto, setAbierto] = useState(false);
  const [info, setInfo] = useState<{ configurado: boolean; terminacion: string; actualizado: string } | null>(null);
  const [clave, setClave] = useState("");
  const [ocupado, setOcupado] = useState<"" | "g" | "p">("");
  const [msg, setMsg] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const cargar = () => estado().then(setInfo).catch(() => setInfo(null));
  useEffect(() => { void cargar(); }, []);

  async function onGuardar() {
    setOcupado("g"); setMsg(null);
    try {
      const r = await guardar({ data: { apiKey: clave } });
      setMsg(r);
      if (r.ok) { toast.success(r.mensaje); setClave(""); void cargar(); }
    } catch (e) { setMsg({ ok: false, mensaje: e instanceof Error ? e.message : "No se pudo guardar." }); }
    setOcupado("");
  }
  async function onProbar() {
    setOcupado("p"); setMsg(null);
    try { setMsg(await probar()); } catch (e) { setMsg({ ok: false, mensaje: e instanceof Error ? e.message : "Error" }); }
    setOcupado("");
  }

  return (
    <div className="relative">
      <Boton variante="linea" onClick={() => setAbierto((v) => !v)}>
        <KeyRound size={14} />API Decolecta
        <span className={`ml-1 inline-block size-2 rounded-full ${info?.configurado ? "bg-good" : "bg-bad"}`} />
      </Boton>
      {abierto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-96 rounded-lg border bg-card p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Consulta RUC / DNI y tipo de cambio</h3>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {info?.configurado
              ? <>Estado: <span className="text-good font-medium">Configurada</span>{info.terminacion && <> · termina en ****{info.terminacion}</>}{info.actualizado && <> · {new Date(info.actualizado).toLocaleDateString("es-PE")}</>}</>
              : <>Estado: <span className="text-bad font-medium">Sin configurar</span></>}
          </p>
          <label className="mb-1 block text-xs font-medium">{info?.configurado ? "Reemplazar clave" : "Clave (token) de Decolecta"}</label>
          <input type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Pega aquí tu token" className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {msg && <p className={`mb-3 text-xs ${msg.ok ? "text-good" : "text-bad"}`}>{msg.mensaje}</p>}
          <div className="flex justify-end gap-2">
            <Boton variante="linea" onClick={onProbar} disabled={ocupado !== "" || !info?.configurado}>{ocupado === "p" ? "Probando…" : "Probar conexión"}</Boton>
            <Boton onClick={onGuardar} disabled={ocupado !== "" || clave.trim().length < 10}>{ocupado === "g" ? "Verificando…" : "Verificar y guardar"}</Boton>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">La clave se guarda protegida y nunca se muestra completa. Solo Gerencia y Administración pueden verla o cambiarla.</p>
        </div>
      )}
    </div>
  );
}
