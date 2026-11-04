/**
 * Recuerda qué persona eligió el visitante de un enlace, por `localStorage`.
 * Envuelto en try/catch (plan §7.1): en navegación privada o con el
 * almacenamiento bloqueado, simplemente no persiste.
 */

const PREFIJO = 'shiftsync:persona:';

export function leerPersonaGuardada(slug: string): string | null {
  try {
    return localStorage.getItem(PREFIJO + slug);
  } catch {
    return null;
  }
}

export function guardarPersona(slug: string, personKey: string): void {
  try {
    localStorage.setItem(PREFIJO + slug, personKey);
  } catch {
    // Sin almacenamiento disponible: la elección solo dura esta sesión.
  }
}
