# Mover especialidades con flechas (Catálogo Técnico)

## Qué verás
- En la barra de iconos de la derecha de **Especialidades**, dos botones nuevos: **Subir** (flecha arriba) y **Bajar** (flecha abajo).
- Seleccionas una especialidad y, al pulsar una flecha, intercambia su lugar y su número con la vecina (ej. 05 INSTRUMENTACIÓN baja → pasa a 06 y ELÉCTRICA sube a 05).
- La especialidad sigue seleccionada tras moverla, para poder pulsar varias veces seguidas.
- Flecha arriba desactivada en la primera; flecha abajo desactivada en la última. Solo Gerencia/Administración puede moverlas (igual que editar).
- Al mismo tiempo se actualizan los códigos de los insumos de ambas especialidades (las dos cifras de especialidad): por ejemplo Instrumentista `10500001` pasaría a `10600001` y los de Eléctrica `106…` a `105…`. Correlativos se conservan.
- Las subfamilias acompañan a su especialidad: su numeración visible (especialidad + subfamilia, ej. 06-01 → 05-01) se actualiza en Catálogo Técnico y en Maestro de Insumos, sin perder a qué subfamilia pertenece cada insumo.

## Cuidados
- El intercambio es atómico: si algo falla, nada cambia (ni especialidades ni insumos).
- Se respeta el número de cada posición: si hay saltos (ej. 09 → 99), se intercambian esos mismos números, no se inventan nuevos.
- Partidas, APU y cotizaciones están enlazados por la especialidad y no por el número, así que no se alteran; los insumos inactivos también se recodifican para que no choquen.
- Mensaje de confirmación con cuántos insumos se recodificaron.

## Detalles técnicos
- Nueva función en base de datos `mover_especialidad(_id, _direccion)` (SECURITY DEFINER, verifica `is_admin_o_gerente`, bloqueo advisory compartido con la renumeración de insumos): busca la vecina activa por `codigo`, intercambia `codigo`, `codigo_modular` y `orden` usando un código temporal para evitar choques de unicidad, y reescribe `insumos.codigo` cambiando los dígitos 2–3 de ambas especialidades en un solo UPDATE (con desactivación temporal del trigger de renumeración por prefijo si interfiere). Grants solo a authenticated/service_role.
- `EspecialidadesPartida.tsx`: botones `BotonIcono` con `ArrowUp`/`ArrowDown`, llamada al RPC, `refrescar()` y toast; invalidar caché de insumos.
- Prueba pequeña de la regla de cálculo del nuevo código (cambio de las cifras EE) junto a `digito-insumo` pruebas.
