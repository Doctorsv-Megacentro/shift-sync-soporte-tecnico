/**
 * Convierte el Excel real de la operación en un fixture anonimizado que SÍ se
 * puede commitear (ADR-0011).
 *
 * Reemplaza cada nombre por uno ficticio **de forma consistente entre
 * pestañas**, conservando lo que al parser le importa: si venía en mayúsculas,
 * si traía coma, y el sufijo `(d/m)` de la fecha de ingreso. Todo lo demás de
 * la hoja (turnos, departamentos, fechas, pestañas ocultas, columnas de
 * fórmula) queda intacto.
 *
 * Uso:
 *   npm run anonimizar                       # usa el primer .xlsx de privado/
 *   npx tsx scripts/anonimizar-excel.ts <entrada> [salida]
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as XLSX from 'xlsx';
import { COL_NOMBRE, PRIMERA_FILA_PERSONA } from '../src/domain/config.ts';
import { normalize } from '../src/domain/text.ts';

const DIR_PRIVADO = 'referencias/privado';
const SALIDA_POR_DEFECTO = 'tests/fixtures/horario-anon.xlsx';

/**
 * Vocabulario ficticio. No corresponde a nadie real, y el generador descarta
 * además cualquier palabra que aparezca en los nombres del Excel de origen,
 * así que el fixture queda disjunto del original (ADR-0011).
 *
 * Las listas son largas a propósito: tras el filtrado debe quedar variedad.
 */
const NOMBRES = [
  'Ane', 'Bastian', 'Ciro', 'Dunia', 'Eneko', 'Fabia', 'Galo', 'Haydee',
  'Ibai', 'Jimena', 'Kaori', 'Liorna', 'Maya', 'Nilo', 'Oriana', 'Perla',
  'Quela', 'Rilke', 'Saray', 'Timo', 'Ursula', 'Valen', 'Wanda', 'Xela',
  'Yago', 'Zaira', 'Amaru', 'Belen', 'Cintia', 'Dorian', 'Elio', 'Fanny',
  'Gunter', 'Hilda', 'Indira', 'Joaquin', 'Kenia', 'Lidia', 'Mirko', 'Noelia',
];

const SEGUNDOS = [
  'Abril', 'Belmonte', 'Cielo', 'Duna', 'Esther', 'Fiore', 'Guri', 'Hazel',
  'Ivo', 'Juno', '', '', '',
];

const APELLIDOS = [
  'Quiroga', 'Narvaez', 'Oyarzun', 'Pizarnik', 'Reinoso', 'Sandoval',
  'Trigoso', 'Ugarte', 'Verdugo', 'Wenceslao', 'Yupanqui', 'Zubieta',
  'Alcantara', 'Berrocal', 'Candelaria', 'Dondero', 'Elizalde', 'Ferrater',
  'Gorriti', 'Hinostroza', 'Ibarbourou', 'Jarama', 'Kuntur', 'Lezama',
  'Marrero', 'Nicolaide', 'Olavarria', 'Pumarejo', 'Quilmes', 'Ribadeneira',
  'Sotomonte', 'Tamariz', 'Urquiola', 'Villaurrutia', 'Zarraluqui',
  'Ancizar', 'Bermudez', 'Cipriano', 'Dieguez', 'Esquivel',
];

/**
 * Palabras de los nombres reales, para poder **excluirlas** del vocabulario
 * ficticio. Sin esto el fixture acaba conteniendo apellidos que sí existen en
 * la operación: no serían de la misma persona, pero el parecido es suficiente
 * para no quererlo en un repositorio.
 */
function vocabularioReal(wb: XLSX.WorkBook): Set<string> {
  const tokens = new Set<string>();
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (ws === undefined) continue;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    for (const row of rows.slice(PRIMERA_FILA_PERSONA)) {
      const valor = row[COL_NOMBRE];
      if (typeof valor !== 'string') continue;
      for (const token of normalize(valor.replace(/[(),0-9/]/g, ' ')).split(' ')) {
        if (token.length >= 3) tokens.add(token);
      }
    }
  }
  return tokens;
}

/**
 * Generador determinista: el mismo Excel da siempre el mismo fixture. Solo usa
 * palabras que **no aparecen** en los nombres reales.
 */
function crearGenerador(
  prohibidas: ReadonlySet<string>,
): (clave: string) => { nombres: string; apellidos: string } {
  const libre = (lista: readonly string[]) =>
    lista.filter((p) => p === '' || !prohibidas.has(normalize(p)));

  const nombres = libre(NOMBRES);
  const segundos = libre(SEGUNDOS);
  const apellidos = libre(APELLIDOS);

  if (nombres.length < 5 || apellidos.length < 10) {
    throw new Error(
      `El vocabulario ficticio choca demasiado con los nombres reales ` +
        `(quedan ${nombres.length} nombres y ${apellidos.length} apellidos). ` +
        `Añade más opciones en scripts/anonimizar-excel.ts.`,
    );
  }

  let n = 0;
  const asignados = new Map<string, { nombres: string; apellidos: string }>();
  const yaUsados = new Set<string>();

  return (clave: string) => {
    const existente = asignados.get(clave);
    if (existente !== undefined) return existente;

    // Los índices avanzan en radios distintos, así que las combinaciones no se
    // repiten hasta agotar nombres × apellidos. Si todos los índices usaran
    // `n % longitud`, el ciclo sería corto y dos personas distintas acabarían
    // con el mismo nombre, fusionándose al leer la hoja.
    const iNombre = n % nombres.length;
    const iAp1 = Math.floor(n / nombres.length) % apellidos.length;
    const iAp2 = (iAp1 + 1 + Math.floor(n / (nombres.length * apellidos.length))) % apellidos.length;
    const iSegundo = Math.floor(n / (nombres.length * apellidos.length)) % segundos.length;
    n++;

    const nombre = nombres[iNombre] ?? 'Ane';
    const segundo = segundos[iSegundo] ?? '';
    const ap1 = apellidos[iAp1] ?? 'Quiroga';
    const ap2 = apellidos[iAp2] ?? 'Narvaez';

    const nuevo = {
      nombres: segundo === '' ? nombre : `${nombre} ${segundo}`,
      apellidos: ap1 === ap2 ? `${ap1} Oyarzun` : `${ap1} ${ap2}`,
    };

    // Red de seguridad: dos personas reales nunca deben compartir nombre
    // ficticio, porque al leer la hoja se fusionarían en una sola.
    const completo = `${nuevo.nombres} ${nuevo.apellidos}`;
    if (yaUsados.has(completo)) {
      throw new Error(
        `El generador repitió el nombre «${completo}». Amplía las listas de ` +
          `scripts/anonimizar-excel.ts: hacen falta más combinaciones.`,
      );
    }
    yaUsados.add(completo);

    asignados.set(clave, nuevo);
    return nuevo;
  };
}

/**
 * Clave con la que se reconoce a la misma persona entre pestañas. Es la misma
 * idea que `names.ts`: tokens normalizados y ordenados, sin el sufijo `(d/m)`.
 */
function claveDePersona(raw: string): string {
  return normalize(raw.replace(/\s*\(\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)\s*$/, '').replace(/,/g, ' '))
    .split(' ')
    .filter((t) => t !== '')
    .sort()
    .join(' ');
}

/** Sustituye un nombre conservando su formato original. */
function anonimizarNombre(
  raw: string,
  generar: (clave: string) => { nombres: string; apellidos: string },
): string {
  const sufijo = /\s*(\(\s*\d{1,2}\s*\/\s*\d{1,2}\s*\))\s*$/.exec(raw);
  const sinSufijo = sufijo ? raw.replace(/\s*\(\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)\s*$/, '').trim() : raw.trim();

  const { nombres, apellidos } = generar(claveDePersona(raw));

  // Se conserva la forma en la que venía, porque es justo lo que el parser lee.
  let salida: string;
  if (sinSufijo.includes(',')) {
    salida = `${apellidos}, ${nombres}`;
  } else if (sinSufijo === sinSufijo.toLocaleUpperCase('es')) {
    salida = `${apellidos} ${nombres}`.toLocaleUpperCase('es');
  } else {
    salida = `${nombres} ${apellidos}`;
  }

  return sufijo ? `${salida} ${sufijo[1]}` : salida;
}

function elegirEntrada(): string {
  if (!existsSync(DIR_PRIVADO)) {
    throw new Error(
      `No existe ${DIR_PRIVADO}/. Pon ahí el Excel real de la operación (está en .gitignore).`,
    );
  }
  const candidatos = readdirSync(DIR_PRIVADO).filter(
    (f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'),
  );
  const primero = candidatos[0];
  if (primero === undefined) {
    throw new Error(`No hay ningún .xlsx en ${DIR_PRIVADO}/.`);
  }
  if (candidatos.length > 1) {
    console.warn(`Hay ${candidatos.length} archivos. Se usa «${primero}».`);
  }
  return join(DIR_PRIVADO, primero);
}

function main(): void {
  const entrada = process.argv[2] ?? elegirEntrada();
  const salida = process.argv[3] ?? SALIDA_POR_DEFECTO;

  console.log(`Leyendo  ${entrada}`);
  // `cellStyles` conserva el formato; las fechas se dejan como seriales.
  const wb = XLSX.read(readFileSync(entrada), { type: 'buffer', cellDates: false, cellStyles: true });

  const generar = crearGenerador(vocabularioReal(wb));
  let sustituidos = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (ws === undefined || ws['!ref'] === undefined) continue;
    const rango = XLSX.utils.decode_range(ws['!ref']);

    for (let fila = PRIMERA_FILA_PERSONA; fila <= rango.e.r; fila++) {
      const direccion = XLSX.utils.encode_cell({ r: fila, c: COL_NOMBRE });
      const celda = ws[direccion] as XLSX.CellObject | undefined;
      if (celda === undefined || celda.t !== 's') continue;
      const raw = String(celda.v ?? '').trim();
      if (raw === '') continue;

      const nuevo = anonimizarNombre(raw, generar);
      celda.v = nuevo;
      // Si la celda tenía texto con formato enriquecido, se descarta: ahí
      // también habría nombres reales.
      delete celda.w;
      delete celda.r;
      delete celda.h;
      sustituidos++;
    }
  }

  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer);

  console.log(`Escrito  ${salida}`);
  console.log(`         ${sustituidos} celdas de nombre sustituidas`);
  console.log(`         ${wb.SheetNames.length} pestañas conservadas: ${wb.SheetNames.join(', ')}`);
  console.log('\nRevisa el resultado antes de commitearlo: no debe quedar ningún nombre real.');
}

main();
