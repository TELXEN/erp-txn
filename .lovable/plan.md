# Encabezado y firma de la Boleta de Pago

## 1. Encabezado
```text
[LOGO]                        TELXEN S.A.C. | BOLETA DE PAGO               |
                          eslogan (pequeño) | RUC 20xxxxxxxxx              |
                        dirección (pequeña) | N° BP-2026-10-001            |
                                            | Octubre 2026 · fechas · pago |
```
- Logo solo, en el extremo izquierdo.
- Razón social, eslogan y dirección **alineados a la derecha**, pegados al recuadro (eslogan y dirección en letra pequeña). Se quita de ahí el RUC.
- Dentro del recuadro: el RUC va justo debajo de «BOLETA DE PAGO», en letra pequeña, y siguen el N°, el periodo y la fecha de pago.

## 2. Firmante de la boleta
- En **Datos de la empresa** se añade la sección «Firmas de documentos laborales» con cuatro campos:
  - Gerente General: nombre y DNI.
  - Jefe de Recursos Humanos: nombre y DNI (opcional).
- Regla de firma: si hay un Jefe de RR. HH. registrado, firma la boleta él, con el rótulo «Jefe de Recursos Humanos». Si no, firma el gerente, con el rótulo «Gerente General». Si no hay ninguno, se mantiene la razón social y el RUC.
- Al cambiar de gerente o jefe, las boletas nuevas y las reimpresiones muestran al firmante vigente.
- Se aplica también a las boletas de CTS, gratificación y liquidación, para que todas firmen igual.

## Detalles técnicos
- Migración: cuatro columnas opcionales de texto en `empresa_config`: `gerente_nombre`, `gerente_dni`, `rrhh_nombre`, `rrhh_dni`.
- `DatosEmpresa.tsx`: cuatro campos nuevos. `src/lib/empresa.ts`: una función `firmanteLaboral(empresa)` que devuelve el nombre, el DNI y el cargo.
- `DetallePagoNomina.tsx` y `HojaCts.tsx` usan `firmanteLaboral`.
- Prueba unitaria: con RR. HH. firma RR. HH.; sin RR. HH. firma el gerente.
