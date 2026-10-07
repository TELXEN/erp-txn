# Gastos directos: control por partida más claro

## Qué cambia

1. **Tipografía**: toda la vista de Gastos directos (tarjetas, tabla, detalle de compras y panel de registro) usa Roboto en lugar de la fuente monoespaciada actual. Las cifras mantienen ancho uniforme de dígitos para que las columnas cuadren.

2. **Tarjeta de saldo (arriba a la derecha)**
   - Etiqueta «SALDO» con el monto grande (ej. S/ 35,985.62), verde si es positivo y rojo entre paréntesis si es negativo.
   - Debajo, un bloque aparte «% Consumido Global» con barra de progreso y porcentaje (verde < 80 %, ámbar 80–100 %, rojo > 100 %).

3. **Filas de grupo (ej. SUMINISTRO DE TABLEROS)**
   - Se pueden plegar y desplegar con una flecha (hoy siempre están abiertas).
   - A la derecha, un resumen compacto: «Presupuesto Grupo: S/ X,XXX.XX | Consumido: S/ X,XXX.XX». Se sigue viendo cuando el grupo está plegado.
   - Se retiran los totales sueltos de las columnas para no duplicar cifras.

4. **Partidas sobreconsumidas** (costo real > presupuesto)
   - La barra de consumo se pinta en rojo.
   - El saldo se muestra en rojo y entre paréntesis, ej. (S/ 1,250.00), con la etiqueta «Sobregiro».

5. **Botón «+ Compra»**
   - Abre un panel lateral deslizante desde la derecha (en lugar de la ventana centrada).
   - Viene con el Código y la Descripción de la partida ya cargados y bloqueados, junto con unidad, presupuesto, costo real y saldo; el usuario solo llena los datos de la compra.
   - Se mantienen el registro de varias compras seguidas, el cierre con X / Esc / clic fuera y todas las validaciones actuales.

6. **Alineación**: montos y cantidades a la derecha, textos a la izquierda, en tabla principal, detalle de compras y panel.

## Detalles técnicos
- Solo se edita `src/routes/_authenticated/gastos-directos.tsx`; sin cambios en base de datos ni en reglas de costos.
- Nuevo estado `gruposCerrados: Record<string, boolean>`; la fila de grupo usa `colSpan` completo con flex `justify-between`.
- Helper `solesSaldo(v)` que formatea negativos como `(S/ x)` con `text-bad`; `BarraConsumo` ya usa rojo > 100 %, se reutiliza.
- `ModalCompra` pasa a contenedor `fixed inset-y-0 right-0 w-full max-w-xl` con animación de entrada; campos Código/Descripción `readOnly`.
- Clase `font-['Roboto']` en el contenedor raíz (Roboto ya se carga en el proyecto); reemplazar `font-mono` por `tabular-nums` en celdas numéricas.
- Verificación con Playwright: tarjeta de saldo, plegar grupos, resumen visible, partida sobreconsumida en rojo y panel con datos precargados.
