import PptxGenJS from 'pptxgenjs';

interface SlideData {
  title: string;
  bullets: string[];
  notes?: string;
}

interface PresentationData {
  title: string;
  subtitle?: string;
  slides: SlideData[];
}

// Color palette
const COLORS = {
  primary: '1a1a2e',
  accent: '16213e',
  highlight: '0f3460',
  text: '2d2d2d',
  lightText: '666666',
  white: 'FFFFFF',
  background: 'F8F9FA',
  accentBlue: '4A90D9',
} as const;

function addTitleSlide(pptx: PptxGenJS, data: PresentationData): void {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };

  // Title
  slide.addText(data.title, {
    x: 0.8,
    y: 1.5,
    w: 8.4,
    h: 1.5,
    fontSize: 36,
    fontFace: 'Arial',
    color: COLORS.white,
    bold: true,
    align: 'left',
  });

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.8,
      y: 3.2,
      w: 8.4,
      h: 0.8,
      fontSize: 18,
      fontFace: 'Arial',
      color: COLORS.accentBlue,
      align: 'left',
    });
  }

  // Bottom accent line
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.8,
    y: 4.5,
    w: 2,
    h: 0.05,
    fill: { color: COLORS.accentBlue },
  });
}

function addContentSlide(pptx: PptxGenJS, slideData: SlideData, slideNum: number, total: number): void {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };

  // Top accent bar
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.08,
    fill: { color: COLORS.accentBlue },
  });

  // Title
  slide.addText(slideData.title, {
    x: 0.8,
    y: 0.4,
    w: 8.4,
    h: 0.8,
    fontSize: 24,
    fontFace: 'Arial',
    color: COLORS.primary,
    bold: true,
    align: 'left',
  });

  // Separator line
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.8,
    y: 1.2,
    w: 1.5,
    h: 0.03,
    fill: { color: COLORS.accentBlue },
  });

  // Bullet points
  const bulletText = slideData.bullets.map((b) => ({
    text: b,
    options: {
      fontSize: 16,
      fontFace: 'Arial' as const,
      color: COLORS.text,
      bullet: { code: '2022' },
      paraSpaceAfter: 8,
    },
  }));

  slide.addText(bulletText, {
    x: 0.8,
    y: 1.5,
    w: 8.4,
    h: 3.5,
    valign: 'top',
  });

  // Slide number
  slide.addText(`${slideNum} / ${total}`, {
    x: 8.5,
    y: 5.0,
    w: 1,
    h: 0.4,
    fontSize: 10,
    fontFace: 'Arial',
    color: COLORS.lightText,
    align: 'right',
  });

  // Notes
  if (slideData.notes) {
    slide.addNotes(slideData.notes);
  }
}

export async function buildPptx(data: PresentationData): Promise<Buffer> {
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Artisan AI';
  pptx.title = data.title;
  pptx.subject = data.title;

  // Title slide
  addTitleSlide(pptx, data);

  // Content slides
  const totalSlides = data.slides.length;
  for (let i = 0; i < data.slides.length; i++) {
    addContentSlide(pptx, data.slides[i]!, i + 1, totalSlides);
  }

  // Generate buffer
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}
