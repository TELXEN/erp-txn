# Mejoras en Tesorería

Mismos datos y la misma forma de registrar cobros y pagos. No cambia nada en la base de datos. Todo aplica a las dos pestañas: Cuentas por cobrar y Cuentas por pagar.

## 1. Saldos bancarios
- Una cuenta con saldo negativo tendrá un fondo rojo suave y un icono de advertencia junto al monto.
- El número de cuenta siempre aparecerá como «N° 123…», o «N° —» si no hay número.
- Arriba a la derecha habrá dos etiquetas separadas: «Total PEN: S/ …» y «Total USD: US$ …».

## 2. Tarjetas de resumen
- Las tarjetas Vencido, Vence en 7 días y Vence en 30 días se verán en gris claro cuando su valor sea S/ 0.00.
- Si la tarjeta tiene monto, al pulsarla la tabla muestra solo esos documentos. La tarjeta elegida queda resaltada con el color del menú.
- Al pulsarla otra vez, o al pulsar «Total», se vuelve a ver todo.
- Al cambiar de pestaña, el filtro se borra.

## 3. Tabla
- El Cliente o Proveedor y el Documento (por ejemplo F001-…) se mostrarán en negrita.
- La columna «Equiv. S/» mostrará «—» cuando el documento ya está en soles. Solo mostrará el monto convertido cuando el documento esté en dólares.
- A la izquierda habrá casillas para marcar documentos, una en cada fila y otra en la cabecera para marcar todo lo visible. En cada grupo de obra también habrá una casilla para marcar todos sus documentos.
- **Registrar cobros/pagos en lote:** aparece arriba cuando marcas al menos un documento y muestra cuántos marcaste y el total en S/. Abre una ventana donde eliges una sola cuenta bancaria, la fecha y el N° de operación, y esos datos se aplican a todos los documentos marcados. Si algún documento falla, la ventana avisa cuál fue y los demás quedan registrados.

## 4. Barra sobre la tabla y Exportar
- Encima de la tabla habrá una barra con:
  - un buscador amplio;
  - un filtro de rango de fechas de vencimiento (Desde–Hasta);
  - un selector de Cliente o Proveedor, con los nombres que hay en la lista;
  - el botón de lote.
- «Exportar a Excel» pasa a ser un botón con fondo sólido del color del menú.

## Detalles técnicos
- Solo cambia `src/routes/_authenticated/tesoreria.tsx`.
- El nuevo estado incluye `filtroVence` ('vencido' | 'semana' | 'mes' | null), `desde`/`hasta`, `tercero` y `seleccion: Set<string>` (clave tabla+id).
- La selección se limpia al cambiar de pestaña o de filtro.
- El lote reutiliza la lógica de `confirmar()`, extraída a la función `registrarUno(p, banco, fecha, op)`. Los documentos se procesan uno tras otro, incluidos los pagos de RRHH mediante `pagarRRHH`.
- El fondo de alerta usa `bg-bad/10`. Las tarjetas atenuadas usan `opacity-60` y `text-muted-foreground`.
