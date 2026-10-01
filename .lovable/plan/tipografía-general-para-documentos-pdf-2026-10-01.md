# Tipografía general para documentos PDF

## Resultado
- Añadir en **Configuración del Sistema** una nueva pestaña **Tipografía de documentos** junto a **Tema de colores**.
- Ofrecer una lista cerrada y segura de fuentes: **Calibri (Carlito)**, **Arial**, **Times New Roman** y **Source Sans 3**.
- Mantener **Calibri (Carlito)** como valor inicial para conservar la apariencia actual.
- Mostrar una vista previa con texto normal, títulos, cifras y una tabla antes de guardar.
- Permitir que solo el **Gerente** cambie la fuente; los demás usuarios autorizados podrán verla.

## Aplicación
La fuente elegida se aplicará tanto a la vista previa como al archivo descargado en:
- Cotizaciones comerciales.
- Preliquidaciones.
- Facturas, boletas, notas y guías de remisión.
- Fichas y dossier de Análisis de Precios Unitarios.
- Dashboard financiero y dashboard de proyectos.
- Boletas de pago de Nómina.

No se cambiarán colores, tamaños, márgenes, encabezados, tablas ni cálculos de los documentos.

## Detalles técnicos
- Guardar una clave controlada de tipografía en la configuración de empresa, con permisos de lectura para usuarios autenticados y edición exclusiva del Gerente.
- Crear un catálogo único que traduzca cada opción a la fuente correspondiente en los tres sistemas de exportación existentes: documentos PDF nativos, capturas A4 desde pantalla y reportes tabulares.
- Empaquetar localmente los pesos regular y negrita necesarios; no depender de fuentes instaladas en la computadora ni de descargas externas.
- Sustituir las fuentes fijas actuales —Calibri/Carlito, Helvetica y Arial— por la elección global.
- Aplicar la misma elección a las vistas A4 para que lo mostrado coincida con el PDF descargado.
- Mantener compatibilidad con tildes, ñ, símbolos monetarios y caracteres usados en documentos peruanos.

## Verificación
- Cambiar cada opción, guardar y confirmar que persista al volver a entrar.
- Generar una muestra de cada familia de documento y revisar visualmente todas sus páginas.
- Comprobar que no haya texto cortado, tablas desbordadas ni cambios de página incorrectos, especialmente en cotizaciones y dossiers APU.
- Confirmar que los documentos históricos adoptan la fuente global al volver a generarse, sin modificar sus datos.
- Validar permisos, vista previa, descarga y ausencia de errores.
