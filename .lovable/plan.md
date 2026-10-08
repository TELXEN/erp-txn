# Generar recibos por honorarios desde el tareo mensual

## Qué verá el usuario
- En **Recibos por Honorarios**, un nuevo botón **«Generar boletas de pago»** (toma los datos del consolidado mensual del tareo).
- Al pulsarlo se abre una ventana pequeña para elegir **Mes y Año**, con una vista previa de los prestadores (personal con contratación «Honorarios») que tienen tareo ese mes: días laborados, días de viaje, horas extras, costo unitario y monto estimado.
- Al confirmar, se crea **un recibo por prestador y por mes** (sumando todos los proyectos), con estado **«Pendiente de N°»**.
- En el listado, los borradores se marcan con una etiqueta ámbar «Pendiente de N°». Al abrirlos, se completa el número real del recibo SUNAT y se guarda normalmente. No se pueden marcar como pagados hasta tener número.
- Si un prestador ya tiene recibo en ese mes, se omite (no se duplica) y se informa en el resumen final: «X generados, Y ya existían, Z sin tareo».

## Reglas del cálculo (iguales a las actuales)
- Costo unitario = jornal de la ficha del trabajador.
- Días laborados y días de viaje desde el consolidado del tareo; horas extras convertidas a soles con el jornal.
- Retención de 8 % si supera S/ 1,500 y no tiene suspensión de 4ta.
- Proyecto: si trabajó en uno solo, se asigna ese; si fueron varios, «Oficina Central / varios» y el concepto lista los proyectos.
- Concepto prellenado: «Servicios prestados en [mes año] – [proyectos]», editable.
- Lugar y fecha de emisión: último día del mes, lugar por defecto Huancayo.

## Detalles técnicos
- Migración: `numero_recibo` pasa a admitir vacío (NULL) para borradores; la restricción única (trabajador, número) sigue aplicando solo a números reales (NULL no colisiona). Índice único adicional parcial sobre (trabajador_id, mes, anio) para evitar duplicar recibos del mismo mes.
- Reutilizar `resumenTareoHonorario` y `calcularDetalleHonorario` de `DetallePagoHonorario.tsx` para mantener un solo cálculo.
- Nuevo componente `GenerarDesdeTareo.tsx` (VentanaFlotante) con inserción masiva desde el cliente (RLS vigente).
- `honorarios.tsx`: botón, etiqueta «Pendiente de N°», bloqueo de pago sin número; el editor exige número al guardar un borrador.
