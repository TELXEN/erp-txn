ALTER TABLE public.trabajadores
  ADD COLUMN tipo_contratacion text NOT NULL DEFAULT 'Planilla',
  ADD COLUMN regimen_laboral text NOT NULL DEFAULT 'General',
  ADD COLUMN sistema_pensiones text NOT NULL DEFAULT 'ONP',
  ADD COLUMN cuspp text NOT NULL DEFAULT '',
  ADD COLUMN fecha_ingreso date,
  ADD COLUMN sueldo_mensual numeric NOT NULL DEFAULT 0,
  ADD COLUMN asignacion_familiar boolean NOT NULL DEFAULT false,
  ADD COLUMN suspension_cuarta boolean NOT NULL DEFAULT false;
ALTER TABLE public.trabajadores
  ADD CONSTRAINT trabajadores_tipo_contratacion_chk CHECK (tipo_contratacion IN ('Planilla','Honorarios')),
  ADD CONSTRAINT trabajadores_regimen_chk CHECK (regimen_laboral IN ('General','MYPE Pequeña','MYPE Micro','Construcción Civil','Agrario')),
  ADD CONSTRAINT trabajadores_pensiones_chk CHECK (sistema_pensiones IN ('ONP','AFP Integra','AFP Prima','AFP Profuturo','AFP Habitat','Ninguno')),
  ADD CONSTRAINT trabajadores_sueldo_chk CHECK (sueldo_mensual >= 0);