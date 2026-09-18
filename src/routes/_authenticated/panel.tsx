import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/panel")({
  component: Panel,
});

function Panel() {
  const { rol, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cargando) return;
    if (rol === "gerente") navigate({ to: "/dashboard", replace: true });
    else if (rol === "administrador") navigate({ to: "/tareo", replace: true });
    else if (rol === "ingeniero") navigate({ to: "/avance", replace: true });
  }, [rol, cargando, navigate]);

  return <p className="font-mono text-xs text-muted-foreground">Cargando tu panel...</p>;
}
