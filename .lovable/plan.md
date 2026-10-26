# Donas dinámicas y porcentajes con dos decimales

## 1. Dona que crece con la cifra del centro
En «Composición del costo real» y «Gastos generales por categoría» (Dashboard Financiero), el tamaño de la dona se calcula según la cantidad de caracteres del total mostrado al centro:
- Hasta S/ 99,999.99: tamaño actual (112 px).
- Seis cifras (S/ 100,000.00+): dona más grande (~128 px), anillo proporcional.
- Siete o más cifras: ~144 px.
El texto central además reduce levemente su tamaño si aún no cabe, para nunca tocar el anillo. La leyenda al lado se ajusta al espacio restante y la fila mantiene las gráficas alineadas.

## 2. Porcentajes con dos decimales
Todos los porcentajes del ERP que usan el formato común pasan de un decimal a dos: 25.20 %, 36.54 % (leyendas de donas, % usado, indicadores, tarjetas).

## Detalles técnicos
- `src/components/dashboard/piezas.tsx` → `DonaLeyenda`: tamaño = f(longitud de `soles(total)`), radios interno/externo derivados del tamaño, fuente central escalada.
- `src/lib/format.ts` → `pct` usa `toFixed(2)`.
- Verificar en 1377×842 que la página siga sin barra de desplazamiento.
