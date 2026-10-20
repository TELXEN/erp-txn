# Nuevo orden del código de insumos (8 dígitos)

## Regla
Orden: **T tipo + EE especialidad + SS subfamilia + NNN correlativo**, siempre 8 dígitos sin puntos.
- Materiales: subfamilia obligatoria → `1 06 13 001` = `10613001`.
- Mano de obra (2), Equipos/Herramientas (3), Subcontratos (4): sin subfamilia, se completa con `00` → `20600001`.
- El correlativo 001–999 corre por cada combinación tipo + especialidad + subfamilia.

## Ventana de nuevo / editar / copiar insumo
- Material: pide especialidad y subfamilia.
- Mano de obra, equipos y subcontratos: solo pide especialidad; el campo subfamilia se oculta.
- El código se genera al guardar; si cambias tipo de clasificación o especialidad al editar, se genera uno nuevo.

## Insumos ya codificados
Los que ya tienen código con el orden anterior se recodifican al nuevo orden (los de MO/equipos/subcontratos pasan a `00` en subfamilia). Los «Sin clasificar» siguen igual hasta que los clasifiques.

## Detalles técnicos
- `armarCodigoInsumo(tipo, especialidad, subfamilia|null, n)` en `src/lib/codigo-insumo.ts`: subfamilia obligatoria solo para materiales; `00` para los demás. Pruebas actualizadas: `10613001`, `20600001`, rechazo >999 y material sin subfamilia.
- Migración: reemplazar `siguiente_codigo_insumo_modular` para usar prefijo T EE SS (SS = `00` si no es material), mismo bloqueo por combinación y error al pasar 999.
- Ventana de insumos en `BancoApu.tsx`: ocultar subfamilia salvo materiales y limpiar `subfamilia_id` en los demás.
- Recodificación de los insumos ya codificados al nuevo orden, sin repetir correlativos.
- Actualizar la memoria de código de insumos.
