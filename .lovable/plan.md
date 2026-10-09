# Rediseño visual del Dashboard de Proyectos

Solo cambia la presentación del tablero de proyectos. Los cálculos, filtros, exportaciones y permisos siguen igual.

## 1. Fondo, colores y tipografía
- El área de trabajo del tablero usa un gris muy claro (#F8FAFC) y las tarjetas van en blanco con borde suave y una sombra ligera. Se mantiene el modo claro actual del ERP y el azul del menú queda solo como acento.
- Todo el tablero usa Roboto con tres pesos claros: títulos en negrita, rótulos en peso medio y datos en regular. Las cifras importantes van en negrita, con números de ancho fijo para que queden alineados.
- Se quitan los fondos oscuros o grises intensos que compiten con las cifras.

## 2. Tarjetas KPI superiores (una fila de tarjetas independientes)
- **Proyectos activos / en espera / finalizados / retrasados**: cada estado en su propia tarjeta, con un punto de color y su cantidad. Al hacer clic se filtra la cartera, igual que ahora.
- **Presupuesto vigente**: muestra el monto total y debajo, en pequeño, el contractual y los adicionales.
- **Costo ejecutado**: muestra el monto y una barra de consumo con el porcentaje en su propia etiqueta, separado del saldo.
- **Saldo disponible**: va en una tarjeta aparte, en verde si es positivo y en rojo si es negativo.
- **Alertas discretas**:
  - Una flecha o pastilla ámbar cuando el consumo supera el 90 % y roja cuando pasa del 100 %.
  - Una pastilla roja «N retrasados» cuando haya obras con el plazo vencido.
- Las tarjetas de dinero se ven solo con los roles que hoy pueden ver montos.

## 3. Menú lateral
- El menú ya está fijo y tiene su propio desplazamiento. Solo se ajusta la barra de desplazamiento del menú: será delgada y aparecerá únicamente al pasar el mouse.

## 4. Cartera de proyectos
- Se reemplaza la cuadrícula de celdas pegadas por tarjetas separadas con espacio entre ellas: 2 columnas en pantallas grandes y 1 en pantallas chicas.
- Cada tarjeta tiene una franja fina a la izquierda con el color de su estado y un fondo muy tenue del mismo tono.
- Dentro de cada tarjeta, de arriba hacia abajo:
  - **Encabezado:** nombre, cliente y estado.
  - **Cifras:** presupuesto vigente, costo ejecutado y diferencia, alineadas a la derecha.
  - **Barras:** avance físico frente al programado.
- La tarjeta seleccionada se marca con un borde de color primario. Las desviaciones se marcan con un texto rojo discreto, sin bloques de color grandes.

## Detalles técnicos
- Archivos que se modifican:
  - `src/routes/_authenticated/dashboard-proyectos.tsx`: secciones de resumen y cartera.
  - `src/styles.css`: barra de desplazamiento del menú visible solo al pasar el mouse.
- Los colores nuevos se definen como tokens en `styles.css`; no se escriben colores sueltos en los componentes.
- Los colores de estado salen de `tonoSituacion`, que ya existe.
- No hay cambios en la base de datos.
