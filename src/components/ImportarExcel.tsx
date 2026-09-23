import { useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Etiqueta } from "@/components/ui-kit";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { usePartidas, useProyectos } from "@/lib/datos";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useCategoriasPartida } from "@/lib/categorias";
import { montoPartida, useUnidadesMedida } from "@/lib/unidades";

type FilaCat = { fila: number; especialidad: string; codigo: string; nombre: string; errores: string[] };
type FilaPar = {
  fila: number;
  proyecto_id: string;
  obra: string;
  especialidad: string;
  categoria: string;
  codigo: string;
  nombre: string;
  unidad: string;
  metrado: number;
  precio_unitario: number;
  tipo: string;
  errores: string[];
};

const txt = (v: unknown) => String(v ?? "").trim();
const norm = (v: string) => v.trim().toLowerCase();
const campo = (r: Record<string, unknown>, ...claves: string[]) => {
  for (const k of Object.keys(r)) if (claves.some((c) => norm(k) === norm(c))) return r[k];
  return "";
};

export function ImportarExcel() {
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: categorias = [] } = useCategoriasPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const [abierto, setAbierto] = useState(false);
  const [cats, setCats] = useState<FilaCat[]>([]);
  const [pars, setPars] = useState<FilaPar[]>([]);
  const [archivo, setArchivo] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  const buscarEsp = (v: string) =>
    especialidades.find((e) => norm(e.nombre) === norm(v) || e.codigo === v || norm(`${e.codigo} ${e.nombre}`) === norm(v));

  function descargarPlantilla() {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet([{ Especialidad: "Instalaciones Eléctricas", Código: "05.21", Nombre: "NUEVA CATEGORÍA" }]),
      "Categorías",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet([
        {
          Obra: proyectos[0]?.codigo || proyectos[0]?.nombre || "PRY-2026-001",
          Especialidad: "Instalaciones Eléctricas",
          Categoría: "SUMINISTRO DE TABLEROS ELÉCTRICOS",
          Código: "05.01.01",
          Partida: "Tablero general TG-01",
          Unidad: "und",
          Metrado: 1,
          "Precio Unitario": 2500,
          Tipo: "Contractual",
        },
      ]),
      "Partidas",
    );
    const ref = XLSX.utils.json_to_sheet([
      ...especialidades.map((e) => ({ Lista: "Especialidad", Valor: e.nombre, Código: e.codigo })),
      ...unidades.filter((u) => u.activo).map((u) => ({ Lista: "Unidad", Valor: u.simbolo, Código: "" })),
      ...proyectos.map((p) => ({ Lista: "Obra", Valor: p.nombre, Código: p.codigo ?? "" })),
    ]);
    XLSX.utils.book_append_sheet(libro, ref, "Referencias");
    XLSX.writeFile(libro, "plantilla-partidas.xlsx");
  }

  async function leer(file: File) {
    setMsg("");
    setArchivo(file.name);
    const libro = XLSX.read(await file.arrayBuffer());
    const hoja = (n: string) => {
      const nombre = libro.SheetNames.find((s) => norm(s).startsWith(n));
      return nombre ? XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[nombre]!, { defval: "" }) : [];
    };

    // Categorías
    const vistos = new Set<string>();
    const nuevasCats: FilaCat[] = hoja("categor").map((r, i) => {
      const f: FilaCat = {
        fila: i + 2,
        especialidad: txt(campo(r, "Especialidad")),
        codigo: txt(campo(r, "Código", "Codigo")),
        nombre: txt(campo(r, "Nombre", "Categoría", "Categoria")),
        errores: [],
      };
      const esp = buscarEsp(f.especialidad);
      if (!esp) f.errores.push(`Especialidad inexistente "${f.especialidad}"`);
      else {
        f.especialidad = esp.nombre;
        if (f.codigo && !f.codigo.startsWith(`${esp.codigo}.`)) f.errores.push(`El código debe empezar por ${esp.codigo}.`);
      }
      if (!f.codigo) f.errores.push("Falta código");
      if (!f.nombre) f.errores.push("Falta nombre");
      if (vistos.has(f.codigo)) f.errores.push("Código duplicado en el archivo");
      if (categorias.some((c) => c.codigo === f.codigo)) f.errores.push("Código ya registrado");
      if (categorias.some((c) => c.especialidad === f.especialidad && norm(c.nombre) === norm(f.nombre)))
        f.errores.push("Categoría ya registrada");
      vistos.add(f.codigo);
      return f;
    });

    // Partidas
    const vistosPar = new Set<string>();
    const nuevasPar: FilaPar[] = hoja("partida").map((r, i) => {
      const obra = txt(campo(r, "Obra", "Proyecto"));
      const proy = proyectos.find((p) => p.codigo === obra || norm(p.nombre) === norm(obra));
      const metrado = Number(campo(r, "Metrado", "Cantidad"));
      const pu = Number(campo(r, "Precio Unitario", "P.U.", "PU"));
      const f: FilaPar = {
        fila: i + 2,
        proyecto_id: proy?.id ?? "",
        obra,
        especialidad: txt(campo(r, "Especialidad")),
        categoria: txt(campo(r, "Categoría", "Categoria")),
        codigo: txt(campo(r, "Código", "Codigo")),
        nombre: txt(campo(r, "Partida", "Nombre", "Descripción")),
        unidad: txt(campo(r, "Unidad", "Und")),
        metrado,
        precio_unitario: pu,
        tipo: txt(campo(r, "Tipo")) || "Contractual",
        errores: [],
      };
      if (!proy) f.errores.push(`Obra inexistente "${obra}"`);
      const esp = buscarEsp(f.especialidad);
      if (!esp) f.errores.push(`Especialidad inexistente "${f.especialidad}"`);
      else f.especialidad = esp.nombre;
      if (f.categoria) {
        const existe =
          categorias.some((c) => c.especialidad === f.especialidad && norm(c.nombre) === norm(f.categoria)) ||
          nuevasCats.some((c) => c.errores.length === 0 && c.especialidad === f.especialidad && norm(c.nombre) === norm(f.categoria));
        if (!existe) f.errores.push(`Categoría "${f.categoria}" no existe en la especialidad`);
      }
      if (!f.codigo) f.errores.push("Falta código");
      if (!f.nombre) f.errores.push("Falta partida");
      const unid = unidades.find((u) => norm(u.simbolo) === norm(f.unidad));
      if (!unid) f.errores.push(`Unidad no reconocida "${f.unidad}"`);
      else f.unidad = unid.simbolo;
      if (!Number.isFinite(metrado) || metrado <= 0) f.errores.push("Metrado inválido");
      if (!Number.isFinite(pu) || pu < 0) f.errores.push("Precio unitario inválido");
      const clave = `${f.proyecto_id}|${f.codigo}`;
      if (vistosPar.has(clave)) f.errores.push("Código duplicado en el archivo");
      if (proy && partidas.some((p) => p.proyecto_id === proy.id && p.codigo === f.codigo))
        f.errores.push("Código ya registrado en la obra");
      vistosPar.add(clave);
      return f;
    });

    setCats(nuevasCats);
    setPars(nuevasPar);
    if (!nuevasCats.length && !nuevasPar.length) setMsg("No se encontraron hojas \"Categorías\" ni \"Partidas\" con datos.");
  }

  const errores = [...cats, ...pars].filter((f) => f.errores.length).length;
  const total = cats.length + pars.length;

  async function guardar() {
    setGuardando(true);
    setMsg("");
    if (cats.length) {
      const { error } = await supabase.from("categorias_partida").insert(
        cats.map((c) => ({
          especialidad: c.especialidad,
          codigo: c.codigo,
          nombre: c.nombre,
          orden: Number(c.codigo.split(".").pop()) || 0,
        })),
      );
      if (error) {
        setGuardando(false);
        return setMsg(`Error al guardar categorías: ${error.message}`);
      }
    }
    if (pars.length) {
      const { error } = await supabase.from("partidas").insert(
        pars.map((p) => ({
          proyecto_id: p.proyecto_id,
          especialidad: p.especialidad,
          categoria: p.categoria,
          codigo: p.codigo,
          nombre: p.nombre,
          unidad: p.unidad,
          metrado: p.metrado,
          precio_unitario: p.precio_unitario,
          presupuesto_inicial: montoPartida(p.metrado, p.precio_unitario),
          tipo_presupuesto: p.tipo,
        })),
      );
      if (error) {
        setGuardando(false);
        qc.invalidateQueries({ queryKey: ["categorias_partida"] });
        return setMsg(`Error al guardar partidas: ${error.message}`);
      }
    }
    setGuardando(false);
    qc.invalidateQueries({ queryKey: ["categorias_partida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
    setMsg(`Importación completada: ${cats.length} categorías y ${pars.length} partidas.`);
    setCats([]);
    setPars([]);
  }

  return (
    <>
      <Boton variante="linea" onClick={() => setAbierto(true)}>
        <Download size={13} /> Importar Excel
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4">
          <div className="panel mt-10 w-full max-w-5xl bg-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-base font-semibold">Importar categorías y partidas</h2>
              <button type="button" onClick={() => setAbierto(false)} className="text-muted-foreground hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Boton variante="linea" onClick={descargarPlantilla}>
                  <FileSpreadsheet size={13} /> Descargar plantilla
                </Boton>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 font-mono text-xs text-primary-foreground">
                  <Upload size={13} /> Cargar archivo
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) leer(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {archivo && <span className="font-mono text-xs text-muted-foreground">{archivo}</span>}
              </div>

              {total > 0 && (
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <Etiqueta tono="good">{total - errores} válidas</Etiqueta>
                  <Etiqueta tono={errores ? "bad" : "neutro"}>{errores} con error</Etiqueta>
                  {errores > 0 && <span className="text-bad">Corrige el archivo y vuelve a cargarlo para poder guardar.</span>}
                </div>
              )}

              {cats.length > 0 && (
                <Tabla
                  titulo="Categorías"
                  columnas={["Fila", "Especialidad", "Código", "Nombre", "Validación"]}
                  filas={cats.map((c) => [c.fila, c.especialidad, c.codigo, c.nombre, c.errores])}
                />
              )}
              {pars.length > 0 && (
                <Tabla
                  titulo="Partidas"
                  columnas={["Fila", "Obra", "Especialidad", "Categoría", "Código", "Partida", "Und", "Metrado", "P.U.", "Validación"]}
                  filas={pars.map((p) => [p.fila, p.obra, p.especialidad, p.categoria, p.codigo, p.nombre, p.unidad, p.metrado, p.precio_unitario, p.errores])}
                />
              )}

              {msg && <p className="font-mono text-xs text-ink">{msg}</p>}

              <div className="flex justify-end gap-2">
                <Boton variante="linea" onClick={() => setAbierto(false)}>Cerrar</Boton>
                <Boton onClick={guardar} disabled={!total || errores > 0 || guardando}>
                  {guardando ? "Guardando..." : `Guardar ${total} filas`}
                </Boton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tabla({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number | string[])[][] }) {
  return (
    <div>
      <p className="label-mono mb-1">{titulo}</p>
      <div className="max-h-72 overflow-auto rounded-md border border-line">
        <table className="w-full font-mono text-[11px]">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-left text-[10px] uppercase text-muted-foreground">
              {columnas.map((c) => (
                <th key={c} className="px-2 py-1.5 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const errs = f[f.length - 1] as string[];
              return (
                <tr key={i} className={`border-t border-line/40 ${errs.length ? "bg-bad/5" : ""}`}>
                  {f.slice(0, -1).map((v, j) => (
                    <td key={j} className="px-2 py-1">{String(v)}</td>
                  ))}
                  <td className="px-2 py-1">
                    {errs.length ? <span className="text-bad">{errs.join(" · ")}</span> : <span className="text-good">OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
