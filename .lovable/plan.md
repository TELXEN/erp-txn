# Propuesta de mejora del front end del ERP

Este plan solo cambia lo visual y la forma de moverse entre pantallas. Los datos, los cálculos y los permisos siguen igual. Se aplica por etapas y cada una se revisa en pantalla.

## 1. Cabecera común en cada módulo
Todas las pantallas tendrán la misma franja superior:
- a la izquierda, la ruta (por ejemplo «Finanzas › SIRE SUNAT») y el título;
- en el centro, el período o la obra activa;
- a la derecha, las acciones principales.

Hoy cada módulo ordena esto a su manera: Tesorería, SIRE, Dashboard y Cotizaciones lo hacen distinto.

## 2. Pestañas uniformes
Las pestañas internas (Configuración, Ventas/Compras, Nómina, Tesorería…) tendrán un solo estilo: una línea inferior con el color del menú. Así dejan de mezclarse con los botones normales.

## 3. Tarjetas de resumen con el mismo formato
- Etiqueta arriba, monto grande y cantidad entre paréntesis en la etiqueta.
- Un color solo cuando hay alerta.
- Al pulsar la tarjeta se filtra la tabla, como ya ocurre en Tesorería.

Este formato se aplica a Dashboard, Cotizaciones, SIRE, Caja chica y Nómina.

## 4. Tablas más legibles
- Encabezado y totales fijos al hacer scroll.
- Importes alineados a la derecha, con el mismo ancho de cifra.
- Franja suave entre filas.
- Se mantiene la densidad compacta ya aprobada.

## 5. Estados de carga y vacío
Mientras carga, la tabla mostrará filas grises con la misma forma de la tabla, en lugar de quedar en blanco. Cuando no hay datos, un mensaje con icono dirá qué hacer, por ejemplo «Sincroniza el período».

## 6. Menú lateral más claro
- Iconos agrupados por área, con el módulo activo resaltado.
- Al pasar el cursor con el menú colapsado se verá el nombre del módulo.
- Los módulos más usados quedarán arriba.

## 7. Ventanas flotantes consistentes
Todas las ventanas de registro y edición tendrán el título y los botones Guardar/Cerrar fijos, y el contenido se desplazará por dentro, igual que la ventana de gastos generales.

## 8. Accesibilidad y contraste
- Revisar el contraste en los cinco temas.
- Foco visible al usar el teclado.
- Tamaños mínimos para hacer clic.

## Orden propuesto
1 y 2 → 3 → 4 y 5 → 6 → 7 → 8.

## Detalles técnicos
- Nuevos componentes en `ui-kit`: `CabeceraModulo`, `Pestanas`, `TarjetaResumen`, `FilasCargando`, y `Vacio` mejorado. Se adoptan pantalla por pantalla.
- Solo tokens semánticos de `styles.css`, sin colores fijos, y `cn()` para combinar clases.
- La densidad se conserva tal como dice `mem://design/densidad`.
- Cada etapa se verifica con Playwright en escritorio y en celular, y sin errores de compilación.
