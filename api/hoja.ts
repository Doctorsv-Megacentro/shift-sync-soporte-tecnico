/**
 * Descarga el .xlsx exportado de una Google Sheet, solo para jefatura.
 * ADR-0005 (**Propuesto**): nunca acepta una URL libre, solo un ID, para
 * evitar SSRF. Ficha: docs/features/fuente.md. Documentado también en
 * docs/arquitectura/seguridad.md.
 */

import { createClient } from '@supabase/supabase-js';

/** Lo mínimo de la petición y la respuesta que esta función necesita. */
interface PeticionMinima {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface RespuestaMinima {
  status(code: number): RespuestaMinima;
  json(body: unknown): void;
  send(body: Buffer): void;
  setHeader(nombre: string, valor: string): void;
}

/** El ID de una Google Sheet: 25+ caracteres de base64url. */
const RE_ID_HOJA = /^[a-zA-Z0-9_-]{25,}$/;

/** Tope de tamaño y de tiempo, los mismos que aplica `src/data/excel.ts`. */
const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

function cliente(authorization: string | undefined) {
  const url = process.env['SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: authorization ? { Authorization: authorization } : {} },
  });
}

export default async function handler(req: PeticionMinima, res: RespuestaMinima): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METODO_NO_PERMITIDO' });
    return;
  }

  const authorization = Array.isArray(req.headers['authorization'])
    ? req.headers['authorization'][0]
    : req.headers['authorization'];

  if (!authorization) {
    res.status(401).json({ error: 'SIN_SESION' });
    return;
  }

  const supabase = cliente(authorization);
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: usuario, error: errorUsuario } = await supabase.auth.getUser(token);
  if (errorUsuario || !usuario.user) {
    res.status(401).json({ error: 'SIN_SESION' });
    return;
  }

  const { data: esAdmin } = await supabase.rpc('is_admin');
  if (esAdmin !== true) {
    res.status(403).json({ error: 'ADMIN_REQUERIDO' });
    return;
  }

  const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const id = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { id?: unknown }).id : undefined;

  if (typeof id !== 'string' || !RE_ID_HOJA.test(id)) {
    res.status(400).json({ error: 'ID_INVALIDO' });
    return;
  }

  // Se arma la URL a mano a partir del ID validado. Nunca se acepta una URL
  // del cliente: así no se puede usar esta función para pedir cualquier
  // otra cosa (SSRF).
  const urlExportacion = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;

  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(urlExportacion, { signal: controlador.signal, redirect: 'follow' });
  } catch {
    res.status(502).json({ error: 'HOJA_INACCESIBLE' });
    return;
  } finally {
    clearTimeout(corte);
  }

  const tipo = respuesta.headers.get('content-type') ?? '';
  // Una hoja privada hace que Google devuelva su página de inicio de sesión
  // en vez del .xlsx: se detecta por el tipo de contenido, no por el código
  // de estado (responde 200 igualmente).
  const pareceHojaDeCalculo = tipo.includes('spreadsheet') || tipo.includes('officedocument');
  if (!respuesta.ok || !pareceHojaDeCalculo) {
    res.status(403).json({ error: 'HOJA_PRIVADA' });
    return;
  }

  const tamano = Number(respuesta.headers.get('content-length') ?? '0');
  if (tamano > MAX_BYTES) {
    res.status(413).json({ error: 'HOJA_DEMASIADO_GRANDE' });
    return;
  }

  const bytes = await respuesta.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    res.status(413).json({ error: 'HOJA_DEMASIADO_GRANDE' });
    return;
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.status(200).send(Buffer.from(bytes));
}
