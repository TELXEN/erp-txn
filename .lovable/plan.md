# Preliquidación: origen Libre o Desde cliente

## Qué verá el usuario
Al pulsar **Nueva** en Preliquidaciones aparece primero una ventana pequeña con dos opciones (igual que en facturas y guías):

1. **Libre** — abre el editor vacío. Cliente y proyecto se pueden elegir o dejar en blanco; la descripción (concepto) se escribe a mano.
2. **Desde cliente** — muestra la lista de clientes; al elegir uno aparecen solo **los proyectos de ese cliente**. Al seleccionar el proyecto:
   - se abre el editor con cliente y proyecto ya cargados,
   - el **nombre del proyecto se copia en la descripción** (concepto), que queda editable para añadir texto (por ejemplo «— Valorización N° 2, octubre»).
   - Si el cliente no tiene proyectos, se avisa y se ofrece continuar como Libre.

Editar una preliquidación existente no cambia: abre directo el editor.

## Reglas
- En modo Desde cliente, el selector de proyecto del editor solo lista proyectos de ese cliente.
- Cambiar de proyecto en el editor reemplaza solo la parte del nombre si el usuario no la modificó; si ya la editó, no se sobrescribe.
- La preliquidación es a nivel global: se retira el botón «Cargar partidas» del editor; las líneas se escriben a mano.
- Saldo de obra y aviso de sobre-saldo solo aplican cuando hay proyecto.

## Detalles técnicos
- La base exige hoy proyecto en cada preliquidación; una migración lo vuelve opcional para permitir Libre sin proyecto (cliente sigue opcional).
- `Preliquidaciones.tsx`: `nuevo()` abre un diálogo de origen (estado `origen: "libre" | "cliente"`), guardado en el estado del editor, no en la URL. Filtrar `proyectos` por `cliente_id`; precargar `concepto` con `codigo nombre` del proyecto. Quitar `required` del proyecto en Libre; `guardar` envía `proyecto_id: null` si está vacío; `saldoSel`/selector de partidas protegidos por proyecto.
- Revisar listado, PDF y facturación desde preliquidación para que toleren proyecto vacío (mostrar «—»).
- Guardar la regla en memoria del proyecto.
