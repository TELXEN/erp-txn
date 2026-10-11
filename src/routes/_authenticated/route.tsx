import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PantallaCarga } from "@/components/PantallaCarga";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // getSession lee la sesión local (sin esperar a la red) en cada navegación;
  // los datos siguen protegidos por las reglas de acceso del servidor.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/" });
    return { user };
  },
  pendingComponent: () => <PantallaCarga completa />,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
