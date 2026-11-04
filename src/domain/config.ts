/**
 * Umbrales, catálogos y franjas, todos en un sitio y documentados. Lo que se
 * cambia aquí se refleja en docs/datos/reglas-conflictos.md y, si cambia una
 * regla de negocio, lleva su ADR.
 */

import type { Minutes, Role, Site } from './types.ts';

// ---------------------------------------------------------------------------
// Tiempo
// ---------------------------------------------------------------------------

/** Minutos en un día. Un turno que cruza medianoche suma esto a su fin. */
export const MINUTOS_POR_DIA = 1440;

/** Zona de la operación. No tiene horario de verano (ADR-0008). */
export const ZONA = 'America/El_Salvador';

// ---------------------------------------------------------------------------
// Categoría de color de un turno, por su hora de entrada (plan §5.3)
// ---------------------------------------------------------------------------

/** Antes de esta hora, el turno es de mañana/día. */
export const CATEGORIA_TARDE_DESDE: Minutes = 12 * 60;
/** Antes de esta hora es de tarde; a partir de aquí, de noche. */
export const CATEGORIA_NOCHE_DESDE: Minutes = 17 * 60;

// ---------------------------------------------------------------------------
// Franjas del panel. Son otra cosa que la categoría de color: solo cuentan.
// ---------------------------------------------------------------------------

export const FRANJA_DIA_DESDE: Minutes = 8 * 60;
export const FRANJA_TARDE_DESDE: Minutes = 12 * 60;
export const FRANJA_NOCHE_DESDE: Minutes = 17 * 60;

// ---------------------------------------------------------------------------
// Umbrales de las reglas de conflicto
//
// ⚠️ PENDIENTES DE CONFIRMAR por jefatura: ver docs/progreso.md, bloqueo 2.
// Son parámetros, no estructura: cambiarlos no exige migrar nada.
// ---------------------------------------------------------------------------

/** Descanso mínimo entre dos turnos de la misma persona. Por debajo: alta. */
export const DESCANSO_MIN_H = 8;
/** Hasta aquí se avisa como «descanso justo» (severidad baja). */
export const DESCANSO_AVISO_H = 9;
/** Días seguidos con turno a partir de los cuales se avisa. */
export const RACHA_MAX = 7;
/** Un hueco de cobertura por debajo de esto no se reporta. */
export const HUECO_MIN: Minutes = 60;
/** Un turno más largo que esto genera aviso al editar un día. */
export const TURNO_LARGO_H = 12;

/** Sedes que exigen un supervisor en turno, y el departamento que lo cubre. */
export const SEDES_CON_SUPERVISION: ReadonlyMap<Site, string> = new Map([
  ['Megacentro', 'SUP MEGA'],
  ['Tuscania', 'SUP CC'],
]);

/** No se ofrece para cubrir otras sedes: atiende tercerías. */
export const SUPERVISOR_EXCLUIDO_DE_COBERTURA = 'Supervisor Tercerias';

// ---------------------------------------------------------------------------
// Lectura de la hoja
// ---------------------------------------------------------------------------

/** Pestañas que nunca son un mes. */
export const PESTANAS_IGNORADAS: readonly string[] = ['CONTACTOS'];

/** Prefijo que marca una pestaña de trabajo interno. */
export const PREFIJO_PESTANA_IGNORADA = '_';

/** Columna A: departamento. Columna B: nombre. Los días empiezan en la C. */
export const COL_DEPARTAMENTO = 0;
export const COL_NOMBRE = 1;
/** Fila 1: nombre del día (se ignora). Fila 2: las fechas. Fila 3+: personas. */
export const FILA_FECHAS = 1;
export const PRIMERA_FILA_PERSONA = 2;

// ---------------------------------------------------------------------------
// Nombres
// ---------------------------------------------------------------------------

/**
 * Partículas que se agrupan con la palabra siguiente al separar apellidos de
 * nombres. Se escriben en minúscula al mostrar, salvo al principio.
 */
export const PARTICULAS: readonly string[] = ['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y'];

/**
 * Nombres de pila frecuentes en la operación. Solo se usan para detectar que
 * un nombre en mayúsculas probablemente ya viene en orden nombre-apellido: si
 * el primer grupo está aquí y el último no, se marca `needsReview` en lugar de
 * invertirlo a ciegas (plan §5.5, punto 4).
 *
 * No es una lista de identidades: son nombres de pila comunes en español.
 */
export const NOMBRES_COMUNES: ReadonlySet<string> = new Set([
  'ADRIANA', 'ALEJANDRA', 'ALEJANDRO', 'ALEXANDER', 'ALFREDO', 'ANA', 'ANDREA',
  'ANDRES', 'ANGEL', 'ANGELA', 'ANTONIO', 'ARIEL', 'ARTURO', 'BEATRIZ',
  'BLANCA', 'BRENDA', 'BRYAN', 'CAMILA', 'CARLA', 'CARLOS', 'CARMEN', 'CECILIA',
  'CESAR', 'CLAUDIA', 'CRISTIAN', 'CRISTINA', 'DANIEL', 'DANIELA', 'DAVID',
  'DIANA', 'DIEGO', 'EDGAR', 'EDUARDO', 'ELENA', 'ELIAS', 'EMILIO', 'ENRIQUE',
  'ERICK', 'ERNESTO', 'ESTEBAN', 'FABIOLA', 'FATIMA', 'FEDERICO', 'FERNANDA',
  'FERNANDO', 'FRANCISCO', 'GABRIEL', 'GABRIELA', 'GERARDO', 'GLORIA',
  'GUILLERMO', 'GUSTAVO', 'HECTOR', 'HENRY', 'HUGO', 'IRENE', 'ISABEL',
  'ISMAEL', 'IVAN', 'JAIME', 'JAVIER', 'JESSICA', 'JESUS', 'JORGE', 'JOSE',
  'JOSUE', 'JUAN', 'JULIA', 'JULIO', 'KARLA', 'KATHERINE', 'KEVIN', 'LAURA',
  'LEONEL', 'LETICIA', 'LILIANA', 'LORENA', 'LUCIA', 'LUIS', 'MANUEL',
  'MARCELA', 'MARCO', 'MARGARITA', 'MARIA', 'MARIO', 'MARLON', 'MARTA',
  'MARTIN', 'MAURICIO', 'MELVIN', 'MIGUEL', 'MIRNA', 'MOISES', 'MONICA',
  'NELSON', 'NESTOR', 'NOE', 'NORMA', 'OSCAR', 'PABLO', 'PATRICIA', 'PEDRO',
  'RAFAEL', 'RAQUEL', 'RAUL', 'REINA', 'RENE', 'RICARDO', 'ROBERTO', 'RODRIGO',
  'ROSA', 'ROXANA', 'RUBEN', 'SALVADOR', 'SAMUEL', 'SANDRA', 'SARA', 'SERGIO',
  'SILVIA', 'SOFIA', 'SONIA', 'STEFANY', 'SUSANA', 'TATIANA', 'TERESA',
  'VANESSA', 'VERONICA', 'VICTOR', 'VIOLETA', 'WALTER', 'WENDY', 'WILLIAM',
  'XIOMARA', 'YESENIA', 'YOLANDA', 'ZOILA',
]);

// ---------------------------------------------------------------------------
// Catálogo de departamentos (plan §5.4, ADR-0009)
//
// Vive en código y en git a propósito: un departamento nuevo entra por PR, se
// revisa y se prueba. Documentado en docs/datos/catalogo-departamentos.md.
// ---------------------------------------------------------------------------

export interface EntradaCatalogo {
  readonly role: Role;
  readonly site: Site;
  readonly area: string | null;
}

/** Clave: el departamento normalizado (sin tildes, mayúsculas, un espacio). */
export const CATALOGO: ReadonlyMap<string, EntradaCatalogo> = new Map([
  ['COORDINADOR OPERACIONES', { role: 'Coordinador', site: 'Sin sede', area: 'Operación' }],
  ['ACTIVO FIJO', { role: 'Activo Fijo', site: 'Activo Fijo', area: null }],
  ['SUP MEGA', { role: 'Supervisor', site: 'Megacentro', area: null }],
  ['SUP CC', { role: 'Supervisor', site: 'Tuscania', area: null }],
  ['ATENCION GESTION SALAS', { role: 'Soporte de Salas', site: 'Sin sede', area: null }],
  ['MEGA N1', { role: 'N1', site: 'Megacentro', area: null }],
  ['MEGA N2', { role: 'N2', site: 'Megacentro', area: null }],
  ['CC N1', { role: 'N1', site: 'Tuscania', area: null }],
  ['CC N2', { role: 'N2', site: 'Tuscania', area: null }],
  ['PHOENIX N1', { role: 'N1', site: 'Phoenix Tower', area: null }],
  ['PHOENIX N2', { role: 'N2', site: 'Phoenix Tower', area: null }],
  ['AT N1', { role: 'N1', site: 'Atento', area: null }],
  ['COORDINADOR DE PRODUCTO', { role: 'Coordinador', site: 'Sin sede', area: 'Producto' }],
  ['SUPERVISOR TERCERIAS', { role: 'Supervisor', site: 'Sin sede', area: 'Tercería' }],
  ['ESPECIALISTAS DE PRODUCTO', { role: 'Producto', site: 'Sin sede', area: 'Producto' }],
  ['TERCERIAS', { role: 'Tercería', site: 'Sin sede', area: 'Tercería' }],
  ['ESPECIALISTAS DE REDES', { role: 'Redes', site: 'Sin sede', area: null }],
  ['AUXILIARES DE RED Y SOPORTE', { role: 'Redes', site: 'Sin sede', area: null }],
  ['COORDINADOR SANTA ANA', { role: 'Coordinador', site: 'Santa Ana', area: null }],
  ['N1 ST ANA', { role: 'N1', site: 'Santa Ana', area: null }],
  ['COORDINADORA SAN MIGUEL', { role: 'Coordinador', site: 'San Miguel', area: null }],
  ['N1 SAN MIGUEL', { role: 'N1', site: 'San Miguel', area: null }],
  ['AUXILIARES DE RED Y SOPORTE-SM', { role: 'Redes', site: 'San Miguel', area: null }],
  ['SOPORTE TECNOLOGICO Y SALAS', { role: 'Soporte de Salas', site: 'Sin sede', area: null }],
  ['QA', { role: 'QA', site: 'Sin sede', area: null }],
  ['ADMINISTRADOR DE REDES', { role: 'Redes', site: 'Sin sede', area: null }],
]);

/**
 * Departamentos mal escritos en la hoja original, con su forma correcta. Se
 * aceptan para que la carga no falle, pero generan aviso `departamento-mal-escrito`
 * y la propuesta de corregir la hoja con coordinación.
 */
export const ALIAS_DEPARTAMENTO: ReadonlyMap<string, string> = new Map([
  ['ADMINSITRADOR DE REDES', 'ADMINISTRADOR DE REDES'],
]);

/**
 * Reglas de respaldo de sede, por fragmento. **Se evalúan en orden**, así que
 * las más específicas van primero: `SANTA ANA` antes que `SAN`, y los nombres
 * completos de sede antes que sus abreviaturas.
 *
 * Los fragmentos se comparan como palabras, no como subcadenas: `AT` no
 * coincide dentro de `GESTION` ni `CC` dentro de `SOPORTE`. Los que empiezan
 * por guion (`-SM`) se buscan como sufijo pegado.
 */
export const REGLAS_SEDE: readonly { readonly fragmento: string; readonly site: Site }[] = [
  { fragmento: 'PHOENIX TOWER', site: 'Phoenix Tower' },
  { fragmento: 'ST ANA', site: 'Santa Ana' },
  { fragmento: 'SANTA ANA', site: 'Santa Ana' },
  { fragmento: 'SAN MIGUEL', site: 'San Miguel' },
  { fragmento: 'ACTIVO FIJO', site: 'Activo Fijo' },
  { fragmento: 'MEGACENTRO', site: 'Megacentro' },
  { fragmento: 'TUSCANIA', site: 'Tuscania' },
  { fragmento: 'ATENTO', site: 'Atento' },
  { fragmento: '-SM', site: 'San Miguel' },
  { fragmento: 'PHOENIX', site: 'Phoenix Tower' },
  { fragmento: 'MEGA', site: 'Megacentro' },
  { fragmento: 'CC', site: 'Tuscania' },
  { fragmento: 'AT', site: 'Atento' },
];

/** Reglas de respaldo de rol, por fragmento. Se evalúan en orden. */
export const REGLAS_ROL: readonly { readonly fragmento: string; readonly role: Role }[] = [
  { fragmento: 'COORDINADORA', role: 'Coordinador' },
  { fragmento: 'COORDINADOR', role: 'Coordinador' },
  { fragmento: 'SUP', role: 'Supervisor' },
  { fragmento: 'N1', role: 'N1' },
  { fragmento: 'N2', role: 'N2' },
];
