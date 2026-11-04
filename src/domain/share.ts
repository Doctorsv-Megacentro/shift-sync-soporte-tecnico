/**
 * Slug y vencimiento de un enlace de solo lectura. El alcance de la Fase 3
 * es solo «toda la operación»; `semana`, `dia`, `persona` y `cambio` quedan
 * para la Fase 7 (plan §7.6).
 */

/** Los cinco alcances del modelo (coincide con el check de `share_links`). */
export type ShareScope = 'operacion' | 'semana' | 'dia' | 'persona' | 'cambio';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * `prefijo-` + 12 caracteres aleatorios base62 con `crypto.getRandomValues`
 * (plan §7.6). El hash corto de los mockups no sirve en producción: con 12
 * caracteres hay de sobra para que adivinarlo no sea viable.
 */
export function generarSlug(prefijo: string): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const azar = Array.from(bytes, (b) => BASE62[b % BASE62.length]).join('');
  return `${prefijo}-${azar}`;
}

export type Vencimiento = '24h' | '7d' | 'fin-de-mes';

/**
 * La fecha de vencimiento para cada opción del plan §7.6, a partir de
 * `ahora`. «Fin de mes» es el primer instante del mes siguiente, en la hora
 * local de quien crea el enlace (jefatura, que trabaja en
 * `America/El_Salvador`): a diferencia de los días del horario, esto sí es
 * un instante real, no un día de negocio (ADR-0008 no aplica aquí).
 */
export function calcularVencimiento(opcion: Vencimiento, ahora: Date = new Date()): Date {
  switch (opcion) {
    case '24h':
      return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'fin-de-mes':
      return new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, 0, 0, 0, 0);
  }
}

/** ¿Sigue vigente un enlace, dado su vencimiento y si lo revocaron? */
export function enlaceVigente(expiresAt: string, revokedAt: string | null, ahora: Date = new Date()): boolean {
  if (revokedAt !== null) return false;
  return new Date(expiresAt).getTime() > ahora.getTime();
}
