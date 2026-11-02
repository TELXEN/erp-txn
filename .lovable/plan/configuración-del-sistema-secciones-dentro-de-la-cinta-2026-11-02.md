# Configuración del Sistema: secciones dentro de la cinta

## Qué verá el usuario
1. **Sin fila de botones debajo de la cinta.** Las cinco secciones (Datos de la empresa, Tipografía de documentos, Usuarios y Roles, Valores normativos, Integraciones) pasan a la cinta verde, en la pestaña propia de la pantalla «Configuración del Sistema», dentro de un grupo llamado «Secciones». La sección activa se ve resaltada en verde, como un botón presionado de Office.
   - Además, el botón «Configuración del Sistema» de la pestaña Datos tendrá una flechita que abre un menú con las mismas cinco opciones, para entrar directo a cualquiera de ellas.
   - Valores normativos e Integraciones siguen apareciendo solo para Gerencia y Administración.
2. **Lienzo limpio.** Lo primero en la zona blanca es el título «Configuración del Sistema» con su subtítulo. Debajo, para Datos de la empresa, las sub-pestañas «Datos generales · Cuentas bancarias · Régimen laboral de la empresa» solo en texto, sin iconos, con una línea verde debajo de la activa. El contenido empieza justo después.
3. **Con el menú lateral** (sin cinta) las secciones se muestran como hoy, para no dejar esa vista sin navegación.

## Detalles técnicos
- La sección elegida pasa a la dirección como `?seccion=empresa|tipografia|usuarios|normativa|integraciones` (validada con validateSearch), para que el menú desplegable de la cinta pueda abrir una sección concreta y F5 la conserve.
- `configuracion-sistema.tsx`: los botones se renderizan con `GrupoCinta titulo="Secciones"` a través del portal de acciones existente (ranura contextual); en modo lateral se mantiene `Pestanas variante="boton"`.
- `CintaOpciones.tsx`: el ítem de Configuración del Sistema admite un submenú (lista flotante con portal, cierra al elegir o al hacer clic fuera) que navega con `seccion`.
- `DatosEmpresaTabs.tsx`: quitar los iconos de las opciones; se conserva `variante="texto"` (línea inferior en color de acción del tema, verde en Excel).
- Verificación con Playwright en cinta clásica y simplificada y en menú lateral.
