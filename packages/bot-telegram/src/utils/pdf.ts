import PDFDocument from 'pdfkit';

const COLORS = {
  title: '#1a1a2e',
  sectionBg: '#2c3e50',
  sectionText: '#ffffff',
  text: '#2c2c2c',
  subText: '#6c757d',
  bullet: '#e74c3c',
  accent: '#e74c3c',
  divider: '#e0e0e0',
  footerBg: '#f5f5f5',
  number: '#ffffff',
};

const SECTION_LABELS: Record<string, string> = {
  'comprehension': 'COMPREHENSION DU BUSINESS',
  'business': 'COMPREHENSION DU BUSINESS',
  'tech': 'TECH ACTUELLE',
  'douleur': 'POINTS DE DOULEUR',
  'pain': 'POINTS DE DOULEUR',
  'equipe': 'EQUIPE & PROCESSUS',
  'processus': 'EQUIPE & PROCESSUS',
  'client': 'CLIENTS DU CLIENT',
  'acquisition': 'CLIENTS DU CLIENT',
  'budget': 'BUDGET & TIMELINE',
  'timeline': 'BUDGET & TIMELINE',
  'vision': 'VISION & OBJECTIFS',
  'objectif': 'VISION & OBJECTIFS',
};

/** Remove all emoji characters from text */
function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\uFE0F/g, '')
    .trim();
}

/** Clean markdown formatting from text */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();
}

/** Full text cleanup */
function clean(text: string): string {
  return cleanMarkdown(stripEmojis(text));
}

interface ParsedSection {
  title: string;
  items: string[];
}

function matchSectionLabel(line: string): string | null {
  const lower = line.toLowerCase();
  for (const [keyword, label] of Object.entries(SECTION_LABELS)) {
    if (lower.includes(keyword)) return label;
  }
  return null;
}

function parseDiscoveryContent(content: string): { title: string; sections: ParsedSection[]; footer: string[] } {
  const lines = content.split('\n');
  let title = '';
  const sections: ParsedSection[] = [];
  const footer: string[] = [];
  let currentSection: ParsedSection | null = null;
  let inFooter = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const cleaned = clean(trimmed);
    if (!cleaned) continue;

    // Detect main title
    if (!title && (trimmed.startsWith('#') || trimmed.startsWith('🔍') || trimmed.toLowerCase().includes('questions'))) {
      title = cleaned;
      continue;
    }

    // Detect footer
    const lowerCleaned = cleaned.toLowerCase();
    if (
      lowerCleaned.includes('note pour magomed') ||
      lowerCleaned.includes('points cles') ||
      lowerCleaned.includes('priorite a creuser') ||
      lowerCleaned.includes('conseils') ||
      (inFooter && !matchSectionLabel(trimmed))
    ) {
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
        currentSection = null;
      }
      inFooter = true;
      // Clean footer line
      const footerLine = cleaned
        .replace(/^note pour magomed\s*:?\s*/i, '')
        .replace(/^points cles\s*:?\s*/i, '')
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim();
      if (footerLine) footer.push(footerLine);
      continue;
    }

    // Detect section headers
    const sectionLabel = matchSectionLabel(trimmed);
    if (sectionLabel && (trimmed.startsWith('#') || trimmed.startsWith('*') || /^[^\w]/.test(trimmed) || /^[A-Z]/.test(trimmed))) {
      if (currentSection && currentSection.items.length > 0) sections.push(currentSection);
      inFooter = false;
      currentSection = { title: sectionLabel, items: [] };
      continue;
    }

    // Add items to current section
    if (currentSection) {
      const item = cleaned
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim();
      if (item && item.length > 3) {
        currentSection.items.push(item);
      }
    } else if (!title) {
      title = cleaned;
    }
  }

  if (currentSection && currentSection.items.length > 0) sections.push(currentSection);

  return {
    title: title || 'Questions de qualification',
    sections,
    footer,
  };
}

export async function generateDiscoveryPdf(content: string, clientName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 45, right: 45 },
      info: {
        Title: `Discovery - ${clientName}`,
        Author: 'Vibe Coder',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pw = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const ml = doc.page.margins.left;
    const { title, sections, footer } = parseDiscoveryContent(content);

    // ── Accent bar top ──
    doc.rect(0, 0, doc.page.width, 6).fill(COLORS.accent);

    // ── Title ──
    doc.y = 35;
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(COLORS.title)
      .text(clean(title), ml, doc.y, { width: pw, align: 'center' });

    // ── Subtitle : date ──
    const date = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.subText)
      .text(date, ml, doc.y + 6, { width: pw, align: 'center' });

    doc.moveDown(1.2);

    // ── Thin divider ──
    const drawDivider = (): void => {
      doc
        .moveTo(ml, doc.y)
        .lineTo(ml + pw, doc.y)
        .strokeColor(COLORS.divider)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.6);
    };

    drawDivider();

    // ── Sections ──
    sections.forEach((section, idx) => {
      const sectionNum = idx + 1;

      // Page break check
      if (doc.y > doc.page.height - 160) {
        doc.addPage();
      }

      // Section header: colored rounded rect with number + title
      const headerY = doc.y;
      const headerH = 26;
      const radius = 4;

      // Rounded rectangle background
      doc
        .roundedRect(ml, headerY, pw, headerH, radius)
        .fill(COLORS.sectionBg);

      // Section number circle
      const circleX = ml + 18;
      const circleY = headerY + headerH / 2;
      doc
        .circle(circleX, circleY, 9)
        .fill(COLORS.accent);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.number)
        .text(String(sectionNum), circleX - 5, circleY - 5.5, { width: 10, align: 'center' });

      // Section title text
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLORS.sectionText)
        .text(section.title, ml + 35, headerY + 7, { width: pw - 45 });

      doc.y = headerY + headerH + 12;

      // Section items
      for (const item of section.items) {
        if (doc.y > doc.page.height - 70) {
          doc.addPage();
        }

        const itemX = ml + 18;
        const textX = ml + 30;
        const textW = pw - 35;
        const bulletY = doc.y + 5;

        // Red bullet dot
        doc
          .circle(itemX, bulletY, 2.5)
          .fill(COLORS.bullet);

        // Check for sub-question in parentheses
        const parenIdx = item.lastIndexOf('(');
        const hasSubQuestion = parenIdx > 10 && item.endsWith(')');

        if (hasSubQuestion) {
          const mainText = item.substring(0, parenIdx).trim();
          const subText = item.substring(parenIdx);

          doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor(COLORS.text)
            .text(mainText, textX, doc.y, { width: textW });

          doc
            .font('Helvetica-Oblique')
            .fontSize(9.5)
            .fillColor(COLORS.subText)
            .text(subText, textX + 8, doc.y, { width: textW - 8 });
        } else {
          doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor(COLORS.text)
            .text(item, textX, doc.y, { width: textW });
        }

        doc.moveDown(0.35);
      }

      doc.moveDown(0.5);
    });

    // ── Footer note ──
    if (footer.length > 0) {
      if (doc.y > doc.page.height - 160) {
        doc.addPage();
      }

      doc.moveDown(0.3);
      drawDivider();

      // Footer background box
      const footerY = doc.y;
      const footerContentHeight = footer.length * 18 + 40;
      doc
        .roundedRect(ml, footerY, pw, footerContentHeight, 4)
        .fill(COLORS.footerBg);

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLORS.sectionBg)
        .text('A CREUSER EN PRIORITE', ml + 15, footerY + 12, { width: pw - 30 });

      doc.y = footerY + 32;

      for (const line of footer) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COLORS.text)
          .text('  -  ' + line, ml + 15, doc.y, { width: pw - 30 });
        doc.moveDown(0.15);
      }
    }

    // ── Bottom bar ──
    const bY = doc.page.height - 28;
    doc.rect(0, bY, doc.page.width, 6).fill(COLORS.accent);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.subText)
      .text('Vibe Coder', ml, bY - 12, { width: pw, align: 'center' });

    doc.end();
  });
}
