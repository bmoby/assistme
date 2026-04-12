import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'
import { gitLocalSlide } from './git-slide.js'
import { deploySlide } from './deploy-slide.js'
import type { SlideDefinition } from './style.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '../../../learning-knowledge/module-2/visuels/session-07')

async function renderSlide(browser: puppeteer.Browser, slide: SlideDefinition): Promise<void> {
  const page = await browser.newPage()
  await page.setViewport({ width: slide.width, height: slide.height })
  await page.setContent(slide.html, { waitUntil: 'domcontentloaded' })

  const pdfPath = path.join(OUTPUT_DIR, `${slide.id}.pdf`)
  const pngPath = path.join(OUTPUT_DIR, `${slide.id}.png`)

  await page.pdf({
    path: pdfPath,
    width: `${slide.width}px`,
    height: `${slide.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })

  await page.screenshot({
    path: pngPath,
    type: 'png',
    clip: { x: 0, y: 0, width: slide.width, height: slide.height },
  })

  console.log(`  ✓ ${slide.id}.pdf`)
  console.log(`  ✓ ${slide.id}.png`)
  await page.close()
}

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const slides = [gitLocalSlide(), deploySlide()]

  console.log('\n🎨 Generation des visuels Session 7\n')

  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const slide of slides) {
      await renderSlide(browser, slide)
    }
  } finally {
    await browser.close()
  }

  console.log(`\n✅ Fichiers generes dans: ${OUTPUT_DIR}\n`)
}

main().catch(err => {
  console.error('Erreur:', err)
  process.exit(1)
})
