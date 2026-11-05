import { describe, expect, it } from 'vitest';
import { parsePersonName } from '../../src/domain/names.ts';

// Todos los nombres de estas pruebas son ficticios (ADR-0011).
const ANIO = 2026;
const leer = (raw: string) => parsePersonName(raw, ANIO);

describe('clave estable', () => {
  // Es lo que une a la misma persona entre meses y con sus cambios de jefatura.
  it('la misma persona escrita de dos formas da la misma clave', () => {
    const a = leer('MARTINEZ ROSALES ANA LUCIA');
    const b = leer('Ana Lucía Martínez Rosales (3/11)');
    expect(a.key).toBe(b.key);
    expect(a.key).toBe('ANA LUCIA MARTINEZ ROSALES');
  });

  it('ignora el orden, las tildes, las mayúsculas y las comas', () => {
    const esperada = 'ANA LUCIA MARTINEZ ROSALES';
    expect(leer('MARTINEZ ROSALES, ANA LUCIA').key).toBe(esperada);
    expect(leer('ana lucia martinez rosales').key).toBe(esperada);
    expect(leer('  ANA   LUCIA  MARTINEZ ROSALES ').key).toBe(esperada);
  });

  it('personas distintas dan claves distintas', () => {
    expect(leer('MARTINEZ ROSALES ANA LUCIA').key)
      .not.toBe(leer('MARTINEZ ROSALES ANA MARIA').key);
  });

  it('conserva las partículas, que son parte del nombre', () => {
    expect(leer('CRUZ DE MOLINA SOFIA ELENA').key).toBe('CRUZ DE ELENA MOLINA SOFIA');
  });
});

describe('fecha de ingreso en el nombre', () => {
  it('interpreta el sufijo (d/m) con el año de la pestaña', () => {
    const r = leer('Ana Lucía Martínez Rosales (3/11)');
    expect(r.joinedOn).toBe('2026-11-03');
    expect(r.hadDateSuffix).toBe(true);
  });

  it('el sufijo no entra en el nombre a mostrar ni en la clave', () => {
    const r = leer('Ana Lucía Martínez Rosales (3/11)');
    expect(r.displayName).not.toContain('(');
    expect(r.key).not.toContain('11');
  });

  it('tolera espacios dentro del sufijo', () => {
    expect(leer('Ana Martínez ( 3 / 11 )').joinedOn).toBe('2026-11-03');
  });

  it('sin sufijo no hay fecha de ingreso', () => {
    const r = leer('MARTINEZ ROSALES ANA LUCIA');
    expect(r.joinedOn).toBeNull();
    expect(r.hadDateSuffix).toBe(false);
  });

  it('un sufijo con una fecha imposible no inventa una fecha', () => {
    expect(leer('Ana Martínez (31/2)').joinedOn).toBeNull();
  });
});

describe('nombre a mostrar: siempre nombres + apellidos', () => {
  it('invierte APELLIDOS, NOMBRES', () => {
    const r = leer('MARTINEZ ROSALES, ANA LUCIA');
    expect(r.displayName).toBe('Ana Lucia Martinez Rosales');
    expect(r.hadComma).toBe(true);
    expect(r.needsReview).toBe(false);
  });

  it('reparte 4 grupos como 2 apellidos + 2 nombres', () => {
    expect(leer('MARTINEZ ROSALES ANA LUCIA').displayName).toBe('Ana Lucia Martinez Rosales');
  });

  it('reparte 3 grupos como 1 apellido + 2 nombres', () => {
    expect(leer('ROSALES ANA LUCIA').displayName).toBe('Ana Lucia Rosales');
  });

  it('reparte 2 grupos como 1 apellido + 1 nombre', () => {
    expect(leer('ROSALES LUCIA').displayName).toBe('Lucia Rosales');
  });

  it('con 5 grupos o más deja 2 apellidos y el resto nombres', () => {
    expect(leer('ROSALES MOLINA ANA LUCIA SOFIA').displayName)
      .toBe('Ana Lucia Sofia Rosales Molina');
  });

  it('un solo token se deja como está', () => {
    expect(leer('ROSALES').displayName).toBe('Rosales');
  });

  // El ejemplo literal del plan §5.5.
  it('agrupa las partículas con la palabra siguiente', () => {
    expect(leer('CRUZ DE MOLINA SOFIA ELENA').displayName).toBe('Sofia Elena Cruz de Molina');
  });

  it('agrupa partículas encadenadas como DE LA', () => {
    expect(leer('DE LA CRUZ MOLINA SOFIA ELENA').displayName)
      .toBe('Sofia Elena de la Cruz Molina');
  });

  it('deja las partículas en minúscula salvo al principio', () => {
    expect(leer('DE LEON SOFIA').displayName).toBe('Sofia de Leon');
  });

  // Refinamiento del ADR-0013 sobre la regla del plan: un grupo que empieza
  // por partícula es un apellido, así que no puede ser el primer nombre.
  // Sin esto, estos tres grupos darían «De Leon Nuria Fuentes».
  it('un apellido con partícula no se confunde con un nombre', () => {
    expect(leer('FUENTES DE LEON NURIA').displayName).toBe('Nuria Fuentes de Leon');
    expect(leer('RAMOS DE LA PAZ ANA').displayName).toBe('Ana Ramos de la Paz');
  });
});

describe('nombre a mostrar: capitalización', () => {
  it('capitaliza como título', () => {
    expect(leer('ROSALES LUCIA').displayName).toBe('Lucia Rosales');
  });

  // Regla 5 del plan §5.5: no se añaden tildes que el original no trae.
  it('conserva las tildes del original, sin añadir ni quitar', () => {
    expect(leer('Ana Lucía Martínez Rosales').displayName).toBe('Ana Lucía Martínez Rosales');
    expect(leer('MARTINEZ ROSALES ANA LUCIA').displayName).toBe('Ana Lucia Martinez Rosales');
  });

  it('un nombre que ya viene en mayúsculas y minúsculas se respeta', () => {
    const r = leer('Ana Lucía Martínez Rosales');
    expect(r.displayName).toBe('Ana Lucía Martínez Rosales');
    expect(r.needsReview).toBe(false);
  });
});

describe('orden dudoso: needsReview', () => {
  // Regla 4 del plan §5.5. Dispara el conflicto «orden-nombre-dudoso».
  it('marca para revisar cuando empieza por un nombre de pila y no acaba en uno', () => {
    const r = leer('JUAN PABLO RAMOS RAMOS');
    expect(r.needsReview).toBe(true);
    // No se invierte a ciegas: se deja como venía.
    expect(r.displayName).toBe('Juan Pablo Ramos Ramos');
  });

  it('no marca cuando el primer grupo es un apellido', () => {
    expect(leer('RAMOS RAMOS JUAN PABLO').needsReview).toBe(false);
    expect(leer('RAMOS RAMOS JUAN PABLO').displayName).toBe('Juan Pablo Ramos Ramos');
  });

  it('no marca cuando el último grupo también es un nombre de pila', () => {
    // Aquí no se puede deducir nada, así que se aplica la regla normal.
    expect(leer('ANA LUCIA').needsReview).toBe(false);
  });

  it('no marca si el nombre trae minúsculas: ahí el orden ya se asume', () => {
    expect(leer('Juan Pablo Ramos Ramos').needsReview).toBe(false);
  });
});

describe('casos límite', () => {
  it('una celda de nombre vacía no revienta', () => {
    const r = leer('');
    expect(r.displayName).toBe('');
    expect(r.key).toBe('');
  });

  it('solo espacios tampoco', () => {
    expect(leer('   ').key).toBe('');
  });
});
