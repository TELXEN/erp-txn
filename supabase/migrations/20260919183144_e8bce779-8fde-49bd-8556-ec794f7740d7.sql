ALTER TABLE public.ventas
ADD COLUMN cliente_id uuid REFERENCES public.terceros(id) ON DELETE RESTRICT;

CREATE INDEX ventas_cliente_id_idx ON public.ventas(cliente_id);