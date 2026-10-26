# EPP conectado con Logística (Insumos, Requerimientos y Almacén)

## Qué cambia para el usuario

1. **Banco de Datos de EPP lee el maestro de Insumos**
   - Se crea en Insumos (Materiales) la subfamilia «EPP y Seguridad Industrial». Todo insumo de esa subfamilia aparece automáticamente en el Banco de Datos de EPP.
   - El código, nombre, unidad y precio vienen de Insumos y no se editan aquí.
   - RRHH solo configura sus propios datos: tallas, criticidad, vida útil (en meses) y frecuencia de renovación obligatoria (en meses).
   - Una columna «Stock en almacén» muestra el saldo actual por obra y en total, en modo lectura. Se actualiza en vivo cuando Almacén registra un movimiento.
   - Se retira el stock manual que tiene hoy la pantalla.

2. **«Solicitar Despacho» en Asignación y Entrega**
   - Al registrar una asignación eliges el trabajador, el EPP, la talla, la cantidad, el motivo y la **obra** desde donde se despacha. La obra es obligatoria porque cada requerimiento y cada saldo de almacén pertenece a una obra.
   - El sistema revisa el stock de esa obra:
     - si alcanza, avisa «Stock disponible»;
     - si no alcanza, avisa «Sin stock suficiente: se inicia el trámite» y sigue adelante.
   - En los dos casos crea solo un requerimiento en Logística → Requerimientos con:
     - origen «Requerimiento Interno - EPP»;
     - estado «Pendiente de Despacho»;
     - el código del artículo y la cantidad;
     - el trabajador para quien se pide;
     - el nombre del usuario de RRHH que autoriza.
   - La asignación queda en estado «Solicitado» y enlazada a ese requerimiento.

3. **Cierre del ciclo desde Almacén**
   - En Almacén, al registrar una salida aparece la opción de atender un requerimiento EPP pendiente. Al elegirlo se precargan el artículo, la cantidad y la obra, y se pide el N° de documento de salida.
   - Al guardar la salida, el sistema hace tres cosas a la vez:
     - descuenta el stock;
     - marca el requerimiento como «Atendido»;
     - pasa la entrega a «Entregado - Pendiente de Firma», con la fecha exacta del despacho y el N° de documento de salida. La fecha de renovación se calcula desde ese momento.
   - El Historial por Empleado muestra esos datos. Allí RRHH puede marcar «Firmado» cuando tenga la constancia física.

4. **Estados de una entrega**

```text
Solicitado -> Entregado - Pendiente de Firma -> Firmado -> (Devuelto)
     |
     +-> Anulado (si Logística anula el requerimiento)
```

Los avisos Vigente, Por renovar y Vencido se siguen mostrando para las entregas ya despachadas.

## Tipografía
El ERP ya tiene una fuente única que eliges en Configuración → Tipografía, y se aplica a todo el sistema, PDF y Excel. Para no romper esa regla, las pantallas de EPP la heredan. Si quieres Roboto en todo el ERP, se puede elegir allí.

## Detalles técnicos
- La subfamilia nueva (código 50) se crea en `subfamilias_insumo`, dentro de Materiales.
- En `epp_catalogo` se agregan:
  - `insumo_id` (único, referencia a `insumos`);
  - `vida_util_meses` y `frecuencia_renovacion_meses`.
- `stock` y `costo_unitario` quedan marcados como deprecados. La lista combina los insumos de la subfamilia con su fila de atributos de RRHH, que se crea al guardar por primera vez.
- En `epp_entregas` se agregan:
  - `estado` (con default);
  - `proyecto_id`, `requerimiento_id`, `movimiento_id`;
  - `documento_salida`, `fecha_despacho`;
  - `autorizado_por` (nombre) y `fecha_firma`.
- En `requerimientos` se agregan `tipo` (default '') y `trabajador_id`. El origen EPP usa `origen = 'epp'`.
- La RPC `solicitar_despacho_epp` (security definer, solo admin/gerente) hace en una sola operación atómica:
  - valida el stock;
  - reserva el código con `siguiente_codigo_documento`;
  - inserta el requerimiento y su ítem;
  - inserta la entrega.
- Un trigger AFTER INSERT sobre `movimientos_almacen` cierra el ciclo dentro de la misma transacción. Se dispara cuando la salida trae `requerimiento_id`, que es una columna nueva. Funciona como el «evento» que pide el documento, sin webhooks externos.
- El stock se calcula con el helper que ya existe en `src/lib/logistica.ts`, para que sea la misma cifra que en Inventario. Realtime se activa en `movimientos_almacen` para refrescar en vivo.
- Requerimientos muestra el tipo «Requerimiento Interno - EPP» y el trabajador.
- Se agregan tests para el cálculo de estado y renovación en `src/lib/epp.ts`.
