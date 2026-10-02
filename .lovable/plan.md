# Codificación de Documentos en tabla WYSIWYG

## Objetivo
Reemplazar los tres formularios de **Datos › Codificación › Codificación de Documentos** por una sola tabla editable con fila de captura arriba y la vista previa como recuadro a la derecha. El código de cada documento será **CÓDIGO + correlativo** (ej. `TXN26-P` + `001` = `TXN26-P001`).

## Pantalla

```text
+------------------------------------------------------+  +----------------------+
| ÍTEM | CÓDIGO  | DÍGITOS | ÚLTIMO CORREL. | NOMBRE   |  | Vista previa         |
| [auto]| [____] |  [3]    |     [0]        | [_____] +|  |  TXN26-P004          |
|------------------------------------------------------|  |  Próximo código      |
| 1.00 | TXN26-P | 3       | 3              | PROYECTOS|  |  (texto explicativo) |
| 2.00 | TXN26-C | 3       | 12             | COTIZAC. |  |                      |
| 3.00 | TXN26-PL| 3       | 0              | PRELIQ.  |  | (vacío si no hay     |
+------------------------------------------------------+  |  fila seleccionada)  |
                                                          +----------------------+
```

- **ÍTEM**: automático, 1.00, 2.00, 3.00… según el orden.
- **CÓDIGO**: texto libre (letras, números y caracteres especiales).
- **DÍGITOS DEL CORRELATIVO**: por defecto 3 (1 a 8).
- **ÚLTIMO CORRELATIVO USADO**: editable; avanza solo cada vez que se crea un documento.
- **NOMBRE**: PROYECTOS, COTIZACIONES, PRELIQUIDACIONES ya cargados; se pueden añadir otros. Los tres de sistema no se pueden borrar ni renombrar (son los que usa el ERP para asignar códigos); los añadidos sí.
- Fila superior de captura, Enter guarda; edición en línea por fila con iconos de editar/eliminar (mismo estilo que Registro de partidas).
- Clic en una fila la selecciona y activa la vista previa a la derecha (mismo tamaño y comentario actuales).
- Solo Administrador/Gerente puede editar.

## Datos
- Nueva tabla `codificacion_documentos` (orden, codigo, digitos, correlativo_actual, nombre único, es_sistema).
- Se cargan las tres filas actuales convirtiendo la configuración existente en código libre (ej. sigla+año+separador+letra = `TXN26-P`), conservando el último correlativo de cada una para no repetir códigos.
- Las funciones que generan códigos de proyectos, cotizaciones y preliquidaciones pasan a leer de la nueva tabla: `codigo + lpad(correlativo, digitos)`, saltando códigos ya usados. La generación sigue siendo solo desde el servidor.
- Las tablas antiguas se mantienen sin uso (no se borran).

## Detalles técnicos
- Migración: CREATE TABLE + GRANT (authenticated select/insert/update/delete, service_role all) + RLS (lectura autenticados; escritura `is_admin_o_gerente`), trigger updated_at, trigger que impide borrar/renombrar filas `es_sistema`; seed desde `codificacion_config`/`_cotizacion`/`_preliquidacion`. Nueva función `siguiente_codigo_documento(_nombre text)` (security definer, FOR UPDATE, solo service_role) y reescritura de `siguiente_codigo_proyecto/cotizacion/preliquidacion` para delegar en ella con su tabla de unicidad.
- `src/components/CodificacionDocumentos.tsx` nuevo; `datos.tsx` lo renderiza en lugar de los tres componentes.
- `previsualizarCodigo*` en `codificacion.ts`, `cotizaciones.ts`, `codificacion-preliquidacion.ts` pasan a usar la nueva tabla (hook `useCodificacionDocumentos`).
- Nombres añadidos por el usuario quedan registrados con su contador; conectarlos a nuevos módulos sería un paso posterior.
- Actualizar memoria de codificación y AGENTS.md.
