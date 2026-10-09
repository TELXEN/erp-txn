# Auditoría de arquitectura del ERP TELXEN: diagnóstico y plan por etapas

Esta etapa solo revisa; no se ha modificado nada. Cada hallazgo de abajo se comprobó en la base de datos o en el código. Cada etapa del plan se aprueba y se aplica por separado.

## Diagnóstico

### A. Relaciones entre módulos

| # | Hallazgo | Riesgo |
|---|---|---|
| A1 | **Casi ninguna relación entre tablas tiene índice** (unas 70): proyecto, partida, trabajador, banco, insumo, requerimiento, orden de compra y comprobante. | Cuando haya miles de tareos, gastos y comprobantes, las pantallas por obra, trabajador o banco se pondrán lentas. Además, borrar un proyecto o un banco obliga a revisar toda la tabla. |
| A2 | Dos columnas apuntan a otra tabla sin una relación declarada: el vínculo de un comprobante recibido con su registro SIRE, y el vínculo de cada línea de origen del requerimiento con la partida de la cotización. | Pueden quedar referencias huérfanas si se borra el registro de origen. |
| A3 | **La cadena Cotización → Obra → Requerimiento → Orden de compra → Gasto directo no está cerrada.** Los requerimientos y las órdenes sí están relacionados, pero el gasto directo no sabe de qué orden ni de qué requerimiento salió. | No se puede medir «requerido / comprado / pagado» por insumo y partida. Tampoco se detecta si se compra dos veces lo mismo. |
| A4 | No hay dependencias circulares entre módulos. Las únicas autorreferencias (partidas padre, comprobante de referencia en notas de crédito) son correctas. | — |

### B. Cálculos críticos

| # | Hallazgo | Riesgo |
|---|---|---|
| B1 | **Listas cortadas en silencio.** Tareos, gastos, ventas, boletas y honorarios se cargan completos al navegador, sin paginar, y el servidor entrega como máximo 1000 filas por consulta. Afecta al Dashboard, a Tesorería, al Flujo de Caja y a los pagos de RR.HH. | **El más grave.** Con más de 1000 tareos (unas 5 semanas con 30 trabajadores), el costo real de las obras, el saldo disponible y el flujo de caja saldrían más bajos de lo real, sin ningún aviso. |
| B2 | Desdoblamiento de APU: la fórmula metrado × cantidad unitaria es correcta, igual que la cuadrilla × jornada ÷ rendimiento. Pero «Herramientas manuales» (un % de la mano de obra) no aparece en el requerimiento, y el precio de referencia es el costo sin margen, mientras la cotización usa el precio con margen. | Diferencias entre el presupuesto de la cotización y lo requerido. Hay que decidir si es lo esperado. |
| B3 | El costo de mano de obra en la obra sale del tareo (jornal × factor; las horas extra en jornada de 10.5 h). La Nómina, en cambio, calcula las horas extra con sueldo ÷ 240 × 1.25, y los aportes del empleador (EsSalud) no se cargan a la obra. | El costo de personal de la obra no coincide con lo que realmente se paga en planilla. |
| B4 | Doble redondeo en el tareo: primero se redondea el factor de horas extra a 2 decimales y después se redondea el costo. | Pequeñas diferencias de centavos que se acumulan en meses y en muchos trabajadores. |
| B5 | Los importes en la base de datos se guardan sin una cantidad fija de decimales, y el redondeo se hace en cada pantalla con fórmulas propias (unas 50 repeticiones). Los cálculos en dólares usan números decimales comunes. | Diferencias de un centavo entre pantalla, PDF, Excel y SUNAT. |
| B6 | Lo que está bien: el saldo disponible se calcula como presupuesto vigente − costo real, y el % consumido como costo ÷ presupuesto. Flujo de Caja no cuenta dos veces las compras pagadas con caja chica. Los márgenes de la cotización (gastos generales y utilidad) se calculan sobre el costo directo. | — |
| B7 | El costo real de la obra no incluye traslados, mantenimiento de flota ni compras de logística que todavía no se registraron como gasto directo, aunque Tesorería sí descuenta esos pagos del banco. | Tesorería y el costo de la obra no cuadran. |

### C. Estructura

- No existen centros de costo como relación real: se guardan como un catálogo suelto y los gastos no los referencian.
- Las reglas de dinero (costo real de la obra, saldos) se calculan en el navegador y no en la base de datos.

## Plan de acción (cada etapa se aprueba por separado)

1. **Índices** en todas las relaciones listadas en A1 y declarar las dos relaciones de A2. Es un cambio sin riesgo. Se comprueba con la revisión de la base de datos.
2. **Corregir los totales cortados (B1)**:
   - Calcular en la base de datos el costo por obra y los saldos (vistas o funciones que suman directamente allí).
   - Paginar las listas largas.
   - Se comprueba comparando los totales actuales con una suma directa en la base de datos.
3. **Unificar el redondeo (B4, B5)**:
   - Una sola función de redondeo para todo el sistema.
   - Importes guardados con 2 decimales y cantidades con 4.
   - Eliminar el doble redondeo del tareo.
4. **Costo de personal real en la obra (B3)**: decidir con Gerencia si la obra se carga con el costo del tareo o con lo pagado en planilla y honorarios, incluidos los aportes del empleador.
5. **Trazabilidad de compras (A3, B7)**:
   - Relacionar el gasto directo con su orden de compra y su requerimiento.
   - Agregar el control «requerido / comprado / pagado» por partida.
   - Incluir flota y traslados en el costo de la obra.
6. **Requerimiento vs. APU (B2)**: decidir si se incluyen las herramientas manuales y qué precio se toma como referencia.
7. **Centros de costo reales (C)**, de forma opcional.

## Decisiones que necesito de Gerencia
- Etapa 4: ¿con qué costo se carga la mano de obra en la obra, el del tareo o lo realmente pagado?
- Etapa 6: ¿el requerimiento lleva costo sin margen y sin herramientas manuales?
