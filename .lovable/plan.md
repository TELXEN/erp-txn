# Mover Márgenes APU y Parámetros laborales al Maestro de insumos

## Objetivo
Centralizar la configuración que afecta el costo de los insumos dentro de **Análisis de Precios Unitarios (APU) › Maestro de insumos**, junto a sus cinco tipos actuales.

## Cambios
- Añadir **Márgenes APU** y **Parámetros laborales** como opciones del mismo selector interno donde hoy aparecen Mano de obra, Materiales, Equipos y maquinaria, Herramientas menores y Subcontratos / Servicios.
- Mantener las cinco opciones de insumos mostrando sus tablas actuales.
- Mostrar el panel completo de márgenes al elegir **Márgenes APU** y el formulario laboral al elegir **Parámetros laborales**.
- Conservar los permisos actuales: solo Gerente modifica estas configuraciones; los demás roles autorizados solo consultan.
- Retirar ambas pestañas de **Configuración del Sistema**, dejando allí únicamente **Tema de colores**.
- Actualizar las ayudas de texto del Maestro de insumos para indicar la nueva ubicación de los márgenes y parámetros laborales.
- Mantener intactos los cálculos, datos guardados y reglas de costo; el cambio será de ubicación y navegación.

## Verificación
- Comprobar que las siete opciones internas cambien de contenido correctamente.
- Confirmar que guardar márgenes y parámetros laborales siga actualizando los cálculos de insumos.
- Verificar que Configuración del Sistema muestre únicamente Tema de colores y que no haya errores visuales ni de compilación.

## Detalles técnicos
- Reutilizar `MargenesApuPanel` y `ParametrosLaboralesPanel` dentro de `Insumos`.
- Ampliar el estado interno del selector para distinguir tipos de insumo y paneles de configuración sin alterar `TipoInsumo`.
- Simplificar la navegación de Configuración del Sistema eliminando las dos vistas trasladadas.
