ALTER TABLE public.trabajadores
  ADD COLUMN dni text NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN cargo text NOT NULL DEFAULT 'AYUDANTE',
  ADD COLUMN numero_cuenta text NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN cci text NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN banco text NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN numero_celular text NOT NULL DEFAULT 'PENDIENTE';

ALTER TABLE public.trabajadores
  ADD CONSTRAINT trabajadores_dni_formato CHECK (dni = 'PENDIENTE' OR dni ~ '^[0-9]{8}$'),
  ADD CONSTRAINT trabajadores_cargo_valido CHECK (cargo IN ('RESIDENTE', 'SUPERVISOR', 'TÉCNICO ELECTRICISTA', 'TÉCNICO INSTRUMENTISTA', 'SOLDADOR', 'AYUDANTE', 'CONDUCTOR CAMIONETA', 'ALMACÉN', 'ADMINISTRADOR(A)')),
  ADD CONSTRAINT trabajadores_numero_cuenta_longitud CHECK (char_length(btrim(numero_cuenta)) BETWEEN 1 AND 30),
  ADD CONSTRAINT trabajadores_cci_formato CHECK (cci = 'PENDIENTE' OR cci ~ '^[0-9]{20}$'),
  ADD CONSTRAINT trabajadores_banco_longitud CHECK (char_length(btrim(banco)) BETWEEN 1 AND 80),
  ADD CONSTRAINT trabajadores_celular_formato CHECK (numero_celular = 'PENDIENTE' OR numero_celular ~ '^[0-9]{9}$'),
  ADD CONSTRAINT trabajadores_nombre_longitud CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 100),
  ADD CONSTRAINT trabajadores_jornal_positivo CHECK (jornal_diario >= 0);