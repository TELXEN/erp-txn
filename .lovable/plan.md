# Auditoría de arquitectura del ERP TELXEN (análisis primero, cambios por etapas)

Este plan no cambia nada masivamente. Primero entrega el informe completo; cada corrección se aprueba por separado.

## Etapa 0 — Informe de diagnóstico (entregable)
Un documento descargable (PDF + Markdown) con tres secciones:
1. **Relaciones entre áreas**: mapa Comercial → Operaciones → Logística → RRHH → Finanzas, con cada vínculo marcado como sólido, débil (texto libre en vez de referencia) o faltante; campos clave sin índice; dependencias circulares.
2. **Cálculos críticos**, con ejemplos numéricos reales de la base:
   - Desdoblamiento APU → Requerimiento (metrado × cantidad del insumo, cuadrilla/rendimiento, herramientas manuales automáticas, margen).
   - Margen comercial, presupuesto consumido y saldo por partida/obra.
   - Flujo del dinero: boletas/recibos repartidos por tareo, compras, caja chica y tesorería hacia centros de costo.
3. **Riesgos de redondeo y recomendaciones**, priorizados (alto/medio/bajo).

## Hallazgos preliminares a confirmar en la Etapa 0
- Listados que pueden cortarse en silencio a 1 000 registros.
- Relaciones sin índice y al menos dos vínculos sin referencia formal.
- Trazabilidad incompleta Requerimiento → Orden de compra → Gasto directo → Pago.
- Redondeos aplicados en distintos momentos (por línea vs. por total) en APU, cotización y facturación.
- Ya corregido: costo de personal en el Dashboard (boletas/recibos repartidos por tareo).

## Etapas de corrección propuestas (cada una se aprueba aparte)
1. Lectura completa de datos (sin límite de 1 000).
2. Índices y referencias faltantes (sin borrar datos).
3. Trazabilidad de compras de punta a punta.
4. Regla única de redondeo (2 decimales en importes, 4 en cantidades/precios unitarios).
5. Pruebas automáticas de cálculos (APU, márgenes, reparto de personal).
6. Costo real de obra unificado para todos los paneles.

## Decisiones pendientes de Gerencia
- ¿Los requerimientos deben valorizarse a costo (sin margen) y excluir herramientas manuales?
- ¿El costo de mano de obra en obra se mide solo por boletas/recibos (criterio actual) o también se estima con tareo cuando aún no hay boleta?

## Detalles técnicos
- Etapa 0 es solo lectura: revisión del esquema (FK, índices, políticas), triggers y funciones SQL, y de `src/lib/apu.ts`, `cotizaciones.ts`, `pagos-rrhh.ts`, `requerimientos.tsx`, `dashboard.tsx`, `tesoreria.tsx`, `flujo-caja.tsx`.
- Validación cruzada de fórmulas contra datos reales con consultas de lectura.
- Informe guardado en Archivos como `auditoria-erp-telxen.pdf` y `.md`.
