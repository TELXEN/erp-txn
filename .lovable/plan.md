# Consumo de materiales en obra: Consumir, Vales de Salida y control por partida

## 1. Botón «Consumir» (mejorar el que ya existe)
En **Almacén → Stock por almacén**, el botón Consumir de cada insumo de obra abre una ventana con:
- **Cantidad** (obligatoria, no puede pasar el stock del almacén).
- **Partida** (obligatoria): lista de las partidas de esa obra, agrupadas por título.
- **Frente de trabajo / observación** (obligatoria).
- Debajo, un aviso en vivo: presupuestado en el APU de la partida, consumido hasta hoy y lo que quedaría tras este consumo. Si se pasa, aviso ámbar «Sobrecosto en esta partida», pero deja guardar.

Al confirmar, baja el stock y queda una salida «Consumo» en Movimientos con la partida, sin vale impreso.

## 2. Vales de Salida (EPP y herramientas)
Nueva pestaña **Vales de Salida** en Almacén:
- Eliges almacén de obra, trabajador (por nombre o DNI, solo personal activo), uno o varios insumos con cantidad y, opcional, la partida.
- Se crea un vale con código correlativo (p. ej. VS-TXN26-P001-0001), imprimible en A4 con la plantilla de Facturación y espacio de firma del trabajador como cargo.
- Resta el stock y registra cada ítem en el historial de EPP del trabajador (Recursos Humanos → EPP), en custodia.
- Historial de vales con filtros por obra, trabajador y fecha.

## 3. Consumo frente a partidas
- Cada consumo o vale con partida suma al **material consumido real** de esa partida.
- Presupuestado = cantidad del insumo en el APU de la partida × metrado (si el insumo no está en el APU, se compara por importe de materiales de la partida).
- En **Costos Directos → Control por partida** se añade la columna «Material consumido» y se marca en ámbar la partida que lo supera.

## 4. Movimientos
La tabla inferior sigue en orden cronológico (lo más reciente arriba) y muestra la partida, el trabajador y el número de vale cuando corresponda.

## Sobre la letra Roboto
El ERP usa la fuente que eliges en Configuración para todo el sistema. Si quieres Roboto, la selecciono allí como fuente global en vez de forzarla solo en esta pantalla.

## Detalles técnicos
- Migración: `movimientos_almacen` + `partida_id` (nullable), `trabajador_id`, `vale_id`; tablas `vales_salida` y `vales_salida_items` con GRANT/RLS (encargados del almacén, admin/gerente); código vía `siguiente_codigo_documento`.
- RPC `registrar_vale_salida(...)` SECURITY DEFINER: valida stock y permiso (`es_encargado_almacen`), crea vale, salidas y filas en `epp_entregas` en una sola transacción.
- Consumo: el permiso se valida con la misma regla de encargado; trigger de salida existente mantiene stock.
- Cálculo presupuestado vs. real en `src/lib/consumo-partida.ts` con test (exceso → alerta, guardado permitido).
- Costo del consumo: no se duplica en costos reales (la compra ya cargó costo); solo alimenta el control físico por partida.
