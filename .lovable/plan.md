# Reorganizar la cinta (ribbon) para un uso más fácil

## Problema actual
- Cada pestaña (Comercial, Operaciones, Logística…) muestra 6–8 botones sueltos sin subgrupos: el usuario debe leerlos todos para encontrar uno.
- Las acciones de la pantalla abierta están en una pestaña aparte, así que para ir a otro módulo hay que cambiar de pestaña y se pierden de vista los botones de trabajo.
- "Temas de colores" ocupa una pestaña completa con un solo botón.
- No hay forma rápida de buscar un módulo ni de tener a mano los más usados.

## Propuesta (estilo Microsoft 365)

### 1. Subgrupos con título dentro de cada pestaña
Ordenar los botones por la secuencia real del trabajo, con su título abajo:
```text
Comercial:   [Clientes] | [APU · Cotizaciones] | [Preliquidaciones · Facturación · Registro de Ventas]
              Clientes      Presupuestar              Cobrar
Operaciones: [Dashboard · Proyectos · Partidas] | [Gantt · Avance · Valorizaciones] | [Requerimiento · Aprobaciones]
              Planificar                          Ejecutar y controlar               Solicitar
Logística:   [Proveedores · Transportistas] | [Requerimientos · Órdenes · Importaciones] | [Almacén · Inventario · Vehículos]
              Socios                          Comprar                                    Existencias
Finanzas:    [Dashboard · Flujo de Caja] | [Costos Directos · Gastos Generales] | [Tesorería · Caja Chica] | [SIRE SUNAT]
Personal:    [Personal · Asistencia · EPP] | [Boletas · Honorarios · Beneficios]
Datos:       [Configuración · Parámetros] | [Catálogo Técnico · Maestro de Insumos]
```
Botón principal grande para el más usado de cada grupo; los demás en tamaño mediano apilados (como Word/Excel).

### 2. Pestaña «Inicio» con favoritos y recientes
- Primera pestaña fija: los 5 módulos abiertos más recientemente y los favoritos que marque el usuario (estrella al pasar sobre un botón o clic derecho «Anclar a Inicio»). Se recuerda por usuario.

### 3. Buscador «¿Qué desea hacer?»
- Cuadro de búsqueda en la fila superior (atajo Alt+Q, como Office): escribir «boleta» o «orden» muestra módulos y secciones (incluye submenús como Codificación o Usuarios y Roles) y abre el elegido con Enter.

### 4. Acciones de la pantalla siempre visibles
- La pestaña de la pantalla abierta se abre sola al entrar al módulo y queda resaltada con el color de acento; al volver a ella desde otra pestaña se recuerda.

### 5. Limpieza
- Quitar la pestaña «Temas de colores» y mover el selector de temas al botón «Diseño» (junto a los modos de cinta).

## Fuera de alcance
- No cambian permisos por rol, rutas ni el menú lateral (solo recibe los mismos subgrupos como títulos).

## Detalles técnicos
- `AppShell.tsx`: `Item` gana `grupo: string` y `principal?: boolean`; `MENU` se reordena por grupos; Temas sale del menú.
- `CintaOpciones.tsx`: renderiza `GrupoCinta` por cada `grupo`; pestaña `__inicio` con recientes/favoritos guardados en localStorage (`erp-telxen-recientes`, `erp-telxen-favoritos`); buscador con índice plano de ítems + `sub`, filtrado con `claveNombre` (sin tildes/mayúsculas), teclado ↑↓/Enter, atajo Alt+Q.
- `SelectorModo` incorpora la lista de temas existente.
- Verificación con Playwright en cinta clásica y simplificada a 1378 px.
