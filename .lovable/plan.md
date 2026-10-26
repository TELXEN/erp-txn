# Flujo de Requerimientos: Obra → Gerencia → Logística → Compra → Recepción en obra

## Flujo
```text
Responsable de obra       Gerencia           Logística                         Obra
Generar Requerimiento → Aprobar/Rechazar → Bandeja de Requerimientos      →  Recepción en obra
(insumos APU / TDR)                        → agrupar por proveedor
                                           → solicitar cotizaciones
                                           → aprobar cotización ganadora
                                           → Orden de Compra (automática)
                                           → envío a obra
```

## 1. Operaciones › Generar Requerimiento (nuevo, después de Avance Físico)
- Selector de proyecto (el mismo recordado del Gantt).
- Dos clases de requerimiento:
  - **Materiales / Equipos**: insumos desdoblados del APU de la obra (presupuestado, ya requerido, saldo). Nunca más que el saldo.
  - **Subcontratos, servicios y alquileres**: con **Términos de Referencia** (objeto, alcance, entregables, plazo, lugar, condiciones, adjuntos), vinculados a la partida.
- Lo genera el responsable del proyecto; queda **Enviado a Gerencia**.

## 2. Aprobación de Gerencia
- Nueva sección Requerimientos en la pantalla **Aprobaciones**.
- Aprueba o rechaza con motivo. Al aprobar pasa automáticamente a la Bandeja de Requerimientos.

## 3. Logística › Bandeja de Requerimientos (renombra "Requerimientos")
- Solo requerimientos aprobados.
- Asignar ítems a uno o varios proveedores.
- **Solicitar cotización** por proveedor (imprimible/PDF) con sus ítems o TDR.
- Registrar cotizaciones recibidas (precio, moneda, plazo, condiciones) y ver **cuadro comparativo**.
- **Aprobar cotización** ganadora: se crea automáticamente la **Orden de Compra** en Órdenes de Compra, enlazada al requerimiento.

## 4. Envío y recepción en obra
- La OC indica obra destino; Logística marca **Enviado a obra** (guía de remisión opcional).
- El responsable de obra registra la **Recepción**: cantidades recibidas por ítem, fecha, observaciones. Admite recepción parcial.
- La recepción ingresa al almacén de la obra (stock del proyecto) y actualiza el estado del requerimiento.

## Estados
Borrador → Enviado a Gerencia → Aprobado / Rechazado → En cotización → Orden emitida → Enviado a obra → Recibido parcial → Recibido.

## Detalles técnicos
- Reutilizar `requerimientos`, `requerimiento_items`, `requerimiento_item_origenes`; la explosión APU actual pasa a la ruta `/generar-requerimiento`; `/requerimientos` queda como Bandeja.
- Nuevas columnas: `requerimientos.clase` (materiales | tdr), `aprobado_por`, `aprobado_en`, `motivo_rechazo`; tabla `requerimiento_tdr`.
- Nuevas tablas: `solicitudes_cotizacion`, `solicitud_cotizacion_items` (precio ofertado, plazo, ganador), `recepciones_obra` + `recepcion_obra_items`; enlaces `ordenes_compra.requerimiento_id`, `orden_compra_items.requerimiento_item_id`.
- Recepción crea movimientos de Ingreso en `movimientos_almacen` con el proyecto destino, sin exceder lo ordenado.
- Triggers: solo Gerencia aprueba/rechaza; ítems aprobados congelados. RLS por rol (ingeniero crea y recepciona, gerente aprueba, administrador gestiona compras).
