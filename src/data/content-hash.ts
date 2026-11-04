/**
 * Hash del contenido de un archivo, para que `publish_import` sepa si es
 * idéntico a la versión activa y no publique dos veces lo mismo (ADR-0010).
 */

/** SHA-256 de los bytes, en hexadecimal. Usa el Web Crypto del navegador. */
export async function hashContenido(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
