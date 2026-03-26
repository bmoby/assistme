// Design system for formation visuals — Session 2+
// Colors, fonts, shared CSS used across all slides

export const colors = {
  client: '#4ECDC4',
  server: '#FF6B35',
  api: '#FFD166',
  database: '#A855F7',
  bg: '#1a1a2e',
  bgLight: '#16213e',
  text: '#F5F5F5',
  textMuted: '#8892b0',
  success: '#4ADE80',
  danger: '#EF4444',
} as const

export const fonts = {
  heading: "'Inter', 'Montserrat', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
} as const

export const baseCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${fonts.body};
    background: ${colors.bg};
    color: ${colors.text};
    overflow: hidden;
  }

  .slide {
    width: 1920px;
    height: 1080px;
    padding: 60px 80px;
    display: flex;
    flex-direction: column;
  }

  .slide-square {
    width: 1080px;
    height: 1080px;
    padding: 50px;
    display: flex;
    flex-direction: column;
  }

  h1 {
    font-family: ${fonts.heading};
    font-size: 52px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 40px;
    text-transform: uppercase;
  }

  h2 {
    font-family: ${fonts.heading};
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  h3 {
    font-family: ${fonts.heading};
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  p, li {
    font-size: 22px;
    line-height: 1.5;
  }

  .quote {
    font-size: 24px;
    font-style: italic;
    color: ${colors.textMuted};
    border-left: 4px solid ${colors.api};
    padding: 16px 24px;
    margin-top: auto;
    background: rgba(255,255,255,0.03);
    border-radius: 0 8px 8px 0;
  }

  .row { display: flex; gap: 40px; flex: 1; align-items: center; }
  .col { display: flex; flex-direction: column; flex: 1; }

  .card {
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .icon { font-size: 64px; margin-bottom: 8px; }
  .icon-lg { font-size: 80px; }

  .badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 16px;
    font-weight: 600;
  }

  .arrow {
    font-size: 48px;
    color: ${colors.textMuted};
    display: flex;
    align-items: center;
  }

  .blocked {
    color: ${colors.danger};
    font-weight: 700;
    font-size: 20px;
    text-align: center;
    margin-top: 16px;
  }

  .tag-client { background: ${colors.client}22; color: ${colors.client}; border: 2px solid ${colors.client}44; }
  .tag-server { background: ${colors.server}22; color: ${colors.server}; border: 2px solid ${colors.server}44; }
  .tag-api { background: ${colors.api}22; color: ${colors.api}; border: 2px solid ${colors.api}44; }
  .tag-db { background: ${colors.database}22; color: ${colors.database}; border: 2px solid ${colors.database}44; }
`
