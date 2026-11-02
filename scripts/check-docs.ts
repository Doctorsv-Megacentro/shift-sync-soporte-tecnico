/**
 * Valida la documentación obligatoria del plan §9.3. Falla con código 1 y una
 * lista de problemas concretos. Se ejecuta con `npm run docs:check`, en local y
 * en CI, y es parte de la Definición de terminado.
 *
 * Comprueba tres cosas:
 *   1. Todo .md de docs/ está enlazado desde docs/00-indice.md.
 *   2. Cada carpeta de src/features/ tiene su ficha en docs/features/.
 *   3. Cada archivo de src/domain/ y src/features/ empieza con un comentario
 *      de cabecera (plan §4, «Convenciones»).
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = process.cwd();
const INDICE = join(RAIZ, 'docs', '00-indice.md');

const problemas: string[] = [];

/** Rutas de archivos bajo `dir` que cumplen `filtro`, recursivamente. */
function listar(dir: string, filtro: (ruta: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...listar(ruta, filtro));
    else if (filtro(ruta)) salida.push(ruta);
  }
  return salida;
}

/** Normaliza a separador `/` para comparar y mostrar igual en Windows y Linux. */
const aPosix = (ruta: string): string => relative(RAIZ, ruta).split(sep).join('/');

// ---------------------------------------------------------------------------
// 1. Todo .md de docs/ está enlazado desde el índice
// ---------------------------------------------------------------------------

if (!existsSync(INDICE)) {
  problemas.push('Falta docs/00-indice.md, que es el índice obligatorio (plan §9.1).');
} else {
  const indice = readFileSync(INDICE, 'utf8');
  const docs = listar(join(RAIZ, 'docs'), (r) => r.endsWith('.md'));

  for (const doc of docs) {
    const rel = aPosix(doc);
    if (rel === 'docs/00-indice.md') continue;
    // El índice enlaza con rutas relativas a docs/ (ej. «adr/0001-….md»).
    const desdeIndice = rel.slice('docs/'.length);
    if (!indice.includes(desdeIndice)) {
      problemas.push(`docs/00-indice.md no enlaza ${rel} (plan §9.3).`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Cada carpeta de src/features/ tiene su ficha
// ---------------------------------------------------------------------------

const dirFeatures = join(RAIZ, 'src', 'features');
if (existsSync(dirFeatures)) {
  for (const feature of readdirSync(dirFeatures)) {
    if (!statSync(join(dirFeatures, feature)).isDirectory()) continue;
    if (!existsSync(join(RAIZ, 'docs', 'features', `${feature}.md`))) {
      problemas.push(
        `src/features/${feature}/ no tiene ficha en docs/features/${feature}.md (plan §9.3).`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Comentario de cabecera en src/domain y src/features
// ---------------------------------------------------------------------------

const conCabecera = [join(RAIZ, 'src', 'domain'), join(RAIZ, 'src', 'features')];
for (const dir of conCabecera) {
  for (const archivo of listar(dir, (r) => r.endsWith('.ts') || r.endsWith('.tsx'))) {
    const primeras = readFileSync(archivo, 'utf8').trimStart().slice(0, 400);
    if (!primeras.startsWith('/**') && !primeras.startsWith('//')) {
      problemas.push(
        `${aPosix(archivo)} no empieza con el comentario de cabecera que pide el plan §4.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

if (problemas.length > 0) {
  console.error(`docs:check encontró ${problemas.length} problema(s):\n`);
  for (const p of problemas) console.error(`  · ${p}`);
  console.error('\nVer la Definición de terminado en CLAUDE.md y el plan §9.3.');
  process.exit(1);
}

console.log('docs:check OK — índice completo, fichas presentes y cabeceras en su sitio.');
