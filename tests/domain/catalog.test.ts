import { describe, expect, it } from 'vitest';
import {
  ROLES,
  SEDES,
  esDepartamentoMalEscrito,
  esRolDeSoporteEnSede,
  formaCorrecta,
  resolveDepartment,
} from '../../src/domain/catalog.ts';
import { CATALOGO } from '../../src/domain/config.ts';

describe('coincidencia exacta', () => {
  it('resuelve los departamentos con sede', () => {
    expect(resolveDepartment('MEGA N1')).toMatchObject({
      role: 'N1', site: 'Megacentro', match: 'exact',
    });
    expect(resolveDepartment('CC N2')).toMatchObject({ role: 'N2', site: 'Tuscania' });
    expect(resolveDepartment('Phoenix N1')).toMatchObject({ role: 'N1', site: 'Phoenix Tower' });
    expect(resolveDepartment('AT N1')).toMatchObject({ role: 'N1', site: 'Atento' });
    expect(resolveDepartment('N1 ST ANA')).toMatchObject({ role: 'N1', site: 'Santa Ana' });
    expect(resolveDepartment('N1 SAN MIGUEL')).toMatchObject({ role: 'N1', site: 'San Miguel' });
    expect(resolveDepartment('Activo Fijo')).toMatchObject({
      role: 'Activo Fijo', site: 'Megacentro',
    });
  });

  it('resuelve los supervisores a su sede', () => {
    expect(resolveDepartment('SUP MEGA')).toMatchObject({
      role: 'Supervisor', site: 'Megacentro', match: 'exact',
    });
    expect(resolveDepartment('SUP CC')).toMatchObject({
      role: 'Supervisor', site: 'Tuscania', match: 'exact',
    });
  });

  it('algunos departamentos transversales quedan sin sede, y eso no es un error', () => {
    expect(resolveDepartment('Coordinador Operaciones')).toMatchObject({
      role: 'Coordinador', site: 'Sin sede',
    });
    expect(resolveDepartment('Especialistas de Producto')).toMatchObject({
      role: 'Producto', site: 'Sin sede',
    });
    expect(resolveDepartment('Auxiliares de Red y Soporte')).toMatchObject({
      role: 'Redes', site: 'Sin sede',
    });
  });

  it('QA, tercerías, redes y atención de salas están en Megacentro', () => {
    expect(resolveDepartment('QA')).toMatchObject({ role: 'QA', site: 'Megacentro', match: 'exact' });
    expect(resolveDepartment('Tercerias')).toMatchObject({ role: 'Tercería', site: 'Megacentro' });
    expect(resolveDepartment('Supervisor Tercerias')).toMatchObject({
      role: 'Supervisor', site: 'Megacentro', area: 'Tercería',
    });
    expect(resolveDepartment('Especialistas de Redes')).toMatchObject({
      role: 'Redes', site: 'Megacentro',
    });
    expect(resolveDepartment('Administrador de Redes')).toMatchObject({
      role: 'Redes', site: 'Megacentro',
    });
    expect(resolveDepartment('Atencion Gestion Salas')).toMatchObject({
      role: 'Soporte de Salas', site: 'Megacentro',
    });
    expect(resolveDepartment('Coordinador de Producto')).toMatchObject({
      role: 'Coordinador', site: 'Megacentro', area: 'Producto',
    });
  });

  it('soporte tecnológico y salas está en Phoenix Tower', () => {
    expect(resolveDepartment('Soporte Tecnologico y Salas')).toMatchObject({
      role: 'Soporte de Salas', site: 'Phoenix Tower',
    });
  });

  it('guarda el área cuando la hay', () => {
    expect(resolveDepartment('Coordinador Operaciones')).toMatchObject({
      role: 'Coordinador', area: 'Operación',
    });
    expect(resolveDepartment('Coordinador de Producto')).toMatchObject({
      role: 'Coordinador', area: 'Producto',
    });
    expect(resolveDepartment('Supervisor Tercerias')).toMatchObject({
      role: 'Supervisor', area: 'Tercería',
    });
  });

  it('ignora tildes, mayúsculas y espacios de más', () => {
    const esperado = { role: 'N1', site: 'Megacentro', match: 'exact' };
    expect(resolveDepartment('mega n1')).toMatchObject(esperado);
    expect(resolveDepartment('  MEGA   N1  ')).toMatchObject(esperado);
    expect(resolveDepartment('Atencion Gestion Salas')).toMatchObject({ match: 'exact' });
    expect(resolveDepartment('Atención Gestión Salas')).toMatchObject({ match: 'exact' });
  });

  it('coordinación de sede lleva su sede', () => {
    expect(resolveDepartment('Coordinador Santa Ana')).toMatchObject({
      role: 'Coordinador', site: 'Santa Ana',
    });
    expect(resolveDepartment('Coordinadora San Miguel')).toMatchObject({
      role: 'Coordinador', site: 'San Miguel',
    });
  });
});

describe('departamento mal escrito en la hoja', () => {
  // «Adminsitrador de Redes» viene así en el original. No se toca la hoja.
  it('acepta el alias y lo marca como tal', () => {
    const r = resolveDepartment('Adminsitrador de Redes');
    expect(r).toMatchObject({ role: 'Redes', site: 'Megacentro', match: 'alias' });
  });

  it('la forma correcta también funciona, y como exacta', () => {
    expect(resolveDepartment('Administrador de Redes')).toMatchObject({
      role: 'Redes', match: 'exact',
    });
  });

  it('sabe decir cuál es la forma correcta, para proponer el arreglo', () => {
    expect(esDepartamentoMalEscrito('Adminsitrador de Redes')).toBe(true);
    expect(formaCorrecta('Adminsitrador de Redes')).toBe('ADMINISTRADOR DE REDES');
    expect(esDepartamentoMalEscrito('MEGA N1')).toBe(false);
    expect(formaCorrecta('MEGA N1')).toBeNull();
  });
});

describe('reglas de respaldo por fragmento', () => {
  it('deduce sede y rol de un departamento que no está en la tabla', () => {
    expect(resolveDepartment('MEGA N3')).toMatchObject({ site: 'Megacentro', match: 'rule' });
    expect(resolveDepartment('SUP PHOENIX')).toMatchObject({
      role: 'Supervisor', site: 'Phoenix Tower', match: 'rule',
    });
    expect(resolveDepartment('CC N3')).toMatchObject({ site: 'Tuscania', match: 'rule' });
  });

  it('reconoce el sufijo -SM como San Miguel', () => {
    expect(resolveDepartment('NUEVO EQUIPO-SM')).toMatchObject({
      site: 'San Miguel', match: 'rule',
    });
  });

  it('reconoce los nombres completos de sede', () => {
    expect(resolveDepartment('EQUIPO MEGACENTRO')).toMatchObject({ site: 'Megacentro' });
    expect(resolveDepartment('EQUIPO TUSCANIA')).toMatchObject({ site: 'Tuscania' });
    expect(resolveDepartment('EQUIPO ATENTO')).toMatchObject({ site: 'Atento' });
    expect(resolveDepartment('EQUIPO PHOENIX TOWER')).toMatchObject({ site: 'Phoenix Tower' });
  });

  it('si solo deduce el rol, la sede queda Sin sede', () => {
    expect(resolveDepartment('SUP NUEVO')).toMatchObject({
      role: 'Supervisor', site: 'Sin sede', match: 'rule',
    });
  });

  // Lo que evita que las reglas hagan daño: los fragmentos son palabras.
  it('un fragmento no coincide dentro de otra palabra', () => {
    // «CC» no debe aparecer dentro de «ACCESOS», ni «AT» dentro de «DATOS».
    expect(resolveDepartment('ACCESOS')).toMatchObject({ site: 'Sin sede', match: 'unknown' });
    expect(resolveDepartment('DATOS')).toMatchObject({ site: 'Sin sede', match: 'unknown' });
  });
});

describe('departamento desconocido', () => {
  it('queda Sin sede, rol Otro y marcado como unknown', () => {
    expect(resolveDepartment('EQUIPO INVENTADO')).toEqual({
      role: 'Otro', site: 'Sin sede', area: null, match: 'unknown',
    });
  });

  it('una celda vacía también', () => {
    expect(resolveDepartment('')).toMatchObject({ match: 'unknown' });
    expect(resolveDepartment(null)).toMatchObject({ match: 'unknown' });
    expect(resolveDepartment(undefined)).toMatchObject({ match: 'unknown' });
    expect(resolveDepartment('   ')).toMatchObject({ match: 'unknown' });
  });
});

describe('el catálogo cubre lo que la hoja real trae', () => {
  // La hoja de noviembre tiene 26 departamentos (verificado contra el archivo).
  it('la tabla explícita tiene los 26 departamentos', () => {
    expect(CATALOGO.size).toBe(26);
  });

  it('todas las entradas resuelven de forma exacta', () => {
    for (const departamento of CATALOGO.keys()) {
      expect(resolveDepartment(departamento).match, departamento).toBe('exact');
    }
  });

  it('ninguna entrada deja el rol en Otro', () => {
    for (const [departamento, entrada] of CATALOGO) {
      expect(entrada.role, departamento).not.toBe('Otro');
    }
  });

  it('el catálogo cubre las 6 sedes más Sin sede', () => {
    const sedes = new Set([...CATALOGO.values()].map((e) => e.site));
    expect(sedes.size).toBe(7);
    for (const sede of SEDES) expect(sedes.has(sede), sede).toBe(true);
  });
});

describe('ayudas de presentación', () => {
  it('SEDES y ROLES llevan el orden de la interfaz', () => {
    expect(SEDES[0]).toBe('Megacentro');
    expect(SEDES.at(-1)).toBe('Sin sede');
    expect(ROLES[0]).toBe('N1');
    expect(ROLES.at(-1)).toBe('Otro');
  });

  it('solo N1 y N2 atienden en sede, que es lo que exige supervisión', () => {
    expect(esRolDeSoporteEnSede('N1')).toBe(true);
    expect(esRolDeSoporteEnSede('N2')).toBe(true);
    expect(esRolDeSoporteEnSede('Supervisor')).toBe(false);
    expect(esRolDeSoporteEnSede('QA')).toBe(false);
  });
});
