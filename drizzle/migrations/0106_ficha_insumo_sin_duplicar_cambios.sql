CREATE OR REPLACE FUNCTION public.ficha_insumo_despues() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.insumos_aprobaciones (insumo_id, accion, usuario_id, motivo)
    VALUES (NEW.id, CASE WHEN NEW.estado_aprobacion = 'Aprobado' THEN 'Aprobado' ELSE 'Solicitado' END, auth.uid(),
            CASE WHEN NEW.estado_aprobacion = 'Aprobado' THEN 'Aprobado al registrar (Gerencia/Administración)' END);
  ELSIF (to_jsonb(NEW) - 'updated_at' - 'codigo' - 'estado_aprobacion') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at' - 'codigo' - 'estado_aprobacion') THEN
    -- Un mismo guardado puede tocar la ficha en dos pasos: se registra una sola vez.
    IF (NEW.creado_por IS NOT DISTINCT FROM auth.uid() AND NEW.creado_en > now() - interval '15 seconds')
       OR EXISTS (SELECT 1 FROM public.insumos_modificaciones WHERE insumo_id = NEW.id AND usuario_id IS NOT DISTINCT FROM auth.uid() AND fecha > now() - interval '15 seconds') THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.insumos_modificaciones (insumo_id, usuario_id) VALUES (NEW.id, auth.uid());
  END IF;
  RETURN NULL;
END $$;