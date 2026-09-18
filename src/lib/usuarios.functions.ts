import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esquema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(100),
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  rol: z.enum(["ingeniero", "administrador", "gerente"]),
});

const esquemaActualizar = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, "Nombre requerido").max(100),
  email: z.string().trim().email("Correo inválido").max(255),
  rol: z.enum(["ingeniero", "administrador", "gerente"]),
});

const esquemaEliminar = z.object({
  id: z.string().uuid(),
});

async function verificarGerente(context: { supabase: typeof import("@/integrations/supabase/client.server").supabaseAdmin; userId: string }) {
  const { data: esGerente } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "gerente",
  });
  if (!esGerente) throw new Error("Solo la gerencia puede gestionar usuarios.");
}

export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquema.parse(input))
  .handler(async ({ data, context }) => {
    await verificarGerente(context as unknown as Parameters<typeof verificarGerente>[0]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre },
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear el usuario.");

    const id = creado.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id, nombre: data.nombre, email: data.email }, { onConflict: "id" });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.rol });

    return { id };
  });

export const actualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaActualizar.parse(input))
  .handler(async ({ data, context }) => {
    await verificarGerente(context as unknown as Parameters<typeof verificarGerente>[0]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      email_confirm: true,
      user_metadata: { nombre: data.nombre },
    });
    if (error) throw new Error(error.message ?? "No se pudo actualizar el usuario.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.id, nombre: data.nombre, email: data.email }, { onConflict: "id" });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.rol });

    return { ok: true };
  });

export const eliminarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => esquemaEliminar.parse(input))
  .handler(async ({ data, context }) => {
    await verificarGerente(context as unknown as Parameters<typeof verificarGerente>[0]);

    if (data.id === context.userId) throw new Error("No puede eliminar su propio usuario.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message ?? "No se pudo eliminar el usuario.");

    return { ok: true };
  });
