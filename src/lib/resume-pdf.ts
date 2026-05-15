/**
 * Parse the resume markdown and render it as a styled HTML document,
 * then open a print dialog for PDF export.
 */
export function downloadResumePDF(markdown: string, filename = "Resume") {
  const html = markdownToResumeHTML(markdown);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site to download the PDF.");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts and rendering, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };
}

/**
 * Parse the resume markdown and generate a Word (.docx) document
 * following the specific constraints of the Document Skill.
 */
export async function downloadResumeDOCX(markdown: string, filename = "Resume") {
  try {
    const docx = await import("docx");
    const doc = markdownToResumeDOCX(markdown, docx);
    const blob = await docx.Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to generate DOCX:", err);
    alert("Failed to generate Word document. Please ensure dependencies are installed.");
  }
}

/**
 * Convert the resume markdown into a fully self-contained styled HTML page.
 * Designed for the consistent structure:
 *   - Header row (name | title | location | phone | url)
 *   - Sections: PROFESSIONAL PROFILE, PROFESSIONAL EXPERIENCE, KEY PROJECTS, TECHNICAL SKILLS
 *   - Bold section headings, italic date ranges, bullet lists, skills table
 */
function markdownToResumeHTML(md: string): string {
  // Normalize line endings
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let bodyHTML = "";
  let inList = false;
  let inTable = false;
  let tableRows: string[] = [];
  let isFirstTable = true; // First table is the header

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip markdown table alignment rows
    if (/^\|[\s:_-]+\|/.test(trimmed) && !trimmed.replace(/[\s|:\-]/g, "")) {
      continue;
    }

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inList) { bodyHTML += "</ul>"; inList = false; }

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => processInline(c.trim()));

      if (isFirstTable && !inTable) {
        // This is the header table (name, title, contact)
        bodyHTML += renderHeaderTable(cells);
        isFirstTable = false;
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(renderTableRow(cells, tableRows.length === 0));
      continue;
    }

    // Close table if we left it
    if (inTable) {
      bodyHTML += `<table class="skills-table"><tbody>${tableRows.join("")}</tbody></table>`;
      inTable = false;
      tableRows = [];
    }

    // Empty line
    if (!trimmed) {
      if (inList) { bodyHTML += "</ul>"; inList = false; }
      continue;
    }

    // Bullet points
    if (/^[\*\-–]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[\*\-–]\s+/, "").replace(/^\d+\.\s+/, "");
      if (!inList) { bodyHTML += '<ul>'; inList = true; }
      bodyHTML += `<li>${processInline(content)}</li>`;
      continue;
    }

    // Section headings (bold uppercase text like **PROFESSIONAL PROFILE**)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      if (inList) { bodyHTML += "</ul>"; inList = false; }
      const text = boldMatch[1];

      // Check if it's a major section heading (all-caps or mostly caps)
      const isSectionHeading = /^[A-Z\s&\-–—,()\/]+$/.test(text) || 
        ["PROFESSIONAL PROFILE", "PROFESSIONAL EXPERIENCE", "TECHNICAL SKILLS", "KEY"].some(k => text.toUpperCase().includes(k));

      if (isSectionHeading) {
        bodyHTML += `<h2 class="section-heading">${text}</h2>`;
      } else {
        // It's a sub-heading (job title, project name)
        bodyHTML += `<p class="sub-heading">${processInline(trimmed)}</p>`;
      }
      continue;
    }

    // Job title lines with date: **Title** | Company *Date*
    if (trimmed.includes("**") && (trimmed.includes("|") || trimmed.includes("*"))) {
      if (inList) { bodyHTML += "</ul>"; inList = false; }
      bodyHTML += `<p class="job-line">${processInline(trimmed)}</p>`;
      continue;
    }

    // Regular paragraph / indented text
    if (inList) { bodyHTML += "</ul>"; inList = false; }
    bodyHTML += `<p>${processInline(trimmed)}</p>`;
  }

  if (inList) bodyHTML += "</ul>";
  if (inTable) {
    bodyHTML += `<table class="skills-table"><tbody>${tableRows.join("")}</tbody></table>`;
  }

  return wrapInDocument(bodyHTML);
}

/** Process inline markdown: bold, italic, links, code */
function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

/** Render the header table (first row = name, title, contact) */
function renderHeaderTable(cells: string[]): string {
  if (cells.length === 0) return "";
  // First cell is typically "Name Title", rest are contact details
  const nameTitle = cells[0] || "";
  const contact = cells.slice(1).filter(Boolean);

  return `
    <div class="resume-header">
      <h1 class="name-title">${nameTitle}</h1>
      <div class="contact-row">${contact.join(" &nbsp;|&nbsp; ")}</div>
    </div>
    <hr class="header-rule" />
  `;
}

/** Render a skills table row */
function renderTableRow(cells: string[], _isFirst: boolean): string {
  if (cells.length < 2) return `<tr><td colspan="2">${cells[0] || ""}</td></tr>`;
  return `<tr><td class="skill-cat">${cells[0]}</td><td class="skill-val">${cells.slice(1).join(" | ")}</td></tr>`;
}

/** Wrap body HTML in a full styled document for print */
function wrapInDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 15mm 18mm 15mm 18mm;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .resume-header {
      text-align: center;
      margin-bottom: 4px;
    }

    .name-title {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .contact-row {
      font-size: 9pt;
      color: #475569;
      letter-spacing: 0.3px;
    }

    .contact-row a {
      color: #2563eb;
      text-decoration: none;
    }

    .header-rule {
      border: none;
      border-top: 2px solid #2563eb;
      margin: 10px 0 14px 0;
    }

    /* ── Section Headings ── */
    h2.section-heading {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    /* ── Job Lines / Sub-headings ── */
    .job-line, .sub-heading {
      font-size: 10pt;
      margin-top: 10px;
      margin-bottom: 4px;
    }

    .job-line strong, .sub-heading strong {
      font-weight: 600;
      color: #0f172a;
    }

    .job-line em, .sub-heading em {
      font-style: italic;
      color: #64748b;
      font-size: 9pt;
    }

    /* ── Paragraphs ── */
    p {
      margin-bottom: 6px;
      color: #334155;
      text-align: justify;
    }

    /* ── Bullet Lists ── */
    ul {
      margin: 4px 0 8px 0;
      padding-left: 18px;
    }

    li {
      margin-bottom: 3px;
      color: #334155;
      font-size: 9.5pt;
      line-height: 1.45;
    }

    li::marker {
      color: #2563eb;
    }

    /* ── Skills Table ── */
    .skills-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .skills-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .skill-cat {
      width: 22%;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      white-space: nowrap;
    }

    .skill-val {
      color: #334155;
      line-height: 1.45;
    }

    /* ── Links ── */
    a {
      color: #2563eb;
      text-decoration: none;
    }

    code {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* ── Print Tweaks ── */
    @media print {
      body { background: white; }
      .resume-header, h2.section-heading { break-after: avoid; }
      .job-line, .sub-heading { break-after: avoid; }
      ul { break-inside: avoid; }
      .skills-table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

/**
 * Convert resume markdown into a docx Document object.
 * Implements logic from DOCUMENT_SKILL.md.
 */
function markdownToResumeDOCX(md: string, docx: any): any {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell } = docx;
  
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const children: any[] = [];
  
  let inTable = false;
  let tableRowsData: string[][] = [];

  const arial = "Arial";
  const border = { style: "single", size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table Handling (Technical Skills)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|[\s:_-]+\|/.test(trimmed) && !trimmed.replace(/[\s|:\-]/g, "")) continue;
      
      const cells = trimmed.slice(1, -1).split("|").map(c => c.trim());
      
      if (children.length === 0 && tableRowsData.length === 0) {
        // Header Table (Special Case)
        const nameTitle = cells[0] || "";
        const contact = cells.slice(1).filter(Boolean).join(" | ");
        
        children.push(new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: nameTitle, bold: true, size: 32, font: arial, color: "0F172A" })]
        }));
        children.push(new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: contact, size: 18, font: arial, color: "475569" })]
        }));
        // Blue divider line
        children.push(new Paragraph({
          border: { bottom: { style: "single", size: 12, color: "2563EB", space: 4 } }
        }));
        continue;
      }

      inTable = true;
      tableRowsData.push(cells);
      continue;
    }

    // Flush table
    if (inTable && !trimmed.startsWith("|")) {
      children.push(renderDocxSkillsTable(tableRowsData, arial, borders, docx));
      inTable = false;
      tableRowsData = [];
    }

    if (!trimmed) continue;

    // Bullet Points
    if (/^[\*\-–]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[\*\-–]\s+/, "").replace(/^\d+\.\s+/, "");
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: content, size: 20, font: arial })],
        spacing: { after: 80 }
      }));
      continue;
    }

    // Section Headings
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      const text = boldMatch[1];
      const isMajor = /^[A-Z\s&\-–—,()\/]+$/.test(text) || ["PROFESSIONAL", "TECHNICAL", "SKILLS"].some(k => text.toUpperCase().includes(k));
      
      if (isMajor) {
        children.push(new Paragraph({
          heading: "Heading2",
          children: [new TextRun({ text: text, bold: true, size: 22, font: arial, color: "0F172A" })],
          border: { bottom: { style: "single", size: 1, color: "CBD5E1" } },
          spacing: { before: 240, after: 120 },
          outlineLevel: 1
        }));
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: text, bold: true, size: 20, font: arial })],
          spacing: { before: 120, after: 40 }
        }));
      }
      continue;
    }

    // Regular Paragraph
    children.push(new Paragraph({
      children: [new TextRun({ text: trimmed.replace(/\*\*/g, ""), size: 20, font: arial })],
      spacing: { after: 120 }
    }));
  }

  // Final flush
  if (inTable) {
    children.push(renderDocxSkillsTable(tableRowsData, arial, borders, docx));
  }

  return new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: "bullet", text: "•", alignment: "left", style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children
    }]
  });
}

function renderDocxSkillsTable(data: string[][], font: string, borders: any, docx: any): any {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, ShadingType } = docx;
  const rows = data.map(cells => new TableRow({
    children: [
      new TableCell({
        width: { size: 2000, type: "dxa" },
        shading: { fill: "F8FAF8", type: "clear" },
        borders,
        children: [new Paragraph({ children: [new TextRun({ text: cells[0] || "", bold: true, size: 18, font })] })]
      }),
      new TableCell({
        width: { size: 7360, type: "dxa" },
        borders,
        children: [new Paragraph({ children: [new TextRun({ text: cells.slice(1).join(" | "), size: 18, font })] })]
      })
    ]
  }));

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2000, 7360],
    rows
  });
}
