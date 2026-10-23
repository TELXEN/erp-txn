import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Campo, Input, Boton } from "@/components/ui-kit";
import { guardarConfigSire, validarConexionSire } from "@/lib/sire.functions";

/** Credenciales API SOL de SUNAT (SIRE). Solo Gerencia. */
export function ConfigSol() {
  const guardar = useServerFn(guardarConfigSire);
  const validar = useServerFn(validarConexionSire);
  const [f, setF] = useState({ ruc: "", client_id: "", usuario_sol: "", client_secret: "", clave_sol: "" });
  const [tiene, setTiene] = useState({ s: false, c: false });
  const [ocupado, setOcupado] = useState<"" | "g" | "v">("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sire_config").select("*").limit(1).maybeSingle();
      if (data) {
        setF((x) => ({ ...x, ruc: data.ruc, client_id: data.client_id, usuario_sol: data.usuario_sol }));
        setTiene({ s: data.tiene_secret, c: data.tiene_clave });
      } else {
        const { data: emp } = await supabase.from("empresa_config").select("ruc").limit(1).maybeSingle();
        if (emp?.ruc) setF((x) => ({ ...x, ruc: emp.ruc ?? "" }));
      }
    })();
  }, []);

  async function onGuardar() {
    setOcupado("g");
    try {
      await guardar({ data: f });
      setTiene({ s: tiene.s || !!f.client_secret, c: tiene.c || !!f.clave_sol });
      setF({ ...f, client_secret: "", clave_sol: "" });
      toast.success("Credenciales guardadas de forma segura");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally { setOcupado(""); }
  }
  async function onValidar() {
    setOcupado("v");
    try {
      const r = await validar();
      r.ok ? toast.success(r.mensaje) : toast.error(r.mensaje);
    } finally { setOcupado(""); }
  }

  return (
    <Panel titulo="SUNAT SIRE · API SOL" extra={<span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" />Acceso restringido a Gerencia</span>}>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <Campo etiqueta="RUC de la empresa"><Input value={f.ruc} maxLength={11} onChange={(e) => setF({ ...f, ruc: e.target.value.replace(/\D/g, "") })} /></Campo>
        <Campo etiqueta="Client ID"><Input value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} /></Campo>
        <Campo etiqueta="Client Secret"><Input type="password" placeholder={tiene.s ? "••••••• guardado" : ""} value={f.client_secret} onChange={(e) => setF({ ...f, client_secret: e.target.value })} /></Campo>
        <Campo etiqueta="Usuario SOL"><Input value={f.usuario_sol} onChange={(e) => setF({ ...f, usuario_sol: e.target.value.toUpperCase() })} /></Campo>
        <Campo etiqueta="Clave SOL"><Input type="password" placeholder={tiene.c ? "••••••• guardado" : ""} value={f.clave_sol} onChange={(e) => setF({ ...f, clave_sol: e.target.value })} /></Campo>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Boton variante="linea" onClick={onValidar} disabled={!!ocupado}><RefreshCw className={`size-3.5 ${ocupado === "v" ? "animate-spin" : ""}`} />Validar Conexión</Boton>
        <Boton onClick={onGuardar} disabled={!!ocupado}>{ocupado === "g" ? "Guardando…" : "Guardar credenciales"}</Boton>
      </div>
    </Panel>
  );
}

