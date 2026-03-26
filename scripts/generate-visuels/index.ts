// Generate Session 2 visuals as PDF
// Usage: npx tsx scripts/generate-visuels/index.ts
//        npx tsx scripts/generate-visuels/index.ts --png  (also export PNG)
//        npx tsx scripts/generate-visuels/index.ts slide-03  (single slide)

import puppeteer from 'puppeteer'
import { allSlides, type SlideDefinition } from './slides.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, 'output')

async function generateSlide(
  browser: puppeteer.Browser,
  slide: SlideDefinition,
  exportPng: boolean,
): Promise<void> {
  const page = await browser.newPage()
  await page.setViewport({ width: slide.width, height: slide.height })
  await page.setContent(slide.html, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.fonts.ready)

  // PDF
  const pdfPath = path.join(OUTPUT_DIR, `${slide.id}.pdf`)
  await page.pdf({
    path: pdfPath,
    width: `${slide.width}px`,
    height: `${slide.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  console.log(`  ✓ ${slide.id}.pdf`)

  // PNG (optional)
  if (exportPng) {
    const pngPath = path.join(OUTPUT_DIR, `${slide.id}.png`)
    await page.screenshot({
      path: pngPath,
      type: 'png',
      clip: { x: 0, y: 0, width: slide.width, height: slide.height },
    })
    console.log(`  ✓ ${slide.id}.png`)
  }

  await page.close()
}

async function generateAllInOnePdf(
  browser: puppeteer.Browser,
  slides: SlideDefinition[],
): Promise<void> {
  // Landscape slides only (skip square cheatsheet)
  const landscapeSlides = slides.filter(s => s.width === 1920)

  const combinedHtml = `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: 1920px 1080px; margin: 0; }
      .page-break { page-break-after: always; }
    </style>
    </head><body>
    ${landscapeSlides.map((slide, i) => {
      // Extract the body content from full HTML
      const bodyMatch = slide.html.match(/<body>([\s\S]*)<\/body>/)
      const content = bodyMatch ? bodyMatch[1] : ''
      const breakClass = i < landscapeSlides.length - 1 ? 'page-break' : ''
      return `<div class="${breakClass}">${content}</div>`
    }).join('')}
    </body></html>
  `

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  await page.setContent(combinedHtml, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.fonts.ready)

  const pdfPath = path.join(OUTPUT_DIR, 'session-02-all-slides.pdf')
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  console.log(`  ✓ session-02-all-slides.pdf (${landscapeSlides.length} slides)`)
  await page.close()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const exportPng = args.includes('--png')
  const filterSlide = args.find(a => !a.startsWith('--'))

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('\n🎨 Генерация визуалов — Сессия 2\n')

  const browser = await puppeteer.launch({ headless: true })

  try {
    let slides = allSlides()

    if (filterSlide) {
      slides = slides.filter(s => s.id.includes(filterSlide))
      if (slides.length === 0) {
        console.error(`Слайд "${filterSlide}" не найден.`)
        console.log('Доступные:', allSlides().map(s => s.id).join(', '))
        process.exit(1)
      }
    }

    console.log(`Генерация ${slides.length} слайд(ов)...${exportPng ? ' (+PNG)' : ''}\n`)

    for (const slide of slides) {
      await generateSlide(browser, slide, exportPng)
    }

    if (!filterSlide) {
      console.log('')
      await generateAllInOnePdf(browser, slides)
    }

    console.log(`\n✅ Готово! Файлы в: scripts/generate-visuels/output/\n`)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('Ошибка:', err)
  process.exit(1)
})
