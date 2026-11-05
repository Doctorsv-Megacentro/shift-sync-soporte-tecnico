import { describe, expect, it } from 'vitest';
import {
  calcularVencimiento,
  enlaceVigente,
  generarSlug,
  restriccionesDeEnlace,
} from '../../src/domain/share.ts';

describe('generarSlug', () => {
  it('empieza con el prefijo y un guion', () => {
    expect(generarSlug('operacion')).toMatch(/^operacion-/);
  });

  it('da 12 caracteres aleatorios en base62 después del prefijo', () => {
    const slug = generarSlug('operacion');
    const azar = slug.slice('operacion-'.length);
    expect(azar).toHaveLength(12);
    expect(azar).toMatch(/^[0-9A-Za-z]{12}$/);
  });

  it('no repite el mismo slug entre llamadas (con altísima probabilidad)', () => {
    const slugs = new Set(Array.from({ length: 200 }, () => generarSlug('operacion')));
    expect(slugs.size).toBe(200);
  });
});

describe('calcularVencimiento', () => {
  const ahora = new Date('2026-11-02T10:00:00');

  it('24h suma exactamente un día', () => {
    expect(calcularVencimiento('24h', ahora).getTime() - ahora.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('7d suma exactamente siete días', () => {
    expect(calcularVencimiento('7d', ahora).getTime() - ahora.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('fin-de-mes da el primer instante del mes siguiente', () => {
    const v = calcularVencimiento('fin-de-mes', ahora);
    expect(v.getFullYear()).toBe(2026);
    expect(v.getMonth()).toBe(11); // diciembre, 0-indexado
    expect(v.getDate()).toBe(1);
    expect(v.getHours()).toBe(0);
  });

  it('fin-de-mes cruza el año en diciembre', () => {
    const v = calcularVencimiento('fin-de-mes', new Date('2026-12-15T10:00:00'));
    expect(v.getFullYear()).toBe(2027);
    expect(v.getMonth()).toBe(0); // enero
    expect(v.getDate()).toBe(1);
  });
});

describe('enlaceVigente', () => {
  const ahora = new Date('2026-11-02T10:00:00');
  const futuro = '2026-12-01T00:00:00';
  const pasado = '2026-10-01T00:00:00';

  it('vigente: no revocado y no vencido', () => {
    expect(enlaceVigente(futuro, null, ahora)).toBe(true);
  });

  it('vencido, aunque no esté revocado', () => {
    expect(enlaceVigente(pasado, null, ahora)).toBe(false);
  });

  it('revocado, aunque no haya vencido', () => {
    expect(enlaceVigente(futuro, '2026-11-01T00:00:00', ahora)).toBe(false);
  });
});

describe('restriccionesDeEnlace', () => {
  it('una semana limita sus siete fechas pero conserva búsqueda', () => {
    expect(restriccionesDeEnlace('semana', { start_date: '2026-11-02' })).toMatchObject({
      startDate: '2026-11-02',
      endDate: '2026-11-08',
      fixedDate: null,
      fixedPersonKey: null,
      showSearch: true,
    });
  });

  it('una persona queda fija sin ocultar quién está', () => {
    expect(restriccionesDeEnlace('persona', { person_key: 'PERSONA FICTICIA' })).toMatchObject({
      fixedPersonKey: 'PERSONA FICTICIA',
      fixedDate: null,
      showSearch: false,
      highlightChange: false,
    });
  });

  it('un cambio fija persona y fecha y pide destacarlo', () => {
    expect(
      restriccionesDeEnlace('cambio', { person_key: 'PERSONA FICTICIA', date: '2026-11-05' }),
    ).toMatchObject({
      fixedPersonKey: 'PERSONA FICTICIA',
      fixedDate: '2026-11-05',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      showSearch: false,
      highlightChange: true,
    });
  });
});
