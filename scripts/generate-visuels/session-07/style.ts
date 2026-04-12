export interface SlideDefinition {
  id: string
  title: string
  html: string
  width: number
  height: number
}

export const colors = {
  bg: '#f7f7f4',
  panel: '#ffffff',
  border: '#1f1f1f',
  text: '#171717',
  muted: '#6b6b6b',
  blue: '#cfe8ff',
  green: '#d9f7d6',
  yellow: '#fff2bf',
  orange: '#ffd9c7',
  pink: '#fde0ef',
  gray: '#ececec',
} as const

export const baseCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: ${colors.bg};
    color: ${colors.text};
  }
  .slide {
    width: 1920px;
    height: 1080px;
    padding: 56px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .title {
    font-size: 38px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: ${colors.text};
  }
  .subtitle {
    font-size: 18px;
    color: ${colors.muted};
  }
  .canvas {
    flex: 1;
    border: 3px solid ${colors.border};
    background: ${colors.panel};
    border-radius: 28px;
    padding: 34px;
    display: flex;
    position: relative;
    overflow: hidden;
  }
  .row {
    display: flex;
    gap: 28px;
    width: 100%;
    height: 100%;
    align-items: center;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .box {
    border: 3px solid ${colors.border};
    border-radius: 24px;
    background: ${colors.panel};
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  .box-label {
    align-self: flex-start;
    padding: 8px 14px;
    border: 3px solid ${colors.border};
    border-radius: 999px;
    background: ${colors.gray};
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
  }
  .mini-label {
    align-self: flex-start;
    padding: 6px 12px;
    border: 2px solid ${colors.border};
    border-radius: 999px;
    background: ${colors.panel};
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }
  .arrow {
    flex: 0 0 110px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 18px;
  }
  .arrow::before {
    content: "";
    width: 92px;
    height: 0;
    border-top: 6px solid ${colors.border};
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
  }
  .arrow::after {
    content: "";
    position: absolute;
    right: 6px;
    top: 50%;
    width: 18px;
    height: 18px;
    border-top: 6px solid ${colors.border};
    border-right: 6px solid ${colors.border};
    transform: translateY(-50%) rotate(45deg);
  }
  .arrow-stack {
    flex: 0 0 120px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: center;
    justify-content: center;
  }
  .small-arrow {
    width: 84px;
    height: 0;
    border-top: 5px solid ${colors.border};
    position: relative;
  }
  .small-arrow::after {
    content: "";
    position: absolute;
    right: -1px;
    top: -9px;
    width: 16px;
    height: 16px;
    border-top: 5px solid ${colors.border};
    border-right: 5px solid ${colors.border};
    transform: rotate(45deg);
  }
  .folder {
    border: 3px solid ${colors.border};
    border-radius: 18px;
    background: ${colors.yellow};
    position: relative;
    padding: 24px 20px 20px;
    min-height: 210px;
  }
  .folder::before {
    content: "";
    position: absolute;
    top: -3px;
    left: 24px;
    width: 130px;
    height: 26px;
    background: ${colors.yellow};
    border: 3px solid ${colors.border};
    border-bottom: none;
    border-radius: 14px 14px 0 0;
  }
  .folder-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-top: 12px;
  }
  .file {
    border: 3px solid ${colors.border};
    border-radius: 12px;
    background: ${colors.panel};
    min-height: 74px;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .file::after {
    content: "";
    position: absolute;
    top: -3px;
    right: 16px;
    width: 18px;
    height: 18px;
    background: ${colors.bg};
    border-left: 3px solid ${colors.border};
    border-bottom: 3px solid ${colors.border};
    transform: rotate(45deg) translate(6px, -6px);
  }
  .dot-line {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
  }
  .dot {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 3px solid ${colors.border};
    background: ${colors.panel};
  }
  .snapshot {
    border: 3px solid ${colors.border};
    border-radius: 18px;
    background: ${colors.green};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 146px;
  }
  .snapshot-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .snapshot-dot {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 3px solid ${colors.border};
    background: ${colors.panel};
  }
  .snapshot-lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .line {
    height: 12px;
    border-radius: 999px;
    background: ${colors.panel};
    border: 2px solid ${colors.border};
  }
  .line.short { width: 120px; }
  .line.mid { width: 180px; }
  .line.long { width: 240px; }
  .monitor {
    border: 3px solid ${colors.border};
    border-radius: 22px;
    background: ${colors.blue};
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 220px;
    position: relative;
  }
  .monitor::after {
    content: "";
    position: absolute;
    bottom: -22px;
    left: 50%;
    width: 160px;
    height: 18px;
    background: ${colors.gray};
    border: 3px solid ${colors.border};
    border-radius: 999px;
    transform: translateX(-50%);
  }
  .chip {
    border: 3px solid ${colors.border};
    border-radius: 20px;
    background: ${colors.pink};
    padding: 18px;
    min-height: 156px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cloud {
    border: 3px solid ${colors.border};
    border-radius: 999px;
    background: ${colors.gray};
    padding: 18px 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 220px;
    min-height: 110px;
  }
  .server {
    border: 3px solid ${colors.border};
    border-radius: 18px;
    background: ${colors.orange};
    min-height: 140px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .server-slot {
    height: 22px;
    border-radius: 999px;
    border: 3px solid ${colors.border};
    background: ${colors.panel};
  }
  .pill {
    border: 3px solid ${colors.border};
    border-radius: 999px;
    background: ${colors.panel};
    padding: 12px 18px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
  }
  .caption {
    font-size: 20px;
    color: ${colors.muted};
  }
`

export const wrapSlide = (content: string) =>
  `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseCss}</style>
    </head>
    <body>
      <div class="slide">${content}</div>
    </body>
  </html>`
