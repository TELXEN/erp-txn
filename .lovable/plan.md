# Caja Chica: listado más limpio y rendición rápida

Solo cambios visuales y de flujo en la pantalla Caja Chica; no se toca la base de datos.

## 0. Tarjetas de resumen
- Entregado en efectivo: monto grande, debajo «N entregas · M cajas abiertas».
- Rendido con comprobantes: monto grande y barra «% rendido» del total entregado (verde ≥80%, ámbar 50–80%, rojo <50%), con número de comprobantes.
- Pendiente por rendir: monto grande destacado en ámbar si hay saldo, y un aviso «X cajas con más de 7 días sin rendir» con reloj (clic filtra la tabla a esas cajas).
- Las tres con el mismo alto, icono discreto, montos alineados a la derecha con cifras tabulares.

## 1. Tabla y limpieza
- Roboto en toda la pantalla.
- Interruptor «Agrupar por responsable»: cuando está activo, las cajas se agrupan bajo una fila plegable con el nombre del líder, la obra (o «Varias obras»), número de entregas y totales Entregado / Rendido / Saldo a la derecha. Las filas hijas ya no repiten responsable ni obra. Desactivado, el listado se ve como hoy.
- «Origen / Operación»: solo nombre del banco y operación, ej. «BBVA • Op. 232546» (sin número de cuenta). Si el número de operación es muy largo se acorta mostrando los últimos 6 dígitos, con el texto completo al pasar el cursor.

## 2. Controles y alertas
- Nueva columna «Acciones» al final con botón «+ Rendir» (solo en cajas abiertas). Abre en ventana flotante el formulario actual de comprobantes, ya vinculado a esa caja chica (responsable, obra y saldo visibles en la cabecera); permite registrar varios seguidos.
- Alerta de tiempo: icono de reloj ámbar con la etiqueta «+7 días» junto a la fecha de entrega cuando la caja está Abierta, tiene más de 7 días y no tiene ningún comprobante rendido.
- El monto «Rendido» es un enlace: abre un panel lateral derecho con la lista de comprobantes que lo sustentan (fecha, tipo costo directo / gasto general / mantenimiento / combustible, descripción, comprobante, monto a la derecha y total).

## 3. Alineación
- Textos a la izquierda; fechas, montos y porcentajes a la derecha con cifras tabulares, también en filas de grupo y el panel lateral.

## Detalles técnicos
- Archivo: src/routes/_authenticated/caja-chica.tsx. Reusar rendicionesDe/rendidoDe, VentanaFlotante y el patrón de panel lateral de gastos-directos.
- nombreBanco deja de incluir numero_cuenta en la tabla (la exportación Excel conserva el dato completo).
- Verificar con tsgo y Playwright: agrupación, alerta, «+ Rendir» y panel de Rendido.
