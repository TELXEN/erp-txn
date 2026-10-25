# Pago por día pactado sin mostrar S/ 4,800 como sueldo

## Caso
Sueldo en planilla S/ 3,500. Acuerdo: S/ 200 por día. 24 días = S/ 4,800. El trabajador no quiere que la boleta muestre S/ 4,800 porque le descontarían más.

## Límite legal
Si los S/ 1,300 extra son pago por su trabajo, la ley los cuenta como remuneración, se paguen como se paguen. Llevan AFP/ONP, EsSalud y renta de quinta. Pagarlos sin boleta o como "otra cosa" puede generar multas de SUNAFIL y deudas con SUNAT para la empresa. El ERP no va a ocultar ese pago. Sí puede registrar bien los conceptos que la ley deja sin descuentos.

## Opciones en el ERP
1. **Conceptos sin descuentos (solo si son reales)**: movilidad que depende de la asistencia, alimentación o viáticos con sustento, o una condición de trabajo. Se ponen en la boleta como «No afecto». No pagan AFP, EsSalud ni quinta, pero tienen que tener sustento y una política escrita.
2. **Complemento afecto**: los S/ 1,300 se pagan en la misma boleta o en una complementaria, con sus descuentos. Es la opción sin riesgo.
3. **Combinación**: una parte con sustento como «No afecto» y el resto como complemento afecto.

## Cómo funcionará
- En Personal: «Tarifa pactada por día» opcional.
- En la boleta del mes: el sistema calcula días × tarifa − sueldo (24 × 200 − 3,500 = 1,300). Tú repartes ese monto entre los conceptos permitidos: movilidad por asistencia y alimentación (sin descuentos, se pide el sustento) o complemento (con descuentos).
- La boleta muestra el sueldo de S/ 3,500 y cada concepto en su propia línea. Los descuentos se calculan solo sobre lo afecto.
- Si días × tarifa no llega al sueldo, no se agrega nada.

## Detalles técnicos
- Migración: `trabajadores.tarifa_dia numeric null`; tabla `boleta_conceptos` (boleta_id, concepto, monto, afecto bool, sustento text), con RLS de nómina.
- `src/lib/nomina-complemento.ts`: `montoComplemento(dias, tarifa, sueldo)` y suma de afectos/no afectos; tests (24×200−3,500 = 1,300; 15 días → 0; los no afectos no cambian AFP/quinta).
- `nomina.tsx` / `DetallePagoNomina.tsx`: editor y líneas por concepto con la marca «No afecto».
