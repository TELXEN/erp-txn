INSERT INTO public.unidades_medida (simbolo, descripcion, orden)
SELECT v.s, v.d, 900 + v.o FROM (VALUES ('und-mes','Unidad por mes',1),('año','Año',2)) v(s,d,o)
WHERE NOT EXISTS (SELECT 1 FROM public.unidades_medida u WHERE lower(u.simbolo)=lower(v.s));