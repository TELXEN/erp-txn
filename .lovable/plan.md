# Tareo vehicular por días de uso

## Objetivo
Igualar el registro del tareo vehicular al calendario del tareo de personal, considerando únicamente los días en que cada vehículo fue usado.

## Cambios
- Reemplazar el registro individual por fecha por un calendario mensual donde se puedan marcar varios días de uso.
- Mantener como datos obligatorios únicamente Vehículo y Proyecto.
- Retirar del tareo vehicular los campos Conductor, kilómetros recorridos y Observación.
- Registrar una fila por cada día seleccionado, con 1 día de uso y costo calculado solo con la tarifa diaria del vehículo.
- Mostrar un consolidado mensual por vehículo con proyecto, cantidad de días usados y costo acumulado.
- Permitir consultar y corregir los días registrados desde el calendario, siguiendo el patrón del tareo de personal.
- Mantener kilómetros, conductor y observaciones en Traslados, donde siguen siendo necesarios.

## Alcance técnico
- No se crearán tablas ni se cambiará la estructura de la base de datos.
- Los registros existentes seguirán disponibles; los nuevos tareos guardarán `km = 0` y calcularán `costo_soles = días × tarifa_dia`.
- Los resúmenes de ingresos internos y alquileres continuarán usando el costo del tareo vehicular.
