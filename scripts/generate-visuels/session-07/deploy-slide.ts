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
  gray: '#eef2f7',
  orange: '#ffe1cf',
  green: '#dff6df',
  blueBorder: '#5b8def',
  grayBorder: '#b8c4d6',
  orangeBorder: '#e59b74',
  greenBorder: '#7bbf84',
} as const

function text(x: number, y: number, value: string, size = 28, weight = 700, fill = c.ink): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="-0.02em">${value}</text>`
}

function pill(x: number, y: number, label: string): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="160" height="50" rx="25" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      ${text(x + 34, y + 33, label, 22, 800, c.muted)}
    </g>
  `
}

function arrow(x1: number, y1: number, x2: number, y2: number): string {
  return `
    <g>
      <line x1="${x1}" y1="${y1}" x2="${x2 - 28}" y2="${y2}" stroke="${c.line}" stroke-width="8" stroke-linecap="round"/>
      <polygon points="${x2},${y2} ${x2 - 24},${y2 - 14} ${x2 - 24},${y2 + 14}" fill="${c.line}"/>
    </g>
  `
}

function card(x: number, y: number, w: number, h: number, fill: string, stroke: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="32" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`
}

function codeWindow(x: number, y: number): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="200" height="140" rx="22" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x}" y="${y}" width="200" height="30" rx="22" fill="#eef2f7" stroke="${c.border}" stroke-width="3"/>
      <circle cx="${x + 24}" cy="${y + 15}" r="6" fill="${c.border}" opacity="0.22"/>
      <circle cx="${x + 46}" cy="${y + 15}" r="6" fill="${c.border}" opacity="0.22"/>
      <circle cx="${x + 68}" cy="${y + 15}" r="6" fill="${c.border}" opacity="0.22"/>
      <rect x="${x + 24}" y="${y + 54}" width="128" height="12" rx="6" fill="${c.blueBorder}" opacity="0.28"/>
      <rect x="${x + 24}" y="${y + 78}" width="148" height="10" rx="5" fill="${c.grayBorder}" opacity="0.5"/>
      <rect x="${x + 24}" y="${y + 98}" width="112" height="10" rx="5" fill="${c.grayBorder}" opacity="0.4"/>
      <rect x="${x + 24}" y="${y + 118}" width="86" height="10" rx="5" fill="${c.grayBorder}" opacity="0.3"/>
    </g>
  `
}

function repoIcon(x: number, y: number): string {
  return `
    <g>
      <path d="M ${x + 70} ${y} L ${x + 140} ${y + 40} L ${x + 140} ${y + 120} L ${x + 70} ${y + 160} L ${x} ${y + 120} L ${x} ${y + 40} Z"
        fill="#ffffff" stroke="${c.border}" stroke-width="4"/>
      <rect x="${x + 36}" y="${y + 58}" width="68" height="14" rx="7" fill="${c.grayBorder}" opacity="0.45"/>
      <rect x="${x + 36}" y="${y + 84}" width="48" height="14" rx="7" fill="${c.grayBorder}" opacity="0.35"/>
    </g>
  `
}

function vercelStack(x: number, y: number): string {
  return `
    <g>
      <polygon points="${x + 92},${y} ${x + 142},${y + 96} ${x + 42},${y + 96}" fill="${c.border}"/>
      <rect x="${x}" y="${y + 132}" width="184" height="28" rx="14" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x}" y="${y + 176}" width="184" height="28" rx="14" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x}" y="${y + 220}" width="184" height="28" rx="14" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
    </g>
  `
}

function browser(x: number, y: number): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="226" height="158" rx="22" fill="#ffffff" stroke="${c.border}" stroke-width="3"/>
      <rect x="${x}" y="${y}" width="226" height="34" rx="22" fill="#eef2f7" stroke="${c.border}" stroke-width="3"/>
      <circle cx="${x + 24}" cy="${y + 17}" r="6" fill="${c.border}" opacity="0.22"/>
      <circle cx="${x + 46}" cy="${y + 17}" r="6" fill="${c.border}" opacity="0.22"/>
      <circle cx="${x + 68}" cy="${y + 17}" r="6" fill="${c.border}" opacity="0.22"/>
      <rect x="${x + 24}" y="${y + 58}" width="178" height="24" rx="12" fill="${c.green}" stroke="${c.greenBorder}" stroke-width="2.5"/>
      <rect x="${x + 24}" y="${y + 96}" width="78" height="34" rx="12" fill="${c.blue}" stroke="${c.blueBorder}" stroke-width="2.5"/>
      <rect x="${x + 114}" y="${y + 96}" width="88" height="34" rx="12" fill="${c.orange}" stroke="${c.orangeBorder}" stroke-width="2.5"/>
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

        ${card(110, 252, 320, 470, c.blue, c.blueBorder)}
        ${card(526, 252, 320, 470, c.gray, c.grayBorder)}
        ${card(942, 252, 320, 470, c.orange, c.orangeBorder)}
        ${card(1358, 252, 320, 470, c.green, c.greenBorder)}

        ${text(214, 330, 'Local', 34, 800)}
        ${text(608, 330, 'GitHub', 34, 800)}
        ${text(1038, 330, 'Vercel', 34, 800)}
        ${text(1474, 330, 'Web', 34, 800)}

        ${codeWindow(170, 388)}
        ${repoIcon(616, 382)}
        ${vercelStack(1010, 366)}
        ${browser(1405, 388)}

        ${arrow(430, 488, 526, 488)}
        ${arrow(846, 488, 942, 488)}
        ${arrow(1262, 488, 1358, 488)}

        ${pill(176, 806, 'commit')}
        ${pill(592, 806, 'push')}
        ${pill(1008, 806, 'build')}
        ${pill(1424, 806, 'url')}
      </svg>
    </body>
  </html>`
}

export const deploySlide = (): SlideDefinition => ({
  id: 'session-07-deploy-flow',
  title: 'Deploy flow',
  width: WIDTH,
  height: HEIGHT,
  html: buildHtml(),
})
