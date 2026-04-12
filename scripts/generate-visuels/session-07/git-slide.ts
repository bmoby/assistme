export interface SlideDefinition {
  id: string
  title: string
  html: string
  width: number
  height: number
}

const WIDTH = 1920
const HEIGHT = 1080

const c = {
  bg: '#f5f1e8',
  board: '#ffffff',
  ink: '#1f2937',
  border: '#202939',
  line: '#243349',
  muted: '#667085',
  blue: '#dbeafe',
  blueBorder: '#5b8def',
  gray: '#eef2f7',
  grayBorder: '#b8c4d6',
  green: '#dff6df',
  greenBorder: '#7bbf84',
  yellow: '#ffe08a',
  yellowBorder: '#e1b94a',
} as const

function text(x: number, y: number, value: string, size = 28, weight = 700, fill = c.ink): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="-0.02em">${value}</text>`
}

function pill(x: number, y: number, label: string): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="170" height="50" rx="25" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      ${text(x + 32, y + 33, label, 22, 800, c.muted)}
    </g>
  `
}

function bigCard(x: number, y: number, w: number, h: number, fill: string, stroke: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`
}

function arrow(x1: number, y1: number, x2: number, y2: number): string {
  return `
    <g>
      <line x1="${x1}" y1="${y1}" x2="${x2 - 28}" y2="${y2}" stroke="${c.line}" stroke-width="8" stroke-linecap="round"/>
      <polygon points="${x2},${y2} ${x2 - 24},${y2 - 14} ${x2 - 24},${y2 + 14}" fill="${c.line}"/>
    </g>
  `
}

function folder(x: number, y: number, w: number, h: number): string {
  return `
    <g>
      <path d="M ${x} ${y + 28} H ${x + 86} L ${x + 118} ${y} H ${x + w} V ${y + h} H ${x} Z"
        fill="${c.yellow}" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x}" y="${y + 28}" width="${w}" height="${h - 28}" rx="20" fill="${c.yellow}" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x + 20}" y="${y + 58}" width="${w - 40}" height="14" rx="7" fill="${c.yellowBorder}" opacity="0.30"/>
      <rect x="${x + 20}" y="${y + 84}" width="${w - 64}" height="14" rx="7" fill="${c.yellowBorder}" opacity="0.20"/>
    </g>
  `
}

function fileCard(x: number, y: number, w: number, h: number, accent = c.grayBorder): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x + 20}" y="${y + 20}" width="${w - 58}" height="12" rx="6" fill="${accent}" opacity="0.30"/>
      <rect x="${x + 20}" y="${y + 42}" width="${w - 46}" height="10" rx="5" fill="${c.grayBorder}" opacity="0.36"/>
      <rect x="${x + 20}" y="${y + 60}" width="${w - 78}" height="10" rx="5" fill="${c.grayBorder}" opacity="0.26"/>
    </g>
  `
}

function tray(x: number, y: number, w: number, h: number): string {
  return `
    <g>
      <path d="M ${x} ${y + 34} H ${x + 60} L ${x + 84} ${y + 12} H ${x + w - 84} L ${x + w - 60} ${y + 34} H ${x + w}
        V ${y + h} H ${x} Z"
        fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x + 20}" y="${y + h - 24}" width="${w - 40}" height="8" rx="4" fill="${c.grayBorder}" opacity="0.45"/>
    </g>
  `
}

function snapshotCard(x: number, y: number, active = false): string {
  const fill = active ? c.green : c.gray
  const stroke = active ? c.greenBorder : c.grayBorder
  const lineStroke = active ? c.greenBorder : c.blueBorder
  return `
    <g>
      <rect x="${x}" y="${y}" width="188" height="208" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      <rect x="${x + 38}" y="${y + 28}" width="92" height="64" rx="16" fill="${c.yellow}" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x + 50}" y="${y + 48}" width="56" height="10" rx="5" fill="${c.yellowBorder}" opacity="0.30"/>
      <rect x="${x + 32}" y="${y + 118}" width="124" height="18" rx="9" fill="#ffffff" stroke="${lineStroke}" stroke-width="2.5"/>
      <rect x="${x + 32}" y="${y + 150}" width="96" height="18" rx="9" fill="#ffffff" stroke="${lineStroke}" stroke-width="2.5"/>
    </g>
  `
}

function buildHtml(): string {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          background: ${c.bg};
        }
        body { overflow: hidden; }
      </style>
    </head>
    <body>
      <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.12"/>
          </filter>
        </defs>

        <rect x="58" y="58" width="1804" height="964" rx="40" fill="${c.board}" stroke="${c.border}" stroke-width="3" filter="url(#shadow)"/>

        ${bigCard(110, 240, 430, 510, c.blue, c.blueBorder)}
        ${bigCard(744, 240, 430, 510, c.gray, c.grayBorder)}
        ${bigCard(1378, 240, 430, 510, c.green, c.greenBorder)}

        ${text(236, 322, 'Projet', 36, 800)}
        ${text(816, 322, 'Selection', 36, 800)}
        ${text(1472, 322, 'Historique', 36, 800)}

        <rect x="170" y="366" width="312" height="44" rx="18" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
        <circle cx="200" cy="388" r="7" fill="${c.grayBorder}" opacity="0.8"/>
        <circle cx="226" cy="388" r="7" fill="${c.grayBorder}" opacity="0.8"/>
        <circle cx="252" cy="388" r="7" fill="${c.grayBorder}" opacity="0.8"/>

        ${folder(188, 444, 164, 134)}
        ${folder(266, 476, 164, 134)}

        ${fileCard(174, 632, 98, 86, c.blueBorder)}
        ${fileCard(286, 632, 98, 86, c.blueBorder)}
        ${fileCard(398, 632, 98, 86, c.blueBorder)}

        ${tray(834, 466, 250, 150)}
        ${fileCard(862, 416, 124, 86, c.blueBorder)}
        ${fileCard(962, 448, 124, 86, c.blueBorder)}

        <line x1="1452" y1="548" x2="1742" y2="548" stroke="${c.grayBorder}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="1494" cy="548" r="15" fill="${c.line}"/>
        <circle cx="1636" cy="548" r="15" fill="${c.line}"/>

        ${snapshotCard(1430, 384)}
        ${snapshotCard(1572, 384, true)}

        ${arrow(540, 496, 744, 496)}
        ${arrow(1174, 496, 1378, 496)}

        ${pill(574, 790, 'add')}
        ${pill(1208, 790, 'commit')}
      </svg>
    </body>
  </html>`
}

export const gitLocalSlide = (): SlideDefinition => ({
  id: 'session-07-git-local',
  title: 'Git local',
  width: WIDTH,
  height: HEIGHT,
  html: buildHtml(),
})
