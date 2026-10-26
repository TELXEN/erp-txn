# Donas dinámicas y porcentajes con dos decimales

## 1. Dona que crece con la cifra del centro
En «Composición del costo real» y «Gastos generales por categoría» (Dashboard Financiero), el tamaño de la dona se calcula según la cantidad de caracteres del total mostrado al centro:
- Hasta 5 cifras (S/ 99,999.99): tamaño actual (112 px).
- 6 cifras (S/ 100,000.00+): ~124 px.
- 7 cifras (S/ 1,000,000.00+): ~136 px.
- 8 cifras (S/ 10,000,000.00 a S/ 99,999,999.99): ~150 px.
El anillo crece en proporción, y el texto central reduce levemente su tamaño si hace falta, para nunca tocar el anillo. La leyenda al lado usa el espacio restante y las gráficas de la fila siguen alineadas.

## 2. Porcentajes con dos decimales
Todos los porcentajes del ERP que usan el formato común pasan de un decimal a dos: 25.20 %, 36.54 % (leyendas de donas, % usado, indicadores, tarjetas).

## Detalles técnicos
- `src/components/dashboard/piezas.tsx` → `DonaLeyenda`: tamaño = f(longitud de `soles(total)`), radios interno/externo derivados del tamaño, fuente central escalada.
- `src/lib/format.ts` → `pct` usa `toFixed(2)`.
- Verificar en 1377×842 que la página siga sin barra de desplazamiento.
