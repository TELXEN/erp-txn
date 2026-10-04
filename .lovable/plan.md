# SIRE SUNAT (RVIE y RCE) en Finanzas y Contabilidad

## Dónde va

```text
Finanzas y Contabilidad
├── ... (existentes)
└── SIRE SUNAT   (NUEVO, icono FileCheck)
    ├── Configuración API SOL
    ├── Ventas (RVIE)
    └── Compras (RCE)
```

Acceso: Gerente y Administrador ven Ventas/Compras; solo el Gerente ve y edita Configuración API SOL.

## 1. CONFIGURACIÓN API SOL

- Formulario: RUC de la empresa (precargado de los datos de la empresa), Client ID, Client Secret, Usuario SOL, Clave SOL.
- Client Secret y Clave SOL se guardan de forma segura en el servidor; al reabrir se muestran como «••••••• guardado» y solo se reemplazan si se escribe uno nuevo. Nunca vuelven a la pantalla.
- Botón «Validar Conexión»: prueba simulada (valida formato del RUC y que todos los campos estén completos) y muestra aviso flotante de éxito o error.

## 2. Panel SIRE (misma plantilla para Ventas y Compras)

Indicador de pasos arriba (1 Sincronización → 2 Conciliación → 3 Cierre) con transición suave entre pasos.

**Paso 1 – Sincronización**
- Selector de período (mes/año, por defecto el mes anterior) y botón «Sincronizar Propuesta con SUNAT».
- Barra de progreso + filas esqueleto durante la simulación (~2 s).
- La propuesta se genera de forma simulada a partir de los documentos del ERP del período, añadiendo algunas diferencias y documentos solo-SUNAT para poder probar la conciliación.

**Paso 2 – Conciliación**
- Tabla densa: Fecha, Tipo, Serie-Número, RUC/Razón social, Base, IGV, Total SUNAT, Total ERP, Estado, Acción.
- Estados con badge suave:
  - Match Perfecto (verde)
  - Discrepancia en Monto/IGV (naranja, muestra la diferencia)
  - Faltante en ERP (rojo) con botón «+ Registrar en Gasto» (en Compras abre la ventana de registro de Gastos Generales con los datos precargados; en Ventas lleva a Facturación Electrónica).
- Pestañas filtro: Todos, Conciliados, Con Discrepancias, Solo en SUNAT, con contadores.

**Paso 3 – Cierre y Envío**
- Tarjetas: Monto Neto Total, IGV Total, Total de Documentos (más desglose por estado).
- «Generar Archivo de Reemplazo (.TXT)»: descarga real en formato SUNAT (campos separados por «|», nombre de archivo según nomenclatura SIRE).
- «Enviar Aceptación a SUNAT»: simulado; marca el período como Aceptado con fecha y usuario, y muestra aviso.

## Fuentes de datos del ERP

- Ventas: comprobantes electrónicos emitidos del período.
- Compras: Costos Directos, Gastos Generales, Caja Chica e Importaciones con comprobante del período.

## Detalles técnicos

- Nueva ruta `/sire` con pestañas internas; entrada en el menú de AppShell.
- Tablas nuevas (con GRANTs y RLS por rol):
  - `sire_config`: ruc, client_id, usuario_sol (solo gerente).
  - Secretos (client_secret, clave_sol) en tabla aparte accesible solo por servicio, escritos mediante server function autenticada que verifica rol gerente; nunca se devuelven al navegador.
  - `sire_periodos`: libro (RVIE/RCE), periodo, estado, totales, aceptado_por/en.
  - `sire_propuesta_items`: documento SUNAT simulado + estado de conciliación + id del registro ERP vinculado.
- Conciliación por clave tipo+serie+número+RUC; discrepancia si |total| o |IGV| difiere > 0.01.
- La sincronización y el envío reales con la API de SUNAT quedan preparados (misma server function) pero en modo simulación hasta que se conecten credenciales reales.
- Estilo: componentes del ui-kit, tokens del tema (sidebar navy), iconos Lucide, títulos de sección en mayúsculas.
