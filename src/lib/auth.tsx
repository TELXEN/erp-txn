import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type Rol = "ingeniero" | "administrador" | "gerente";

export const ETIQUETA_ROL: Record<Rol, string> = {
  ingeniero: "Ingeniero de Campo",
  administrador: "Administrador de Oficina",
  gerente: "Gerente / Dueño",
};

type AuthState = {
  session: Session | null;
  nombre: string;
  email: string;
  rol: Rol | null;
  cargando: boolean;
  recargar: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  nombre: "",
  email: "",
  rol: null,
  cargando: true,
  recargar: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = async (userId: string) => {
    const [{ data: perfil }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("nombre").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setNombre(perfil?.nombre ?? "");
    const lista = (roles ?? []).map((r) => r.role as Rol);
    const prioridad: Rol[] = ["gerente", "administrador", "ingeniero"];
    setRol(prioridad.find((p) => lista.includes(p)) ?? null);
  };

  const recargar = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await cargarPerfil(data.session.user.id);
    else {
      setRol(null);
      setNombre("");
    }
    setCargando(false);
  };

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      if (data.session?.user) await cargarPerfil(data.session.user.id);
      setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nuevaSesion) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(nuevaSesion);
      if (nuevaSesion?.user) {
        void cargarPerfil(nuevaSesion.user.id);
      } else {
        setRol(null);
        setNombre("");
      }
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        nombre,
        email: session?.user.email ?? "",
        rol,
        cargando,
        recargar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const puedeVerDinero = (rol: Rol | null) => rol === "administrador" || rol === "gerente";
