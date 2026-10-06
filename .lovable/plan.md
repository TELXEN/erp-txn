# Conversión automática de partidas al cargarlas en cotizaciones

## Objetivo
Tratar el precio del banco maestro de partidas siempre como **soles (PEN)** y guardarlo en la moneda activa de la cotización:

- Cotización en PEN: copiar el precio sin cambios.
- Cotización en USD: dividir el precio en soles entre el tipo de cambio de la cotización.
- Mostrar inmediatamente el símbolo y los totales en la moneda elegida.

## Cambios
1. Crear una función única para convertir un precio maestro en soles a la moneda de la cotización, validando que el tipo de cambio sea mayor que cero y redondeando de forma consistente.
2. Aplicar esa función en todos los puntos donde una partida maestra entra a la cotización:
   - fila rápida y buscador dentro de la hoja;
   - reemplazo/autocompletado de una fila existente;
   - formulario de inserción desde el catálogo;
   - carga de una plantilla usando los precios actuales del banco maestro.
3. Pasar a la hoja editable la moneda y el tipo de cambio de la cotización, no solo el símbolo, para que cada inserción use la conversión correcta.
4. Mantener las partidas libres ingresadas manualmente en la moneda activa mostrada por la cotización; no convertirlas nuevamente.
5. Si una cotización USD no tiene un tipo de cambio válido, bloquear la carga desde el banco y mostrar un mensaje claro para registrar el tipo de cambio antes de continuar.

## Reglas de cálculo
```text
Precio maestro: PEN 1,000.00
Cotización PEN:  PEN 1,000.00
Cotización USD con T.C. 3.75: USD 266.6667
```

El cambio posterior de moneda de toda la cotización conservará el comportamiento actual: PEN→USD divide y USD→PEN multiplica.

## Verificación
- Insertar la misma partida maestra en una cotización PEN y confirmar que conserva su precio.
- Insertarla en una cotización USD y confirmar precio, símbolo, subtotales por nivel y total general.
- Repetir desde buscador, fila rápida, catálogo y plantilla.
- Confirmar que una partida manual no recibe conversión automática.
- Confirmar que un tipo de cambio vacío o cero impide una conversión incorrecta.
