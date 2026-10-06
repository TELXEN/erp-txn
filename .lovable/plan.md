# Gestión de Personal: registro más elegante y pestaña EMO

## Qué verá el usuario
Gestión de Personal tendrá dos pestañas con botones del mismo estilo que el resto del ERP: **Personal** y **EMO (Exámenes médicos)**. Al lado de EMO aparecerá un contador rojo o ámbar cuando haya exámenes vencidos o por vencer.

### 1. Registro de trabajador mejorado (pestaña Personal)
- El formulario se abre con el botón «+ Nuevo trabajador», ya no queda siempre abierto encima de la planilla.
- Cuatro secciones con ícono y número de paso: Datos personales, Datos laborales, Sueldo y pago, Régimen de pensiones.
- Validación mientras se escribe: DNI de 8 dígitos y aviso si ya existe, celular de 9 dígitos, y mensaje de ayuda debajo de cada campo obligatorio.
- El botón Registrar queda desactivado y muestra qué falta completar. Botón Cancelar para limpiar el formulario.
- En la planilla, una columna nueva «EMO» con un punto de color (vigente / por vencer / vencido / sin EMO).

### 2. Pestaña EMO
**Registrar un examen:**
- Trabajador (buscador por nombre o DNI)
- Tipo de EMO: Pre-ocupacional, Periódico, Retiro, Por reincorporación
- Exámenes realizados (selección múltiple): examen clínico, audiometría, espirometría, oftalmología, rayos X de tórax, laboratorio, psicológico, trabajo en altura, electrocardiograma, otros
- Resultado: Apto, Apto con restricciones, No apto (y campo de restricciones)
- Fecha del EMO y fecha de vencimiento (se propone automáticamente a 1 año, con botones «+1 año» / «+2 años»)
- Clínica y sede de la clínica (se recuerdan las ya usadas para elegirlas rápido)
- Costo (S/), estado de pago (Pendiente / Pagado) y fecha de pago
- Observaciones

**Listado y alertas:**
- Tarjetas resumen arriba: Vigentes, Por vencer (30 días o menos), Vencidos, Pagos pendientes con su monto total.
- Tabla con filtros por estado, clínica y trabajador; semáforo en la fecha de vencimiento con días restantes.
- Botón para marcar como pagado y registrar la fecha de pago, editar y eliminar.
- Exportar a Excel.
- La alerta de EMO por vencer también aparece en el Dashboard.

**Quién puede verlo:** el costo y el pago solo los editan Administrador y Gerente; los demás roles con acceso a Personal ven los exámenes.

## Detalles técnicos
- Nueva tabla `emos_trabajador`: trabajador_id (FK trabajadores, on delete restrict), tipo_emo, examenes text[], resultado, restricciones, fecha_emo, fecha_vencimiento, clinica, sede_clinica, costo numeric, estado_pago, fecha_pago, observaciones, created_by, timestamps + trigger updated_at. GRANT a authenticated/service_role, RLS con las mismas reglas de acceso que `trabajadores`; escritura de costo/pago limitada vía `is_admin_o_gerente`.
- Estado de vigencia calculado en cliente (`src/lib/emo.ts`): vencido <0 días, por vencer ≤30, vigente.
- `src/routes/_authenticated/personal.tsx`: pestañas Boton estilo APU, formulario en Panel plegable con secciones; nuevo componente `src/components/personal/EmoPanel.tsx`.
- Bloquear eliminar trabajador si tiene EMO (mensaje claro).
