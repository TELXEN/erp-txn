INSERT INTO public.tipos_insumo (clave, nombre, digito, orden, es_sistema, oculto)
VALUES ('EPP', 'EQUIPO DE PROTECCIÓN PERSONAL', 6, 6, true, true)
ON CONFLICT (clave) DO NOTHING;