# Reorganizar el menú «Datos»

Hoy el menú tiene 4 opciones mezcladas: Catálogos Maestros (codificación, parámetros, marcas, finanzas, cargos), Catálogo Técnico, Maestro de Insumos y Configuración del Sistema. Marcas está lejos de Insumos, que es donde se usa, y el orden no sigue cómo se carga la información.

## Orden propuesto (de lo básico a lo que depende de ello)

```text
DATOS
1. Configuración del Sistema   Empresa · Usuarios y Roles · Tipografía · Valores RMV/UIT · Integraciones
2. Parámetros Generales        Codificación de documentos · Parámetros de proyectos
                               · Costos y Finanzas (categorías GG, centros, rubros) · Cargos del personal
3. Catálogo Técnico            Unidades · Especialidades · Subfamilias · Marcas · Títulos WBS
4. Maestro de Insumos          (usa todo lo anterior)
```

- **Configuración del Sistema primero**: es lo primero que se llena (datos de la empresa, usuarios).
- **«Catálogos Maestros» pasa a llamarse «Parámetros Generales»** y conserva sus grupos menos Marcas.
- **Marcas se muda al Catálogo Técnico**, junto a Unidades y Subfamilias, justo antes del Maestro de Insumos que las consume. Misma tabla, lupa y barra derecha de hoy.
- **Pestañas del Catálogo Técnico en orden de uso**: Unidades → Especialidades → Subfamilias → Marcas → Títulos WBS.
- Cada pantalla recuerda la última pestaña abierta, para volver directo a donde trabajabas.
- Los permisos no cambian (Configuración sigue siendo solo para Gerencia en el menú).

No se borra ni cambia ningún dato; solo se mueven pantallas.

## Detalles técnicos
- `AppShell.tsx` MENU: reordenar ítems de «Datos» y renombrar texto de `/datos`.
- `datos.tsx`: quitar el grupo «Marcas» de `GRUPOS_CONFIG`; extraer `MarcasPanel` a `src/components/MarcasPanel.tsx`.
- `catalogo-tecnico.tsx`: nueva pestaña `marcas` con `MarcasPanel`; reordenar pestañas; recordar pestaña con `useRecordado`.
- Actualizar head() de `/datos` con el nuevo nombre.
