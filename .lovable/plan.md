# Cinta propia para la cotización: modo Edición y modo Vista previa

Al abrir una cotización, la cinta cambia sus botones según el modo.

## Pestañas reorganizadas (debajo de la cinta, en ambos modos)

```text
 ← Volver   |   Edición   Vista previa                         TXN26-C001 · Rev. 00
            ‾‾‾‾‾‾‾‾‾ (línea del tema bajo el modo activo)
```

- «Volver» queda a la izquierda, separado por una línea fina, con flecha.
- «Edición» y «Vista previa» son las pestañas de modo; la activa lleva la línea sutil del tema.
- «Encabezado» y «Gastos generales» salen de las pestañas y pasan al grupo Documento de la cinta.
- A la derecha, código y revisión de la cotización como referencia.
- La misma barra aparece en la vista previa, para alternar entre ambos modos sin buscar botones.

## Modo Edición (hoja de la cotización)

```text
| Estado          | Obra            | Documento            | Partidas              | Salida            |
| [Estado ▾]      | [Convertir      | Encabezado           | Insertar del catálogo | Exportar a Excel  |
| Revisión ▾      |  en obra] grande| Gastos generales     | Agregar insumo        | Guardar plantilla |
| Vigencia        |                 | Nueva revisión       |                       | Dossier APU       |
```

- Estado: selector Borrador/Enviada/Aprobada/Rechazada, selector de revisiones y vigencia (sin cambios de lógica).
- Obra: Convertir en obra, grande, con las mismas condiciones (solo aprobada, una vez).
- Documento, Partidas y Salida: los botones de la barra derecha de la hoja pasan a la cinta como iconos pequeños + texto en columna. Las acciones de fila (subir, bajar, borrar, sangría) se quedan en la hoja.

## Modo Vista previa (hoja A4)

```text
| Revisión        | Formato               | Exportar                     | Navegación     |
| Revisión ▾      | A4 horizontal (check) | [Descargar PDF] grande       | Volver a editar|
|                 |                       | PDF + dossier                |                |
|                 |                       | Exportar a Excel / Dossier APU|               |
```

- Los botones que hoy están sobre la hoja A4 (Horizontal, Excel, Dossier APU, PDF con dossier, Descargar PDF) se quitan de la hoja y pasan a la cinta.
- Volver a editar regresa a la cotización en modo edición (solo si es la revisión actual).

## Reglas
- Mismo estilo de cinta: grupos con línea vertical fina, rótulo abajo, iconos sin repetir, rótulos completos en máximo dos líneas.
- En modo lateral/simplificado los mismos botones se muestran como fila compacta.
- Nada cambia en cálculos, exportaciones ni estados.

## Detalles técnicos
- `cotizaciones.tsx`: el `acciones` del `Encabezado` en modo edición se arma con `GrupoCinta`; `accionesDocumento` de `HojaNiveles` se oculta en modo cinta y sus handlers se reutilizan.
- `cotizacion-vista.tsx`: mover la barra de botones (líneas ~410-433) al `acciones` del encabezado con `GrupoCinta`; las funciones `descargarPdf`/`exportarExcel` no cambian.
- Verificación con Playwright en ambos modos y en una revisión histórica.
