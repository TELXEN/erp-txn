import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Boton, Campo, Input } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Control de Obra" },
      {
        name: "description",
        content: "Acceso al sistema de control de proyectos de construcción: avance, tareo, gastos y ventas.",
      },
      { property: "og:title", content: "Iniciar sesión — Control de Obra" },
      {
        property: "og:description",
        content: "Acceso al sistema de control de proyectos de construcción.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { session, cargando: cargandoSesion, recargar } = useAuth();
  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!cargandoSesion && session) navigate({ to: "/panel", replace: true });
  }, [session, cargandoSesion, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      if (modo === "entrar") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password: clave });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password: clave,
          options: { data: { nombre }, emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
      }
      await recargar();
      navigate({ to: "/panel", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(
        msg.includes("Invalid login")
          ? "Correo o contraseña incorrectos."
          : msg.includes("already registered")
            ? "Este correo ya está registrado."
            : msg,
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
            CO
          </span>
          <div className="leading-none">
            <p className="text-base font-bold tracking-tight">Control de Obra</p>
            <p className="mt-1 label-mono">Gestión de Proyectos de Construcción</p>
          </div>
        </div>

        <form onSubmit={enviar} className="panel rise space-y-4 p-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {modo === "entrar"
                ? "Ingresa con el correo asignado por tu empresa."
                : "El primer usuario registrado queda como Gerente."}
            </p>
          </div>

          {modo === "registrar" && (
            <Campo etiqueta="Nombre completo">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />
            </Campo>
          )}
          <Campo etiqueta="Correo electrónico">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Contraseña">
            <Input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              minLength={6}
            />
          </Campo>

          {error && <p className="rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}

          <Boton type="submit" disabled={cargando} className="w-full py-2.5">
            {cargando ? "Procesando..." : modo === "entrar" ? "Ingresar" : "Registrarme"}
          </Boton>

          <button
            type="button"
            onClick={() => {
              setModo(modo === "entrar" ? "registrar" : "entrar");
              setError("");
            }}
            className="w-full font-mono text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            {modo === "entrar" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta, iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
