import PDFDocument from 'pdfkit';
import type { ResearchResult } from '@vibe-coder/core';

export async function generateResearchPDF(research: ResearchResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: research.title,
        Author: 'Vibe Coder - Agent de Recherche',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // margins

    // === TITLE PAGE ===
    doc.moveDown(6);
    doc.fontSize(28).font('Helvetica-Bold');
    doc.text(research.title, { align: 'center', width: pageWidth });

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica');
    const date = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Document genere le ${date}`, { align: 'center', width: pageWidth });
    doc.text('Agent de Recherche - Vibe Coder', { align: 'center', width: pageWidth });

    // === SUMMARY ===
    doc.addPage();

    doc.fontSize(18).font('Helvetica-Bold');
    doc.text('Resume', { width: pageWidth });
    doc.moveDown(0.5);

    // Separator line
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#333333');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(research.summary, { width: pageWidth, lineGap: 4 });
    doc.moveDown(1.5);

    // === SECTIONS ===
    for (const section of research.sections) {
      // Check if we need a new page (less than 150pt remaining)
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      doc.fontSize(16).font('Helvetica-Bold');
      doc.text(section.heading, { width: pageWidth });
      doc.moveDown(0.3);

      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#999999');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica');

      // Split content into paragraphs
      const paragraphs = section.content.split('\n').filter((p) => p.trim());
      for (const paragraph of paragraphs) {
        doc.text(paragraph.trim(), { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.5);
      }

      doc.moveDown(1);
    }

    // === RECOMMENDATIONS ===
    if (research.recommendations.length > 0) {
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
      }

      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('Recommandations', { width: pageWidth });
      doc.moveDown(0.3);

      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#333333');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica');
      for (let i = 0; i < research.recommendations.length; i++) {
        doc.text(`${i + 1}. ${research.recommendations[i]}`, {
          width: pageWidth,
          lineGap: 3,
        });
        doc.moveDown(0.3);
      }
      doc.moveDown(1);
    }

    // === SOURCES ===
    if (research.sources.length > 0) {
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Sources', { width: pageWidth });
      doc.moveDown(0.3);

      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#999999');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      for (const source of research.sources) {
        doc.text(`- ${source}`, { width: pageWidth, lineGap: 2 });
      }
    }

    doc.end();
  });
}
