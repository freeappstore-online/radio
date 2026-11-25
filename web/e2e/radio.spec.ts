import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio
    window.Audio = function (...args: ConstructorParameters<typeof Audio>) {
      const audio = new NativeAudio(...args)
      ;(window as unknown as { fixtureAudio: HTMLAudioElement }).fixtureAudio = audio
      return audio
    } as typeof Audio
  })
  await page.route('https://somafm.com/channels.json', route => route.fulfill({ json: { channels: [{ id: 'fixture', title: 'Fixture Station', genre: 'jazz' }] } }))
  await page.route('https://de1.api.radio-browser.info/json/stations/search?*', route => route.fulfill({ json: [] }))
  await page.route('https://ice2.somafm.com/fixture-128-mp3', route => route.fulfill({ body: readFileSync(resolve('e2e/fixture.wav')), contentType: 'audio/wav' }))
})

test('audio continues through Profile and app navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play Fixture Station' }).click()
  await expect.poll(() => page.evaluate(() => (window as any).fixtureAudio.currentTime)).toBeGreaterThan(0.2)
  const before = await page.evaluate(() => (window as any).fixtureAudio.currentTime)
  await page.getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as any).fixtureAudio.currentTime)).toBeGreaterThan(before + 0.2)
  await page.getByRole('link', { name: 'Library' }).click()
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible()
  expect(await page.evaluate(() => (window as any).fixtureAudio.paused)).toBe(false)
})

for (const width of [320, 375, 390, 1280]) {
  test(`layout at ${width}px with large text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    await page.evaluate(() => document.documentElement.setAttribute('data-text', 'lg'))
    for (const label of ['Browse', 'Library', 'Profile']) {
      await page.getByRole('link', { name: label }).click()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    }
  })
}


test('saved favorites and verified ad-free filters combine and update', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('radio-favorites', JSON.stringify([
    { id: 'soma-fixture', name: 'Fixture Station', streamUrl: 'https://ice2.somafm.com/fixture-128-mp3', tags: 'jazz', country: 'The United States Of America', bitrate: 128 },
    { id: 'radio-unknown', name: 'Unknown Station', streamUrl: 'https://example.com/stream', tags: 'ad-free,jazz' },
  ])))
  await page.goto('/')
  await page.getByRole('button', { name: 'Favorites', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play Unknown Station' })).toBeVisible()
  await page.getByRole('button', { name: 'Ad-free', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play Fixture Station' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play Unknown Station' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Favorite Fixture Station' }).click()
  await expect(page.getByText('No stations match your filters.')).toBeVisible()
  await page.getByRole('link', { name: 'Library' }).click()
  await page.getByLabel('Search favorites').pressSequentially('unknown')
  await expect(page.getByRole('button', { name: 'Play Unknown Station' })).toBeVisible()
})
