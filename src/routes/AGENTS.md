- Protected routes check the session locally (getSession) in beforeLoad and every route has a pending screen (PantallaCarga) — navigation never waits on the network with a blank page.
- Purchases are single-rubro (MAT/EQ/HE/EPP via rubros-compra.ts) and every OC is generated from an approved supplier quote in the Bandeja; stock requests use proyecto_id null — traceable, unmixed purchasing.

- Carriers (transportistas + vehiculos/conductores) are a catalogue; guías copy carrier, vehicle and driver data into datos_guia so emitted guides never change when the catalogue does.
- Requerimientos: obra → gerente approves (trigger) → Bandeja quotes → approved quote creates OC → recepcionar_orden_obra RPC receives in obra. «Aprobar y generar OC» shows only with prices and pending qty; registering a quote requires ≥1 price.
- Supplier quotes open per inbox requirement. Operations has no APU-unfolding header: the icon windows pick their own obra; reception lists every obra's pending orders.
