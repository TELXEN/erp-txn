# ERP TELXEN

Crea un sistema web integral para el Control de Proyectos de Construcción diseñado para una empresa constructora. La interfaz debe ser limpia, moderna, altamente funcional, intuitiva y completamente en español. Toda la consolidación financiera global del sistema se debe realizar estrictamente en Soles (PEN). 

MÓDULOS Y REGLAS DE NEGOCIO ESTRICTAS: 

1.	SISTEMA DE AUTENTICACIÓN Y ROLES DE USUARIO

Crea una pantalla de inicio de sesión (Login) con correo y contraseña. Restringe los accesos, pantallas y acciones según el rol asignado. Muestra el usuario activo y un botón de "Cerrar Sesión" en la esquina superior: 

•	Rol 1: INGENIERO DE CAMPO 

o	Accesos permitidos: Listado de proyectos y partidas asignadas. 

o	Acciones exclusivas: Registrar y modificar únicamente el "% de Avance Físico Actual" por partida. 

o	Restricción: Bloquear por completo el acceso a datos económicos, costos, tareos, gastos, ventas y utilidades. No puede ver dinero. 

•	Rol 2: ADMINISTRADOR DE OFICINA 

o	Accesos permitidos: Gestión de Personal, Tareo Diario, Control de Gastos Directos, Gastos Generales y Control de Ventas/Valorizaciones. 

o	Restricción: No puede modificar el % de avance físico de las partidas (labor del Ingeniero). No tiene acceso al Dashboard financiero consolidado global del Gerente. 

•	Rol 3: GERENTE / DUEÑO 

o	Accesos permitidos: Control Total y visualización de todas las pantallas, configuraciones y el Dashboard Financiero Consolidado Global. 

2.	GESTIÓN DE PERSONAL Y TAREO DIARIO (ADMINISTRADOR) 

•	Registro de Personal: Formulario único y global para ingresar trabajadores (Nombre, Rol [Operario, Oficial, Peón] y costo por JORNAL DIARIO fijo siempre en Soles). Este registro es aplicable a todos los proyectos de la empresa. No utilices cálculos por hora. 

•	Panel de Tareo Diario: Permite al administrador registrar asistencia. Debe incluir selector de Fecha o múltiples fechas, selector de Trabajador, selector de Proyecto y selector de Partida. Opciones de asistencia: Día Completo (1) o Medio Día (0.5). El sistema calcula el costo diario automáticamente: Asistencia * Jornal Diario en Soles. 

•	Vista de Consolidado Mensual: Tabla que muestra el resumen mensual por trabajador. Debe permitir filtrar mes a mes para visualizar el total de días laborados y el costo acumulado de mano de obra en Soles. 

3.	ESTRUCTURA Y ORDENAMIENTO DE PARTIDAS 

•	Al crear o listar las partidas de un proyecto, añade un campo obligatorio llamado "Tipo de Instalación o Especialidad" (ejemplo: MONTAJE DE TABLEROS, TENDIDO DE CABLES, OBRAS CIVILES, MONTAJE DE EQUIPOS, etc.). 

•	Las partidas dentro del sistema deben mostrarse ordenadas y filtradas obligatoriamente bajo estas agrupaciones técnicas. 

4.	CONTROL DE AVANCE FÍSICO POR PARTIDA (INGENIERO) 

•	Panel donde el ingeniero registra periódicamente el % de Avance Físico Actual (valor manual de 0 a 100%) para cada partida de la obra. 

•	Cada partida registra internamente: Presupuesto Inicial (Soles), % de Avance Físico, y Costo Real Acumulado (calculado automáticamente sumando el Tareo y los Gastos Directos vinculados a esa partida). 

5.	CONTROL DE GASTOS DIRECTOS Y GASTOS GENERALES (ADMINISTRADOR) 

•	Gastos Directos (Compras): Formulario vinculado obligatoriamente a una partida de un proyecto. Campos: Descripción, Proveedor, Monto Presupuestado, Moneda (Soles o dólares) y Tipo de Cambio. 

•	Gastos Generales (Compras Indirectas): Formulario de costos administrativos u oficina NO vinculado a ninguna partida. Campos: Descripción, Proveedor, Monto Gastado, Moneda (Soles o dólares) y Tipo de Cambio. 

•	Lógica Bimoneda: Para ambos formularios, si el gasto se ingresa en Dólares, el sistema exige ingresar manualmente el Tipo de Cambio de ese momento y calcula automáticamente el equivalente en Soles para la base de datos. Si se ingresa en Soles, mantiene el monto original. 

6.	CONTROL DE VENTAS E INGRESOS / VALORIZACIONES (ADMINISTRADOR) 

•	Formulario para registrar valorizaciones cobradas al cliente por proyecto. 

•	Campos: Concepto, Monto Valorizado, Moneda (Soles o Dólares), Tipo de Cambio, Número de Factura Emitida, Fecha de Pago y Estado ("Pagado" o "Pendiente de Pago"). 

•	Lógica Bimoneda: Si la venta es en Dólares, calcula el equivalente en Soles usando el Tipo de Cambio ingresado manualmente. 

7.	DASHBOARD FINANCIERO Y GRÁFICOS (GERENTE) 

•	Filtros: Selector de un "Proyecto Específico" o "Consolidado Global" (suma de todos los proyectos en ejecución y finalizados). 

•	KPIs Principales en tarjetas superiores: Total Ventas (Soles), Total Gastos (Suma de Compras Directas + Tareo + Gastos Generales en Soles) y Margen de Utilidad Actual (Ventas - Gastos). 

•	Gráfico de Rendimiento por Partida (solo para proyectos específicos): 

o	Muestra dos barras comparativas por partida: una para el "% de Avance Físico" y otra para el "% de Presupuesto Gastado" (Costo Real / Presupuesto Inicial). 

o	Alerta de Color Estricta: Si el "% de Presupuesto Gastado" es MAYOR al "% de Avance Físico", la barra de gasto debe pintarse de COLOR ROJO. Si es menor o igual, se pinta de COLOR VERDE. 

o	Al lado derecho del gráfico, muestra la diferencia monetaria (Presupuesto - Gasto Real). Si el costo real supera al presupuestado, el texto de la diferencia debe mostrarse en LETRAS DE COLOR ROJO. 

8.	MÓDULO DE EXPORTACIÓN DE REPORTES

Añade dos botones visibles en la parte superior derecha de las pantallas principales: 

•	Botón "Exportar a Excel": Genera y descarga un archivo .xlsx con las tablas de datos limpias (Tareo mensual, Gastos bimoneda con tipo de cambio e Ingresos). 

•	Botón "Exportar a PDF": Descarga una plantilla de reporte ejecutivo optimizada para impresión que incluya los KPIs del proyecto y el gráfico de barras respetando los colores de alerta (Rojo/Verde).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cdd2d0c6-4a6e-5040-93d4-4af29402038f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
