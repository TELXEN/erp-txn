# Flujo de Requerimientos: Obra → Gerencia → Logística → Orden de Compra

## Flujo
```text
Responsable de obra        Gerencia            Logística
Generar Requerimiento  →  Aprobar/Rechazar  →  Requerimientos (bandeja)
(insumos del APU / TDR)                        → agrupar por proveedor
                                               → solicitar cotizaciones
                                               → cuadro comparativo
                                               → Orden de Compra
```

## 1. Operaciones › Generar Requerimiento (nuevo, después de Avance Físico)
- Selector de proyecto (el mismo recordado del Gantt).
- Dos tipos de requerimiento:
  - **Materiales / Equipos**: lista de insumos desdoblados del APU de la obra (cantidad presupuestada, ya requerida, saldo). Se marca qué y cuánto pedir; nunca más que el saldo.
  - **Subcontratos, servicios y alquileres**: se redacta con **Términos de Referencia** (objeto, alcance, entregables, plazo, lugar, condiciones, adjuntos opcionales), vinculado a la partida.
- Lo genera el responsable del proyecto (ingeniero); queda en estado **Enviado a Gerencia**.
- Lista de requerimientos propios con su estado.

## 2. Aprobación de Gerencia
- Se muestran en la pantalla de **Aprobaciones** existente (nueva sección Requerimientos).
- Gerencia aprueba o rechaza con motivo. Al aprobar pasa automáticamente a Logística.

## 3. Logística › Requerimientos (reemplaza la pantalla actual)
- Solo muestra requerimientos aprobados.
- **Agrupar por proveedor**: Logística asigna cada ítem a uno o varios proveedores.
- **Solicitar cotización**: genera una solicitud por proveedor (imprimible/PDF) con sus ítems o TDR.
- **Registrar cotizaciones** recibidas: precio, moneda, plazo, condiciones.
- **Cuadro comparativo** por ítem; Logística elige el ganador.
- **Generar Orden de Compra** por proveedor ganador, enlazada al requerimiento (estados: Atendido parcial / Atendido).

## Estados
Borrador → Enviado a Gerencia → Aprobado / Rechazado → En cotización → Atendido parcial → Atendido.

## Detalles técnicos
- Reutilizar `requerimientos`, `requerimiento_items`, `requerimiento_item_origenes` (la explosión APU ya existe en la pantalla actual y se mueve a la nueva ruta `/generar-requerimiento`).
- Nuevas columnas: `requerimientos.clase` (materiales | tdr), `aprobado_por`, `aprobado_en`, `motivo_rechazo`; tabla `requerimiento_tdr` para los términos de referencia.
- Nuevas tablas: `solicitudes_cotizacion`, `solicitud_cotizacion_items` (precio ofertado, plazo, ganador) y enlace `ordenes_compra.requerimiento_id` / `orden_compra_items.requerimiento_item_id`.
- Trigger: solo Gerencia puede pasar a Aprobado/Rechazado; ítems aprobados quedan congelados. RLS por rol (ingeniero crea, gerente aprueba, administrador gestiona compras).
- La OC generada usa el flujo existente de Órdenes de Compra (ingresos a almacén siguen sin exceder saldo).
