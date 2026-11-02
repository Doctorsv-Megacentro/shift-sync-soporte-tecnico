# Próximamente

Funciones que se **muestran** en la interfaz con la etiqueta «Próximamente» o «Pronto», visibles y
deshabilitadas, **sin comportamiento falso**. Fuente: plan §7.7.

La regla: si algo no está en el MVP, se enseña apagado en lugar de esconderlo. Así jefatura y
empleados ven hacia dónde va el producto y nadie pulsa algo que no hace nada.

| Dónde | Función | De dónde viene la idea |
|---|---|---|
| Empleado | Pasar a Google Calendar | `mockups/v1/Main.dc.html` |
| Empleado | Avisos para marcar (entrada 30/15/5 min antes; salida a la hora, +5, +10) | `mockups/v1/Main.dc.html` |
| Empleado | Cronómetro de horas | `mockups/v1/Main.dc.html` |
| Empleado | Vista de mes | `mockups/v1/Main.dc.html` |
| Jefatura (menú) | Reportes de horas | `GridOps.dc.html` |
| Jefatura (menú) | Exportar a Excel | `GridOps.dc.html` |
| Jefatura (menú) | Notificaciones push | `GridOps.dc.html` |
| Jefatura (menú) | Google Calendar | `GridOps.dc.html` |
| Fuente de datos | Leer la Sheet con mi cuenta de Google | `Fuente.dc.html`, `mockups/v1/Login.dc.html` |
| Fuente de datos | Revisión automática cada 15 min / cada hora | `Fuente.dc.html` |
| Cambiar un día | Avisar a la persona por notificación | `GridOps.dc.html` |
| Compartir | Requerir correo de la empresa | `GridOps.dc.html` |

Las rutas de mockups son relativas a `referencias/diseno/mockups/`, que **no está en el repo**
([ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md)).

## Por qué cada una quedó fuera del MVP

- **Google Calendar y notificaciones push** piden permisos y una integración entera. Era el producto
  completo de v1 para un solo usuario; en v2 la prioridad es que 100 personas vean su horario.
- **Revisión automática de la hoja** necesita un cron (por ejemplo `pg_cron` de Supabase). Se decide
  en su propio ADR cuando llegue, porque afecta al presupuesto de $0.
- **Avisos para marcar y cronómetro** dependen de que la persona tenga la página abierta o conceda
  permisos de notificación. Son valiosos, pero no son el problema que el MVP resuelve.
- **Exportar a Excel y reportes de horas** son lectura derivada: primero hay que confiar en los
  datos de entrada.
- **Requerir correo de la empresa** cambia el modelo de acceso de los enlaces
  ([ADR-0006](../adr/0006-acceso-de-empleados-y-jefatura.md)) y pediría cuentas a todo el mundo.
