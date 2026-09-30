# Gestión de Vehículos (flota propia y alquilada)

## Objetivo
Controlar los 2 vehículos propios y las movilidades alquiladas: ficha, mantenimiento, traslados a obra y un "tareo vehicular" que cobra el uso a cada proyecto como si fuera un alquiler a la propia empresa.

## Nuevo módulo "Vehículos" (menú Logística, debajo de Almacén)
Pestañas:

1. **Flota**
   - Ficha: placa, marca/modelo, año, tipo (camioneta, camión, auto), propiedad (Propio / Alquilado), proveedor (si es alquilado, desde Proveedores), km actual, SOAT, revisión técnica y vencimientos, estado (Operativo / En taller / Baja).
   - Tarifa interna: por día y/o por km (lo que se cobra al proyecto). Para alquilados: tarifa del proveedor.
   - Alertas visibles de SOAT/revisión técnica por vencer (30 días).

2. **Tareo vehicular** (igual al tareo de personal)
   - Matriz por fecha: vehículo x proyecto, días (1, 0.5) o km, conductor (de Personal), observación.
   - Costo = días x tarifa diaria (o km x tarifa por km). Se suma al costo real del proyecto como rubro **Equipos / Movilidad**.
   - Vehículos propios: el ingreso interno se muestra en un resumen "rentabilidad de flota" (ingreso interno vs. gastos de mantenimiento y combustible).
   - Alquilados: el costo lo genera el tareo; opcionalmente vincula la factura del proveedor para comparar.

3. **Traslados a obra**
   - Registro: fecha, vehículo, conductor, origen, destino (obra), km inicial/final, carga o personal trasladado, combustible cargado (galones y monto).
   - Actualiza el km del vehículo y puede generar la línea del tareo del día automáticamente.

4. **Mantenimiento**
   - Plan preventivo por km o por fecha (cambio de aceite, llantas, frenos) con próxima fecha/km y alerta.
   - Registro de mantenimientos realizados: tipo (Preventivo/Correctivo), taller (proveedor), costo, km, detalle.
   - Costo registrado como gasto general (no se carga a obra, ya lo cubre la tarifa interna).

5. **Resumen**
   - KPIs: costo de movilidad por proyecto, km recorridos por vehículo, gasto de mantenimiento y combustible, utilidad de flota propia, próximos vencimientos.

## Roles
- Ingeniero: registra traslados y tareo vehicular sin ver montos.
- Administrador y Gerente: todo, incluidas tarifas y costos.

## Integración
- Costo real del proyecto y dashboards incluyen el tareo vehicular.
- Flujo de caja: mantenimiento, combustible y alquileres a terceros como egresos.

## Detalles técnicos
- Tablas nuevas: `vehiculos`, `tareo_vehiculos`, `traslados_vehiculo`, `mantenimientos_vehiculo`, `plan_mantenimiento` con GRANTs, RLS (lectura autenticados; escritura de montos solo admin/gerente vía `is_admin_o_gerente`) y triggers `updated_at`.
- Hooks en `src/lib/vehiculos.ts`; ruta `src/routes/_authenticated/vehiculos.tsx`; entrada en AppShell.
- `costoRealProyecto` en `src/lib/datos.ts` suma `tareo_vehiculos.costo_soles`.

## Supuestos a confirmar
- Tarifa interna por día (con opción por km).
- Mantenimiento y combustible de vehículos propios van a gastos generales, no a la obra.
