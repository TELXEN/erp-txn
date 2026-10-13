# Formato automático de textos en todo el ERP

## Qué verá el usuario
- Al salir de un campo (o al guardar), el texto se corrige solo: deja de quedar todo en mayúsculas y se respetan las siglas técnicas.
- Si el Bloq Mayús está activado mientras escribe, aparece un aviso discreto junto al campo.
- Los registros ya guardados se corrigen una sola vez con las mismas reglas.

## Reglas por tipo de campo
- **Insumos y materiales** (nombre, descripción): formato de oración + siglas protegidas. "CABLE ULTRA FLEXIBLE DE COBRE 12 AWG" → "Cable ultra flexible de cobre 12 AWG".
- **Marcas, razón social, clientes, proveedores**: mayúscula inicial en cada palabra ("Indeco", "Telxen Sac" → se protege SAC/SRL/EIRL).
- **Partidas y APU** (Banco APU, partidas de proyecto y descripciones dentro de la cotización, especificaciones técnicas): formato de oración.
- **Especialidades, grupos y categorías**: mayúscula en palabras principales, sin las preposiciones ("Instalaciones Eléctricas y Mecánicas").
- **Cargos y perfiles de personal**: todo en minúsculas salvo la primera letra ("Ingeniero residente de obra").
- **Unidades de medida**: se eligen de la lista; al escribir una nueva se normaliza al símbolo correcto del SI (kW, MPa, m², m³, kg, h, min, mes…) y se rechazan formatos no válidos.
- **No se tocan**: códigos, RUC/DNI, cuentas, correos, montos, nombres de personas.

## Siglas protegidas
PVC, HVAC, LED, IP65, ASTM, ISO, HA-25, AC, DC, BIM, CAD, ERP, API, AWG, THW, NTP, SAC, SRL, EIRL, IGV, SUNAT, más números con letras (IP65, 12AWG, 3x10mm²) y números romanos.

## Corrección de datos existentes
Una pasada única sobre insumos, materiales, mano de obra, equipos, subcontratos, Banco APU, partidas, partidas de cotizaciones y plantillas, especialidades, grupos, categorías, cargos, marcas, clientes/proveedores y unidades. Antes se guarda copia de los textos originales para poder revertir.

## Detalles técnicos
- `src/lib/formato-texto.ts`: `formatearTexto(texto, modo)` con modos `oracion | titulo | cargo | unidad`, diccionario de siglas y preposiciones; pruebas unitarias con los ejemplos del documento.
- `src/hooks/useCampoFormateado.ts` (hook `useEngineeringForm`-style): devuelve `onBlur` que aplica el formato y `onKeyUp` que detecta `getModifierState("CapsLock")` para el aviso.
- Componente `InputFormateado` en `ui-kit.tsx` (Input/Textarea con `modo`) y uso en BancoApu, Insumos, PartidasMaestras, partidas, CotizacionHoja/PanelApuCotizacion, Especialidades/Grupos/Categorías, UnidadesMedida, personal (cargo), datos.tsx (marcas, cargos), TercerosPanel/clientes/proveedores.
- Antes de cada insert/update se vuelve a aplicar el formato (cubre pegado y Enter sin blur).
- Corrección masiva: tabla `respaldo_textos` (tabla, id, columna, valor) con GRANT/RLS solo admin; script que lee en bloques, aplica la misma función TS y actualiza vía consultas de datos; nombres en especialidades se propagan a `partidas.especialidad`.
- Verificación: pruebas del formateador, typecheck, y Playwright creando un insumo, una partida y un cargo en mayúsculas.
