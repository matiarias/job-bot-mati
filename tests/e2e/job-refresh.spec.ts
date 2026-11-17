import { expect, test } from '@playwright/test';

const job = {
  id: 'example', company: 'Estudio Ejemplo', title: 'Frontend Engineer', location: 'Remoto desde Argentina',
  contract: 'Contractor', salary: 'No publicado', skills: ['React'], date: null,
  description: 'Oferta de prueba', matches: [], questions: [],
};

test('conserva la bandeja durante la búsqueda y recarga el catálogo después', async ({ page }) => {
  let catalog = [job];
  let release!: () => void;
  const refreshAllowed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/jobs', route => route.fulfill({ json: catalog }));
  await page.route('**/api/jobs/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer clave-de-prueba');
    await refreshAllowed;
    catalog = [job, { ...job, id: 'example-2', title: 'React Engineer' }];
    await route.fulfill({ json: {
      processed: 2,
      warnings: ['Una consulta no respondió'],
      completedAt: '2026-11-16T12:00:00Z',
    } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Frontend Engineer' })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar ofertas nuevas' }).click();
  await page.getByLabel('Clave de actualización').fill('clave-de-prueba');
  await page.getByRole('button', { name: 'Iniciar búsqueda' }).click();
  await expect(page.getByText('Buscando en los portales…')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frontend Engineer' })).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: /React Engineer/ })).toBeVisible();
  await expect(page.getByText('2 ofertas guardadas o actualizadas.')).toBeVisible();
  await expect(page.getByText('Algunas consultas fallaron.', { exact: false })).toBeVisible();
});
