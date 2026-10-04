# Gestión del SIRE de SUNAT en el ERP

## Qué es y dónde encaja

El SIRE (Sistema Integrado de Registros Electrónicos) de SUNAT entrega cada mes las **propuestas del Registro de Compras (RCE)** y del **Registro de Ventas e Ingresos (RVIE)**. Encaja de forma natural como un nuevo módulo dentro del grupo **Facturación** del menú lateral, junto a Facturación Electrónica y Guías de Remisión, porque trabaja sobre los mismos comprobantes.

```text
Menú lateral
└── Facturación
    ├── Facturación Electrónica   (existente)
    ├── Guías de Remisión         (existente)
    └── SIRE SUNAT                (NUEVO)
        ├── Registro de Compras (RCE)
        └── Registro de Ventas (RVIE)
```

## Componentes propuestos

### 1. Pantalla «SIRE SUNAT» con dos pestañas

- **Compras (RCE)**: tabla con los comprobantes del período (fecha, tipo, serie-número, RUC y razón social del proveedor, base imponible, IGV, total, estado de aceptación). Filtros por período (mes/año), proveedor y estado.
- **Ventas (RVIE)**: igual, pero alimentado automáticamente desde los comprobantes ya emitidos en el ERP (`comprobantes_electronicos`), sin doble digitación.

### 2. Conciliación con el ERP (el mayor valor)

- En **Compras**: cruzar la propuesta de SUNAT contra los comprobantes registrados en Costos Directos, Gastos Generales, Caja Chica e Importaciones. Marcar cada fila: *Coincide*, *Solo en SUNAT* (falta registrar en el ERP) o *Solo en ERP* (no aparece en SUNAT). Esto evita omitir gastos con crédito fiscal.
- En **Ventas**: verificar que todo lo facturado en el ERP figure en la propuesta RVIE.

### 3. Estados de aceptación del RCE

Botones por comprobante o por lote: **Aceptar**, **Observar** o **Excluir** de la propuesta, replicando lo que luego se confirma en el portal SUNAT.

### 4. Exportaciones

- Archivo en formato SUNAT (estructura PLE 8.2 / 14.1) listo para importar en el portal o en el PLE.
- Excel del registro con la letra configurada en «Tipografía de documentos».

### 5. Configuración

- Período activo, tipo de cambio del período (reutiliza `tipo_cambio_diario`) y recordatorio de cierre mensual.

## Datos y estructura técnica

- Nueva tabla `sire_compras` (período, datos del comprobante, proveedor, montos, estado de aceptación, vínculo opcional con `gastos_directos` / `gastos_generales`) con RLS y permisos por rol, siguiendo el estándar del ERP.
- Las ventas se leen directo de `comprobantes_electronicos`; no duplicamos datos.
- Roles: Gerente y Administrador gestionan y aceptan; Ingeniero solo consulta (igual que el resto de Facturación).

## Punto importante: conexión con SUNAT

SUNAT no ofrece una API pública directa para el SIRE; hoy existen dos caminos:

1. **Carga manual del archivo**: el usuario descarga la propuesta (Excel/TXT) desde el portal SUNAT y la importa al ERP con el importador de Excel ya existente. El ERP concilia, gestiona aceptaciones y genera el archivo de respuesta. **Es la opción recomendada para empezar**: sin credenciales, sin riesgos, útil desde el primer día.
2. **Integración automática** vía servicios de terceros (p. ej. APIs que consultan SUNAT con las credenciales SOL del cliente): requiere guardar la clave SOL de forma segura y depende de un proveedor externo. Se puede evaluar como fase 2.

## Fases sugeridas

1. **Fase 1**: pantalla SIRE con pestañas Compras/Ventas, importación de la propuesta SUNAT por Excel, conciliación contra el ERP, aceptar/observar, exportación PLE y Excel.
2. **Fase 2** (opcional, a decidir luego): conexión automática con credenciales SOL vía proveedor externo.

## Notas

- No se toca la facturación electrónica existente; el SIRE solo lee sus datos.
- Todo el diseño seguiría la paleta y componentes actuales del ERP (ui-kit, tablas WYSIWYG, ventanas flotantes).
