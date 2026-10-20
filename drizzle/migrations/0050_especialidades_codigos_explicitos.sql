CREATE OR REPLACE FUNCTION public.recodificar_wbs()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso para reordenar el catálogo'; END IF;
  SET CONSTRAINTS ALL DEFERRED;
  UPDATE public.grupos_cotizacion g SET orden=s.n FROM (SELECT id,row_number() OVER (ORDER BY orden,nombre) n FROM public.grupos_cotizacion) s WHERE g.id=s.id AND g.orden<>s.n;
  -- Specialty codes are explicit identifiers, never derived from list positions.
  UPDATE public.categorias_partida c SET orden=s.n,codigo=coalesce(left(e.codigo,2),'00')||'.'||coalesce(g.orden,0)::text||'.'||lpad(s.m::text,2,'0')
  FROM (SELECT id,row_number() OVER (PARTITION BY especialidad ORDER BY orden,nombre) n,row_number() OVER (PARTITION BY especialidad,coalesce(grupo,'') ORDER BY orden,nombre) m FROM public.categorias_partida) s
  LEFT JOIN public.categorias_partida c2 ON c2.id=s.id LEFT JOIN public.especialidades_partida e ON e.nombre=c2.especialidad LEFT JOIN public.grupos_cotizacion g ON g.nombre=c2.grupo WHERE c.id=s.id;
  UPDATE public.partidas_maestras p SET orden=s.n,codigo=coalesce(ti.digito,tm.digito,2)::text||coalesce(left(e.codigo,2),'00')||coalesce(g.orden,0)::text||coalesce(right(c.codigo,2),'00')||lpad(s.n::text,3,'0')
  FROM (SELECT id,row_number() OVER (PARTITION BY especialidad,coalesce(categoria,'') ORDER BY orden,created_at) n FROM public.partidas_maestras) s JOIN public.partidas_maestras p2 ON p2.id=s.id LEFT JOIN public.tipos_insumo ti ON ti.clave=coalesce(p2.tipo_partida,'MAT') LEFT JOIN public.tipos_insumo tm ON tm.clave='MAT' LEFT JOIN public.especialidades_partida e ON e.nombre=p2.especialidad LEFT JOIN public.categorias_partida c ON c.especialidad=p2.especialidad AND c.nombre=p2.categoria LEFT JOIN public.grupos_cotizacion g ON g.nombre=c.grupo WHERE p.id=s.id;
END; $function$;
CREATE OR REPLACE FUNCTION public.guardar_especialidad(_id uuid,_codigo text,_nombre text,_descripcion text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE anterior text; destino uuid; nombre_limpio text:=upper(regexp_replace(trim(_nombre),'\s+',' ','g'));
BEGIN
 IF NOT coalesce(public.is_admin_o_gerente(auth.uid()),false) THEN RAISE EXCEPTION 'Solo Gerencia o Administración puede modificar especialidades.'; END IF;
 IF _codigo !~ '^[0-9]{2}$' OR _codigo='00' THEN RAISE EXCEPTION 'El código debe tener 2 dígitos (01–99).'; END IF;
 IF coalesce(nombre_limpio,'')='' THEN RAISE EXCEPTION 'Escribe el nombre de la especialidad.'; END IF;
 IF _id IS NULL THEN
 INSERT INTO public.especialidades_partida(codigo,codigo_modular,nombre,descripcion,orden,bloque,activo) VALUES(_codigo,_codigo,nombre_limpio,nullif(trim(_descripcion),''),_codigo::int,'construccion',true) RETURNING id INTO destino;
 ELSE
 SELECT nombre INTO anterior FROM public.especialidades_partida WHERE id=_id AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La especialidad ya no está disponible.'; END IF;
 UPDATE public.especialidades_partida SET codigo=_codigo,codigo_modular=_codigo,nombre=nombre_limpio,descripcion=nullif(trim(_descripcion),''),orden=_codigo::int WHERE id=_id;
 UPDATE public.categorias_partida SET especialidad=nombre_limpio WHERE especialidad=anterior;
 UPDATE public.partidas_maestras SET especialidad=nombre_limpio WHERE especialidad=anterior;
 UPDATE public.partidas_apu SET especialidad=nombre_limpio WHERE especialidad=anterior;
 UPDATE public.partidas SET especialidad=nombre_limpio WHERE especialidad=anterior;
 destino:=_id;
 END IF;
 RETURN destino;
END; $function$;
REVOKE ALL ON FUNCTION public.guardar_especialidad(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guardar_especialidad(uuid,text,text,text) TO authenticated,service_role;