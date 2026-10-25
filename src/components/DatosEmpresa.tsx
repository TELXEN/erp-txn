import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel } from "@/components/ui-kit";
import { useEmpresa, type Empresa } from "@/lib/empresa";
import { RegimenEmpresaPanel } from "@/components/RegimenEmpresaPanel";

const LIMITE_LOGO = 300 * 1024;

const vacio = {
  razon_social: "",
  ruc: "",
  direccion: "",
  telefono: "",
  email: "",
  web: "",
  eslogan: "",
  rubro: "",
  color_marca: "#1F6F54",
  logo_url: "",
  gerente_nombre: "",
  gerente_dni: "",
  rrhh_nombre: "",
  rrhh_dni: "",
};

export function DatosEmpresa() {
  const qc = useQueryClient();
  const { data: empresa } = useEmpresa();
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (empresa) {
      const { id, created_at, updated_at, ...campos } = empresa as Empresa & {
        created_at?: string;
        updated_at?: string;
      };
      void id;
      void created_at;
      void updated_at;
      setForm({ ...vacio, ...Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v ?? ""])) } as typeof vacio);
    }
  }, [empresa]);

  function cargarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setAviso("");
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG o SVG).");
      return;
    }
    if (file.size > LIMITE_LOGO) {
      setError("La imagen no debe superar 300 KB. Reduce su tamaño e inténtalo nuevamente.");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => setForm((f) => ({ ...f, logo_url: String(lector.result) }));
    lector.readAsDataURL(file);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    setGuardando(true);
    const campos = {
      ...form,
      razon_social: form.razon_social.trim(),
      ruc: form.ruc.trim(),
    };
    const resultado = empresa
      ? await supabase.from("empresa_config").update(campos).eq("id", empresa.id)
      : await supabase.from("empresa_config").insert(campos);
    setGuardando(false);
    if (resultado.error) return setError(resultado.error.message);
    setAviso("Datos de la empresa guardados correctamente.");
    qc.invalidateQueries({ queryKey: ["empresa_config"] });
  }

  return (
    <form onSubmit={guardar} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel titulo="Datos de la empresa">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <p className="col-span-full mt-1 text-xs font-semibold uppercase text-muted-foreground">Información legal</p>
          <Campo etiqueta="Razón social">
            <Input
              className="py-1.5"
              value={form.razon_social}
              onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
              maxLength={160}
              required
            />
          </Campo>
          <Campo etiqueta="RUC">
            <Input
              className="py-1.5"
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
              maxLength={11}
            />
          </Campo>
          <Campo etiqueta="Rubro de la empresa">
            <Input
              className="py-1.5"
              value={form.rubro}
              onChange={(e) => setForm({ ...form, rubro: e.target.value })}
              maxLength={160}
              placeholder="Construcción e ingeniería"
            />
          </Campo>
          <p className="col-span-full mt-3 text-xs font-semibold uppercase text-muted-foreground">Identidad de marca</p>
          <Campo etiqueta="Eslogan de la empresa">
            <Input
              className="py-1.5"
              value={form.eslogan}
              onChange={(e) => setForm({ ...form, eslogan: e.target.value })}
              maxLength={160}
              placeholder="SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"
            />
          </Campo>
          <p className="col-span-full mt-3 text-xs font-semibold uppercase text-muted-foreground">Contacto</p>
          <Campo etiqueta="Dirección fiscal">
            <Input
              className="py-1.5"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              maxLength={200}
            />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Input
              className="py-1.5"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              maxLength={40}
            />
          </Campo>
          <Campo etiqueta="Correo electrónico">
            <Input
              className="py-1.5"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={120}
            />
          </Campo>
          <Campo etiqueta="Sitio web">
            <Input
              className="py-1.5"
              value={form.web}
              onChange={(e) => setForm({ ...form, web: e.target.value })}
              maxLength={120}
            />
          </Campo>
          <p className="col-span-full mt-3 border-t border-line pt-3 text-xs font-semibold uppercase text-muted-foreground">Firmas de documentos laborales — firma RR. HH. si está registrado; si no, el Gerente General</p>
          <Campo etiqueta="Gerente General — nombre">
            <Input className="py-1.5" value={form.gerente_nombre} onChange={(e) => setForm({ ...form, gerente_nombre: e.target.value })} maxLength={120} placeholder="Apellidos y nombres" />
          </Campo>
          <Campo etiqueta="Gerente General — DNI">
            <Input className="py-1.5" value={form.gerente_dni} onChange={(e) => setForm({ ...form, gerente_dni: e.target.value })} maxLength={12} placeholder="8 dígitos" />
          </Campo>
          <Campo etiqueta="Jefe de Recursos Humanos — nombre (opcional)">
            <Input className="py-1.5" value={form.rrhh_nombre} onChange={(e) => setForm({ ...form, rrhh_nombre: e.target.value })} maxLength={120} placeholder="Apellidos y nombres" />
          </Campo>
          <Campo etiqueta="Jefe de Recursos Humanos — DNI">
            <Input className="py-1.5" value={form.rrhh_dni} onChange={(e) => setForm({ ...form, rrhh_dni: e.target.value })} maxLength={12} placeholder="8 dígitos" />
          </Campo>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar datos"}
          </Boton>
          {error && <span className="font-mono text-xs text-bad">{error}</span>}
          {aviso && <span className="font-mono text-xs text-good">{aviso}</span>}
        </div>
      </Panel>

      <Panel titulo="Logotipo">
        <div className="space-y-3 p-4">
          <div className="grid h-36 place-items-center rounded-md border border-dashed border-line bg-muted/40 p-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logotipo de la empresa" className="max-h-28 max-w-full object-contain" />
            ) : (
              <p className="text-center font-mono text-[11px] text-muted-foreground">
                Aún no has cargado un logotipo
              </p>
            )}
          </div>
          <input
            ref={archivo}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={cargarLogo}
          />
          <div className="flex flex-wrap gap-2">
            <Boton type="button" variante="linea" onClick={() => archivo.current?.click()}>
              <Download size={14} /> Cargar imagen
            </Boton>
            {form.logo_url && (
              <Boton type="button" variante="peligro" onClick={() => setForm({ ...form, logo_url: "" })}>
                <Trash2 size={14} /> Quitar
              </Boton>
            )}
          </div>
          <Campo etiqueta="Color de marca">
            <input
              type="color"
              value={form.color_marca}
              onChange={(e) => setForm({ ...form, color_marca: e.target.value })}
              className="h-9 w-full rounded-md border border-line bg-card px-1"
            />
          </Campo>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">

            PNG, JPG, WEBP o SVG. Tamaño máximo 300 KB. Se usará en el membrete de los reportes exportados.
            Recuerda pulsar «Guardar datos» para conservar el cambio.
          </p>
        </div>
      </Panel>
      <div className="lg:col-span-2"><RegimenEmpresaPanel /></div>
    </form>
  );
}
