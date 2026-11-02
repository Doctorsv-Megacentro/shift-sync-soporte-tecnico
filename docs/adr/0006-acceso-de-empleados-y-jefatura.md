# 0006 — Jefatura con Google y lista permitida; empleados sin cuenta, por enlace

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0005](0005-acceso-a-google-sheet.md), plan §5.6, §7.6, §12

## Contexto

Son ~100 personas. El horario se usa para **apoyarse entre áreas**: ver quién está en turno es parte
del trabajo diario, y no hay restricción de visibilidad interna. Pedirle una cuenta a cada persona
frena la adopción justo donde más valor hay.

Jefatura, en cambio, escribe: carga el horario, cambia días y genera enlaces. Eso sí necesita
identidad.

## Decisión

- **Jefatura:** Google (Supabase Auth) **más** lista de correos permitidos en la tabla `admins`. La
  función `is_admin()` compara el correo del JWT contra esa tabla. Los correos se cargan por SQL
  siguiendo el runbook; **no van en el repo**.
- **Empleados:** sin cuenta. Entran por un enlace de solo lectura con **alcance**, **vencimiento** y
  **revocación**. La única vía de lectura de `anon` es la función `get_shared_view(slug)`.

## Alternativas consideradas

- **Cuentas para todos** — la opción segura, descartada por adopción: 100 altas y 100 contraseñas
  para consultar un horario que de todas formas es visible para el equipo.

## Consecuencias

- **Riesgo aceptado:** quien tenga el enlace ve la operación mientras no venza. Se mitiga con slug
  aleatorio largo (12 caracteres base62 de `crypto.getRandomValues`), vencimiento obligatorio
  (24 h, 7 días o fin de mes) y botón de revocar.
- `get_shared_view` devuelve motivo, nota y fecha de un cambio, pero **nunca quién lo hizo**.
- Todas las tablas tienen RLS activado y `anon` no lee ninguna directamente.
- Requerir correo de la empresa queda como **Próximamente**.

## Cómo verificarlo

Prueba de base de datos: `anon` no puede leer ninguna tabla directamente. Un enlace revocado o
vencido deja de funcionar y muestra «Este enlace ya no está activo. Pide uno nuevo a jefatura.».
Una prueba por alcance comprueba que el enlace solo muestra lo que debe (Fase 7).
