# Guía de remisión: origen Cliente/Libre, partidas del proyecto y catálogo de transportistas

## Qué verá el usuario

1. **Al pulsar «Nueva guía de remisión»** se abre primero una ventana «Crear guía» con dos opciones:
   - **Libre**: abre la guía vacía, como hoy (destinatario y detalle escritos a mano).
   - **Cliente**: pide elegir el cliente y luego uno de sus proyectos. La guía queda vinculada a ese proyecto.
2. **Detalle de la guía con proyecto**: un botón «Cargar partidas del proyecto» abre una lista con casillas de las partidas de esa obra (código WBS, descripción, unidad, metrado). Las marcadas se agregan como líneas de la guía (descripción y unidad); la cantidad se puede editar. También se pueden seguir escribiendo líneas a mano.
3. **Nuevo catálogo «Transportistas»** (menú Logística, junto a Proveedores), con lista, lupa de filtros y barra de iconos como las demás pantallas. Cada transportista guarda:
   - Empresa: RUC, Razón social, Dirección, Teléfono, Correo
   - N° de registro MTC
   - Certificado de habilitación vehicular (N° y fecha de vencimiento)
   - Entidad emisora de la autorización (MTC, SUTRAN, municipalidad, otra) y N° de autorización especial
   - Vehículos: placa principal, placa secundaria (carreta/semirremolque), marca, N° TUCE/tarjeta de circulación
   - Conductores (uno o varios): nombres, apellidos, tipo y N° de documento (DNI/CE), N° de licencia, categoría de licencia, vencimiento de licencia, celular
   - Estado activo/inactivo
   El RUC se valida con 11 dígitos y no se repite; se avisa cuando la licencia o el certificado están vencidos.
4. **En la guía**, el bloque «Transportista» tiene un selector del catálogo: al elegirlo se llenan RUC, razón social, MTC, certificado y entidad; luego se elige vehículo y conductor de ese transportista y se llenan placa, DNI y licencia. Los datos quedan copiados en la guía (si después cambias el catálogo, las guías emitidas no cambian). Se puede registrar un transportista nuevo desde la misma guía sin salir.
5. **Modalidad del traslado** (según SUNAT):
   - **Transporte público**: la guía usa un transportista del catálogo (empresa con RUC, registro MTC y autorización). Es obligatorio elegir transportista; el conductor y la placa son opcionales, como pide SUNAT para esta modalidad.
   - **Transporte privado** (vehículo propio): el selector ofrece los vehículos y conductores de la flota TELXEN; placa, DNI y licencia del conductor son obligatorios.
   Al cambiar la modalidad, el bloque muestra solo los datos que corresponden.
6. La hoja impresa/PDF de la guía muestra los nuevos datos (MTC, certificado, entidad, conductor con DNI y licencia).

## Preguntas abiertas
- ¿«Cliente» debe permitir guía sin proyecto (solo cliente)? Por defecto: proyecto obligatorio.
- ¿Las cantidades de partidas cargadas toman el metrado completo o empiezan en 0? Por defecto: metrado completo, editable.

## Detalles técnicos
- Migración: tablas `transportistas`, `transportista_vehiculos`, `transportista_conductores` (GRANT a authenticated/service_role, RLS para personal vía `es_personal`), índice único por RUC.
- Nuevos campos en `datos_guia` (jsonb, sin cambio de esquema): `guia_origen`, `guia_transportista_id`, `guia_mtc`, `guia_certificado`, `guia_entidad_autorizacion`, `guia_autorizacion`, `guia_placa_secundaria`, `guia_conductor_nombre`, `guia_conductor_doc_tipo`, `guia_conductor_doc`, `guia_licencia_categoria`.
- `facturacion-electronica.tsx`: ventana de origen para tipo "09" reutilizando el patrón de «Crear factura»; origen y proyecto en estado del editor, no en la URL.
- `HojaComprobante.tsx`: selector de transportista/vehículo/conductor y botón de partidas (lee `partidas` por `proyecto_id`, solo hojas, sin filas de agrupación).
- Nueva ruta `/_authenticated/transportistas` con `head()` propio; entrada en el menú lateral.
- XML UBL de la guía (`facturacion.functions.ts`) agrega MTC, autorización especial y conductor cuando existan.
- Registrar la regla en AGENTS.md y la preferencia en memoria.
