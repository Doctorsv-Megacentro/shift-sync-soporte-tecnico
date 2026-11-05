/**
 * Flujo de aceptación de Fase 8: publicar, compartir, consultar, cambiar,
 * deshacer y revocar. Corre igual en escritorio y móvil de 390 px.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { E2E_EMAIL, E2E_PASSWORD } from './global-setup.ts';

const URL = 'http://127.0.0.1:55321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

test.beforeEach(async () => {
  const service = createClient(URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const corte = '1970-01-01';
  const { error: overridesError } = await service.from('day_overrides').delete().gte('created_at', corte);
  if (overridesError) throw overridesError;
  const { error: linksError } = await service.from('share_links').delete().gte('created_at', corte);
  if (linksError) throw linksError;
  const { error: acksError } = await service.from('conflict_acks').delete().gte('created_at', corte);
  if (acksError) throw acksError;
});

async function iniciarSesion(page: Page) {
  await page.goto('/');
  const resultado = await page.evaluate(
    async ({ email, password }) => {
      const modulePath = '/src/data/supabase.ts';
      const { supabase } = await import(modulePath);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    { email: E2E_EMAIL, password: E2E_PASSWORD },
  );
  expect(resultado).toBeNull();
}

function fixtureUnico(proyecto: string): Buffer {
  const original = readFileSync(resolve('tests/fixtures/horario-anon.xlsx'));
  const workbook = XLSX.read(original, { type: 'buffer' });
  workbook.Props = {
    ...(workbook.Props ?? {}),
    Comments: `E2E ${proyecto} ${Date.now()}`,
  };
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

test('flujo completo de producción', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  await iniciarSesion(page);

  await page.goto('/jefe/fuente');
  await expect(page.getByRole('heading', { name: 'Fuente de datos' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: `horario-${testInfo.project.name}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: fixtureUnico(testInfo.project.name),
  });
  await expect(page.getByText('Resumen de lectura')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar esta versión' }).click();
  await expect(page.getByText('Versión publicada.')).toBeVisible();

  await page.goto('/jefe/compartir?scope=operacion');
  await page.getByRole('radio', { name: 'Toda la operación' }).click();
  await page.getByRole('button', { name: 'Crear enlace' }).click();
  const campoEnlace = page.locator('.ss-share-result input[readonly]');
  await expect(campoEnlace).toBeVisible();
  const publicUrl = await campoEnlace.inputValue();
  expect(publicUrl).toContain('/s/operacion-');

  const empleado = await context.newPage();
  await empleado.goto(publicUrl);
  const buscador = empleado.getByPlaceholder('Escribe tu nombre, por ejemplo Josué o Yenifer');
  await expect(buscador).toBeVisible();
  await buscador.fill('an');
  const primerResultado = empleado.locator('input[placeholder^="Escribe tu nombre"] + ul button').first();
  await expect(primerResultado).toBeVisible();
  const nombre = (await primerResultado.locator('strong').textContent())?.trim();
  expect(nombre).toBeTruthy();
  await primerResultado.click();
  await expect(empleado.getByText('Tu semana')).toBeVisible();
  await expect(empleado.getByText('Quién está ese día')).toBeVisible();

  const diaConTurno = empleado
    .locator('.ss-dia')
    .filter({ hasNotText: /Libre|Vacaciones|Sin datos/ })
    .first();
  const numeroDia = (await diaConTurno.locator('.ss-dia-numero').textContent())?.trim();
  expect(numeroDia).toMatch(/^\d{2}$/);
  await diaConTurno.click();

  await page.goto('/jefe/horario');
  await expect(page.getByRole('heading', { name: 'Horario completo' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar persona' }).fill(nombre ?? '');
  const diaEtiqueta = String(Number(numeroDia));
  const celda = page.getByRole('button', { name: new RegExp(`Cambiar ${nombre}, ${diaEtiqueta} `) });
  await expect(celda).toBeVisible();
  await celda.click({ force: true });
  await expect(page.getByRole('dialog', { name: 'Cambiar un día' })).toBeVisible();
  await page.getByRole('button', { name: 'Vacaciones', exact: true }).click();
  await page.getByRole('button', { name: 'Permiso', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar cambio' }).click();
  await expect(page.getByText(/Cambio guardado:/)).toBeVisible();

  await empleado.reload();
  await empleado.locator('.ss-dia').filter({ hasText: numeroDia ?? '' }).click();
  await expect(empleado.getByText(/Cambio hecho por jefatura/)).toBeVisible();
  await expect(empleado.getByRole('button', { name: new RegExp(`Vacaciones`) }).first()).toBeVisible();
  await expect(empleado.locator('.ss-dia[aria-current="true"]')).toContainText('Vacaciones');

  await page.getByRole('button', { name: /Cambios ·/ }).click();
  const filaCambio = page.getByRole('dialog', { name: 'Cambios de jefatura' }).filter({ hasText: nombre ?? '' });
  await filaCambio.getByRole('button', { name: 'Deshacer' }).first().click();
  await expect(page.getByRole('button', { name: 'Cambios · 0' })).toBeVisible();
  await expect(
    page.getByText('Todavía no hay cambios. Toca una celda del horario para cambiar un día.'),
  ).toBeVisible();

  await empleado.reload();
  await empleado.locator('.ss-dia').filter({ hasText: numeroDia ?? '' }).click();
  await expect(empleado.getByText(/Cambio hecho por jefatura/)).toHaveCount(0);

  await page.goto('/jefe/compartir');
  const enlaceActivo = page.locator('.ss-share-list article').filter({ hasText: publicUrl });
  await enlaceActivo.getByRole('button', { name: 'Revocar' }).click();
  await expect(enlaceActivo).toHaveCount(0);

  await empleado.reload();
  await expect(
    empleado.getByText('Este enlace ya no está activo. Pide uno nuevo a jefatura.'),
  ).toBeVisible();
});
