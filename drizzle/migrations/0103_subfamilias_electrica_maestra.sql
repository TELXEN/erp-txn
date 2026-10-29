ALTER TABLE public.subfamilias_insumo ADD COLUMN IF NOT EXISTS descripcion text;
CREATE TEMP TABLE _sf(codigo text, nombre text, descripcion text, bloque text) ON COMMIT DROP;
INSERT INTO _sf VALUES
('01','Postes y Cimentaciones MT',NULL,'Media Tensión y Subestaciones (SSEE)'),
('02','Estructuras Metálicas y Herrajes MT','Crucetas, ménsulas, pórticos de SSEE','Media Tensión y Subestaciones (SSEE)'),
('03','Aislamiento de MT',NULL,'Media Tensión y Subestaciones (SSEE)'),
('04','Conductores Desnudos de MT','Líneas aéreas de transmisión externas','Media Tensión y Subestaciones (SSEE)'),
('05','Cables de Energía Protegidos MT','Alimentadores principales a salas eléctricas y molinos','Media Tensión y Subestaciones (SSEE)'),
('06','Equipos de Maniobra MT',NULL,'Media Tensión y Subestaciones (SSEE)'),
('07','Equipos de Protección MT',NULL,'Media Tensión y Subestaciones (SSEE)'),
('08','Subestaciones y Transformadores','De potencia, distribución y aislamiento','Media Tensión y Subestaciones (SSEE)'),
('09','Celdas de Media Tensión y Tableros de Sincronismo','AIS/GIS y transferencia automática','Media Tensión y Subestaciones (SSEE)'),
('10','Accesorios de Conectividad y Terminales MT','Kits contráctiles, empalmes, conectores codo','Media Tensión y Subestaciones (SSEE)'),
('20','Bandejas Portacables','Tipo escalerilla pesada de aluminio/fierro galvanizado','Canalizaciones, Soportes y Baja Tensión (BT)'),
('21','Tuberías Rígidas','Conduit metálicas IMC/RMC','Canalizaciones, Soportes y Baja Tensión (BT)'),
('22','Tuberías Flexibles y Conectores','Liquidtight pesado para vibración de motores','Canalizaciones, Soportes y Baja Tensión (BT)'),
('23','Cables de Fuerza BT','Alimentadores principales y distribución N2XOH/NYY','Canalizaciones, Soportes y Baja Tensión (BT)'),
('24','Cables de Control e Instrumentación','Apantallados y trenzados para lazos de planta','Canalizaciones, Soportes y Baja Tensión (BT)'),
('25','Cables de Comunicación y Redes','Fibra óptica armada para mina, Ethernet industrial','Canalizaciones, Soportes y Baja Tensión (BT)'),
('26','Canalizaciones PVC y Cajas de Pase','Tuberías SAP/SEL y cajas de fierro galvanizado','Canalizaciones, Soportes y Baja Tensión (BT)'),
('27','Accesorios de Fijación y Soportería','Perfiles Unistrut pesados, abrazaderas uña, varillas','Canalizaciones, Soportes y Baja Tensión (BT)'),
('28','Terminales y Consumibles de BT','Bornas, terminales de compresión, cintas aislantes','Canalizaciones, Soportes y Baja Tensión (BT)'),
('29','Elementos para Peinado y Conexionado de Tableros','Marcadores termocontractiles, canaletas','Canalizaciones, Soportes y Baja Tensión (BT)'),
('30','Envolventes, Tableros Vacíos y Barras','Estructuras para CCM y tableros de arranque','Control de Motores, Variadores y Protecciones'),
('31','Interruptores de Gran Potencia','Caja moldeada MCCB e interruptores abiertos ACB','Control de Motores, Variadores y Protecciones'),
('32','Interruptores Termomagnéticos Riel DIN','Y diferenciales','Control de Motores, Variadores y Protecciones'),
('33','Variadores de Frecuencia (VFD)','Para fajas transportadoras y sistemas de bombeo','Control de Motores, Variadores y Protecciones'),
('34','Arrancadores Suaves (Soft Starters)',NULL,'Control de Motores, Variadores y Protecciones'),
('35','Arrancadores Directos y Aparataje Local','Botoneras de parada de emergencia locales','Control de Motores, Variadores y Protecciones'),
('36','Sistemas de Respaldo Crítico (UPS/Baterías)','Bancos de baterías para SSEE y UPS de PLC','Control de Motores, Variadores y Protecciones'),
('37','Insumos para Mantenimiento de Tableros','Limpia contactos dieléctrico, filtros, repuestos','Control de Motores, Variadores y Protecciones'),
('40','Control, Automatización y PLC','Módulos I/O, fuentes de poder de 24VDC, HMI','Automatización, SCADA y Control de Procesos'),
('41','Instrumentación Ex e Intrínseca / Sensores','Transmisores de nivel, presión, flujo, PT100','Automatización, SCADA y Control de Procesos'),
('42','Componentes de Conectividad Industrial','Switches para riel DIN, convertidores','Automatización, SCADA y Control de Procesos'),
('43','Arquitectura SCADA y Gabinetes de Red','Servidores, licencias, gabinetes RACK climatizados','Automatización, SCADA y Control de Procesos'),
('50','Luminarias Industriales (High Bay)','Para naves de molienda y flotación','Iluminación'),
('51','Luminarias Herméticas','Contra polvo y humedad de planta','Iluminación'),
('52','Iluminación Exterior','Campamentos, accesos y vías perimetrales','Iluminación'),
('53','Iluminación de Emergencia',NULL,'Iluminación'),
('54','Control de Iluminación','Fotocélulas, sensores, temporizadores','Iluminación'),
('55','Soportes y Accesorios de Iluminación','Brazos para postes, ganchos, cajas de derivación','Iluminación'),
('60','Sistemas de Puesta a Tierra (SPAT)','Cables de cobre desnudo, varillas','Sistemas de Puesta a Tierra (SPAT) y Protección Atmosférica'),
('61','Sistemas de Protección Atmosférica (Pararrayos)','Crítico para zonas altoandinas','Sistemas de Puesta a Tierra (SPAT) y Protección Atmosférica'),
('62','Conectores y Soldadura Exotérmica','Moldes de grafito, cartuchos de pólvora','Sistemas de Puesta a Tierra (SPAT) y Protección Atmosférica'),
('63','Aditivos y Mejoradores de Terreno','Cemento conductivo, bentonita sódica','Sistemas de Puesta a Tierra (SPAT) y Protección Atmosférica'),
('64','Cajas de Registro de Tierra','Concreto, PVC de alta resistencia, barras de prueba','Sistemas de Puesta a Tierra (SPAT) y Protección Atmosférica'),
('70','Paneles Solares y Estructuras Fotovoltaicas','Módulos solares y soportes de aluminio','Energías Renovables'),
('71','Inversores y Controladores Solares','Inversores On-Grid / Off-Grid, controladores MPPT','Energías Renovables'),
('72','Sistemas de Bombeo e Insumos Hidráulicos-Eléctricos','Electrobambas y cables planos para sumergibles','Energías Renovables'),
('80','Canalizaciones y Condulets Antiexplosión Ex','Uniones de 3 piezas, cajas serie GUA/EAB','Áreas Clasificadas y Antiexplosión'),
('81','Sellos Cortafuegos y Resinas de Sellado','Sellos EYS/EZS, compuesto Chico A','Áreas Clasificadas y Antiexplosión'),
('82','Envolventes y Gabinetes NEMA 7 / NEMA 9','Cajas Ex d para frentes de refinería','Áreas Clasificadas y Antiexplosión'),
('83','Dispositivos de Maniobra y Pilotos Ex','Pulsadores, bocinas Ex, estaciones locales','Áreas Clasificadas y Antiexplosión'),
('84','Tomacorrientes y Enchufes de Seguridad Interconectados','Tomas industriales Ex','Áreas Clasificadas y Antiexplosión'),
('85','Prensaestopas y Glándulas de Cable Ex','Doble compresión con barrera de resina','Áreas Clasificadas y Antiexplosión'),
('86','Iluminación para Áreas Clasificadas Ex','Luminarias a prueba de explosión y proyectores LED Ex','Áreas Clasificadas y Antiexplosión'),
('90','Identificación y Etiquetado','Cintillos de acero inoxidable, rotulación acrílica Lamicoid','Materiales de Montaje Misceláneos'),
('91','Soldadura y Fijación Estructural','Electrodos 7018/6011, discos de corte, pernos, epóxicos','Materiales de Montaje Misceláneos');
UPDATE public.subfamilias_insumo s SET codigo=lpad((s.codigo::int+20)::text,2,'0') FROM public.especialidades_partida e WHERE e.id=s.especialidad_id AND e.codigo_modular='05' AND e.activo AND s.codigo BETWEEN '40' AND '41';
UPDATE public.subfamilias_insumo s SET codigo=lpad((s.codigo::int+20)::text,2,'0') FROM public.especialidades_partida e WHERE e.id=s.especialidad_id AND e.codigo_modular='05' AND e.activo AND s.codigo BETWEEN '30' AND '34';
UPDATE public.subfamilias_insumo s SET codigo=lpad((s.codigo::int+10)::text,2,'0') FROM public.especialidades_partida e WHERE e.id=s.especialidad_id AND e.codigo_modular='05' AND e.activo AND s.codigo BETWEEN '20' AND '26';
UPDATE public.subfamilias_insumo s SET codigo=lpad((s.codigo::int+10)::text,2,'0') FROM public.especialidades_partida e WHERE e.id=s.especialidad_id AND e.codigo_modular='05' AND e.activo AND s.codigo BETWEEN '10' AND '15';
UPDATE public.subfamilias_insumo s SET descripcion=f.descripcion, bloque=f.bloque
 FROM _sf f, public.especialidades_partida e
 WHERE e.id=s.especialidad_id AND e.codigo_modular='05' AND e.activo AND lower(s.nombre)=lower(f.nombre);
INSERT INTO public.subfamilias_insumo(especialidad_id,codigo,nombre,descripcion,bloque,activo)
 SELECT e.id,f.codigo,f.nombre,f.descripcion,f.bloque,true FROM _sf f
 CROSS JOIN (SELECT id FROM public.especialidades_partida WHERE codigo_modular='05' AND activo LIMIT 1) e
 WHERE NOT EXISTS (SELECT 1 FROM public.subfamilias_insumo s WHERE s.especialidad_id=e.id AND lower(s.nombre)=lower(f.nombre));