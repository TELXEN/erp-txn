# Limpieza de datos de prueba para iniciar con datos reales

## Qué se conserva
- Usuarios, perfiles y roles.
- Datos de la empresa: configuración, documentos/fuentes, series de comprobantes, codificación, integraciones (clave Decolecta, SIRE), parámetros laborales, tipo de cambio y comisiones AFP guardadas.
- Catálogos maestros: insumos, tipos de insumo, márgenes, partidas maestras, unidades, marcas, categorías (partidas, gasto, financieras, rubros), especialidades, grupos, cargos, centros de costo, estados, prioridades, tipos de presupuesto, bancos, plantillas de cotización.
- SUNAT: facturas electrónicas emitidas (con sus ítems/cuotas y su venta reflejada en Tesorería) y comprobantes recibidos del SIRE (con archivos).
- Los clientes/proveedores que aparecen en esas facturas SUNAT conservadas (si se borraran, las facturas quedarían sin cliente).

## Qué se borra
Proyectos, partidas y cronograma/avance, cotizaciones, preliquidaciones, requerimientos, órdenes de compra, importaciones, costos directos, gastos generales, caja chica, metas de flujo, ventas no ligadas a facturas SUNAT, pagos, almacén, trabajadores, EMO, tareos, planillas, boletas, beneficios, recibos por honorarios, vehículos, mantenimientos, traslados, tareo vehicular y el resto de clientes/proveedores.

## Correlativos
Reinicio de los contadores de proyectos, cotizaciones, preliquidaciones e insumos-documentos para que el primer registro real sea 001 (TXN26-P001, TXN26-C001). Las series de facturas NO se reinician (SUNAT exige continuidad).

## Pasos
1. Contar filas por tabla y mostrar el inventario antes de borrar.
2. Borrar en orden hijo → padre, desactivando temporalmente solo los triggers de protección (proteger_partida, validar_costo_proyecto, etc.) durante la operación y reactivándolos al final.
3. Reiniciar correlativos en codificacion_documentos / codificacion_*.
4. Verificar conteos finales y revisar que Dashboard, Proyectos, Tesorería y Facturación abran sin errores.

## Detalles técnicos
- Operaciones de datos con run_sql (sin migraciones); antes de borrar, desvincular campos opcionales de facturas conservadas que apunten a proyectos (proyecto_id → null).
- Archivos de almacenamiento de compras SIRE se conservan; adjuntos de gastos borrados quedan huérfanos y se eliminan.
- Acción irreversible: no hay respaldo automático de filas borradas.
