import JSZip from 'jszip';
import { StructuredResume } from '../types';
import { escapeXml } from '../utils/escapeHtml';

const BUNDLED_TEMPLATE_PATH = './templates/USQ Resume Template.docx';

function mergeFragmentedTokens(xml: string): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = doc.getElementsByTagNameNS(ns, 'p');

  for (const para of Array.from(paragraphs)) {
    const runs = para.getElementsByTagNameNS(ns, 'r');
    const textNodes: Element[] = [];

    for (const run of Array.from(runs)) {
      const tNodes = run.getElementsByTagNameNS(ns, 't');
      for (const t of Array.from(tNodes)) {
        textNodes.push(t);
      }
    }

    const fullText = textNodes.map(t => t.textContent || '').join('');
    if (!fullText.includes('{{')) continue;

    const tokenPattern = /\{\{[A-Z0-9_]+\}\}/g;
    let match;
    while ((match = tokenPattern.exec(fullText)) !== null) {
      const tokenStart = match.index;
      const tokenEnd = tokenStart + match[0].length;

      let charIdx = 0;
      let startNodeIdx = -1;
      let endNodeIdx = -1;

      for (let i = 0; i < textNodes.length; i++) {
        const nodeLen = (textNodes[i].textContent || '').length;
        if (charIdx + nodeLen > tokenStart && startNodeIdx === -1) {
          startNodeIdx = i;
        }
        if (charIdx + nodeLen >= tokenEnd) {
          endNodeIdx = i;
          break;
        }
        charIdx += nodeLen;
      }

      if (startNodeIdx !== -1 && endNodeIdx !== -1 && startNodeIdx !== endNodeIdx) {
        let combined = '';
        for (let i = startNodeIdx; i <= endNodeIdx; i++) {
          combined += textNodes[i].textContent || '';
        }
        textNodes[startNodeIdx].textContent = combined;
        for (let i = endNodeIdx; i > startNodeIdx; i--) {
          const run = textNodes[i].parentNode;
          if (run && run.parentNode) {
            run.parentNode.removeChild(run);
          }
        }
        textNodes.splice(startNodeIdx + 1, endNodeIdx - startNodeIdx);
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function replaceTokenInXml(xml: string, token: string, value: string): string {
  const escaped = escapeXml(value);
  return xml.split(token).join(escaped);
}

function buildTokenMap(resume: StructuredResume): Record<string, string> {
  const tokens: Record<string, string> = {};

  const experience = resume.experience || [];
  const skills = resume.skills || [];
  const certifications = resume.certifications || [];
  const education = resume.education || [];

  tokens['{{FULL_NAME}}'] = resume.candidateName;
  tokens['{{LATEST_TITLE}}'] = experience[0]?.title || 'Professional';

  tokens['{{PROFILE_SUMMARY}}'] = resume.summary;

  for (let i = 0; i < experience.length; i++) {
    const exp = experience[i];
    const prefix = `{{EXP${i + 1}_`;

    if (exp) {
      tokens[`${prefix}COMPANY}}`] = exp.company;
      tokens[`${prefix}DATES}}`] = `${exp.startDate} - ${exp.endDate}`;
      tokens[`${prefix}ROLE}}`] = exp.title;
      tokens[`${prefix}PROJECT}}`] = exp.projectName || '';
      const achievementText = exp.achievements?.length
        ? exp.achievements.map(a => `• ${a}`).join('\n')
        : '';
      tokens[`${prefix}DESC}}`] = achievementText || exp.description;
      tokens[`${prefix}TECH}}`] = exp.technologies?.join(', ') || '';
    } else {
      tokens[`${prefix}COMPANY}}`] = '';
      tokens[`${prefix}DATES}}`] = '';
      tokens[`${prefix}ROLE}}`] = '';
      tokens[`${prefix}PROJECT}}`] = '';
      tokens[`${prefix}DESC}}`] = '';
      tokens[`${prefix}TECH}}`] = '';
    }
  }

  const allSkills = resume.templateSkills?.length
    ? resume.templateSkills
    : skills.flatMap(cat => cat.skills);

  for (let i = 1; i <= 14; i++) {
    tokens[`{{SKILL_${i}}}`] = allSkills[i - 1] || '';
  }

  const certNames = certifications.map(c => c.name);
  tokens['{{CERT_1}}'] = certNames[0] || '';
  tokens['{{CERT_2}}'] = certNames[1] || '';

  for (let i = 0; i < 2; i++) {
    const edu = education[i];
    const prefix = `{{EDU${i + 1}_`;

    if (edu) {
      const degreeField = edu.field
        ? `${edu.degree} in ${edu.field}`
        : edu.degree;
      tokens[`${prefix}DEGREE}}`] = degreeField;
      tokens[`${prefix}DATE}}`] = edu.graduationDate;
      tokens[`${prefix}INSTITUTION}}`] = edu.institution;
    } else {
      tokens[`${prefix}DEGREE}}`] = '';
      tokens[`${prefix}DATE}}`] = '';
      tokens[`${prefix}INSTITUTION}}`] = '';
    }
  }

  return tokens;
}

function clearEmptyExperienceBlocks(xml: string): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, 'p'));

  const emptyBlockPrefixes: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const companyToken = `{{EXP${i}_COMPANY}}`;
    const isCleared = !xml.includes(companyToken) &&
      paragraphs.some(p => {
        const textNodes = p.getElementsByTagNameNS(ns, 't');
        const text = Array.from(textNodes).map(t => t.textContent || '').join('').trim();
        return text === '' || text === ' \u2014 ';
      });
    if (isCleared) {
      emptyBlockPrefixes.push(`EXP${i}`);
    }
  }

  for (const para of paragraphs) {
    const textNodes = para.getElementsByTagNameNS(ns, 't');
    const fullText = Array.from(textNodes).map(t => t.textContent || '').join('').trim();

    if (fullText === '' || fullText === 'Technologies & Tools:' || fullText === 'Technologies &amp; Tools:') {
      continue;
    }

    const isEmptyExpProjectLine = fullText === ' \u2014 ' || fullText === '\u2014' || fullText === ' — ';
    if (isEmptyExpProjectLine) {
      for (const t of Array.from(textNodes)) {
        t.textContent = '';
      }
    }

    if (fullText.length > 3 && (fullText.endsWith(' \u2014') || fullText.endsWith(' \u2014 '))) {
      for (const t of Array.from(textNodes)) {
        const content = t.textContent || '';
        if (content.includes('\u2014')) {
          t.textContent = content.replace(/\s*\u2014\s*$/, '');
        }
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function cloneExperienceBlocks(xml: string, experienceCount: number): string {
  if (experienceCount <= 3) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, 'p'));

  let exp3StartIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagNameNS(ns, 't');
    const text = Array.from(textNodes).map(t => t.textContent || '').join('');
    if (text.includes('{{EXP3_COMPANY}}')) {
      exp3StartIdx = i;
      break;
    }
  }

  if (exp3StartIdx === -1) return xml;

  const exp3Paragraphs = paragraphs.slice(exp3StartIdx, exp3StartIdx + 4);
  const insertionPoint = exp3Paragraphs[3].nextSibling;
  const parentNode = exp3Paragraphs[3].parentNode;
  if (!parentNode) return xml;

  for (let expIdx = 4; expIdx <= experienceCount; expIdx++) {
    const clonedParagraphs: Node[] = [];
    for (const para of exp3Paragraphs) {
      const clone = para.cloneNode(true) as Element;
      const textNodes = clone.getElementsByTagNameNS(ns, 't');
      for (const t of Array.from(textNodes)) {
        const content = t.textContent || '';
        t.textContent = content.replace(/EXP3_/g, `EXP${expIdx}_`);
      }
      clonedParagraphs.push(clone);
    }

    for (const cloned of clonedParagraphs) {
      parentNode.insertBefore(cloned, insertionPoint);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function findInnermostTable(tables: Element[], ns: string, textMatch: string): Element | null {
  let best: Element | null = null;
  for (const table of Array.from(tables)) {
    const textNodes = table.getElementsByTagNameNS(ns, 't');
    const tableText = Array.from(textNodes).map(t => t.textContent || '').join('');
    if (!tableText.includes(textMatch)) continue;
    const nestedTables = table.getElementsByTagNameNS(ns, 'tbl');
    if (nestedTables.length === 0) return table;
    if (!best) best = table;
  }
  return best;
}

function fillCloudSkillsTable(xml: string, cloudSkills: string[]): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  const cloudTable = findInnermostTable(
    Array.from(tables), ns, 'AI Cloud Skills and Tools'
  ) || findInnermostTable(Array.from(tables), ns, '{{CLOUD_');

  if (!cloudTable) return xml;

  const rows = Array.from(cloudTable.getElementsByTagNameNS(ns, 'tr'));
  if (rows.length < 2) return xml;

  const templateRow = rows[rows.length - 1];

  const setRowCellTexts = (row: Element, texts: string[]) => {
    const cells = row.getElementsByTagNameNS(ns, 'tc');
    for (let i = 0; i < cells.length && i < texts.length; i++) {
      const tNodes = cells[i].getElementsByTagNameNS(ns, 't');
      if (tNodes.length > 0) {
        tNodes[0].textContent = texts[i];
        for (let j = 1; j < tNodes.length; j++) {
          tNodes[j].textContent = '';
        }
      }
    }
  };

  if (cloudSkills.length === 0) {
    cloudTable.parentNode?.removeChild(cloudTable);
    return new XMLSerializer().serializeToString(doc);
  }

  const rowCount = Math.ceil(cloudSkills.length / 2);

  setRowCellTexts(templateRow, [cloudSkills[0] || '', cloudSkills[1] || '']);

  for (let r = 1; r < rowCount; r++) {
    const newRow = templateRow.cloneNode(true) as Element;
    setRowCellTexts(newRow, [cloudSkills[r * 2] || '', cloudSkills[r * 2 + 1] || '']);
    templateRow.parentNode?.insertBefore(newRow, templateRow.nextSibling);
  }

  return new XMLSerializer().serializeToString(doc);
}

function removeEmptyCertificationsTable(xml: string, certifications: { name: string }[]): string {
  if (certifications.length > 0) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  const certTable = findInnermostTable(
    Array.from(tables), ns, 'Certifications'
  ) || findInnermostTable(Array.from(tables), ns, '{{CERT_');

  if (certTable) {
    certTable.parentNode?.removeChild(certTable);
  }

  return new XMLSerializer().serializeToString(doc);
}

function keepExperienceBlocksTogether(xml: string): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, 'p'));

  const techIndices: number[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagNameNS(ns, 't');
    const text = Array.from(textNodes).map(t => t.textContent || '').join('');
    if (text.includes('Technologies') && text.includes('Tools')) {
      techIndices.push(i);
    }
  }

  for (const techIdx of techIndices) {
    for (let offset = 3; offset >= 1; offset--) {
      const paraIdx = techIdx - offset;
      if (paraIdx < 0) continue;
      const para = paragraphs[paraIdx];

      let pPr = para.getElementsByTagNameNS(ns, 'pPr')[0];
      if (!pPr) {
        pPr = doc.createElementNS(ns, 'w:pPr');
        para.insertBefore(pPr, para.firstChild);
      }

      if (pPr.getElementsByTagNameNS(ns, 'keepNext').length === 0) {
        const keepNext = doc.createElementNS(ns, 'w:keepNext');
        pPr.appendChild(keepNext);
      }

      if (pPr.getElementsByTagNameNS(ns, 'keepLines').length === 0) {
        const keepLines = doc.createElementNS(ns, 'w:keepLines');
        pPr.appendChild(keepLines);
      }
    }

    const techPara = paragraphs[techIdx];
    let techPPr = techPara.getElementsByTagNameNS(ns, 'pPr')[0];
    if (!techPPr) {
      techPPr = doc.createElementNS(ns, 'w:pPr');
      techPara.insertBefore(techPPr, techPara.firstChild);
    }
    if (techPPr.getElementsByTagNameNS(ns, 'keepLines').length === 0) {
      const keepLines = doc.createElementNS(ns, 'w:keepLines');
      techPPr.appendChild(keepLines);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function adjustNameFontSize(headerXml: string, candidateName: string): string {
  const nameLen = candidateName.length;
  if (nameLen <= 25) return headerXml;

  let newSize: string;
  if (nameLen <= 35) newSize = '52';
  else if (nameLen <= 45) newSize = '44';
  else newSize = '36';

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(headerXml, 'application/xml');
  const paragraphs = doc.getElementsByTagNameNS(ns, 'p');

  for (const para of Array.from(paragraphs)) {
    const textNodes = para.getElementsByTagNameNS(ns, 't');
    const text = Array.from(textNodes).map(t => t.textContent || '').join('');

    if (text === candidateName || text.includes(candidateName)) {
      const runs = para.getElementsByTagNameNS(ns, 'r');
      for (const run of Array.from(runs)) {
        const rPr = run.getElementsByTagNameNS(ns, 'rPr')[0];
        if (!rPr) continue;

        const szNodes = rPr.getElementsByTagNameNS(ns, 'sz');
        const szCsNodes = rPr.getElementsByTagNameNS(ns, 'szCs');

        for (const sz of Array.from(szNodes)) {
          sz.setAttribute('w:val', newSize);
        }
        for (const szCs of Array.from(szCsNodes)) {
          szCs.setAttribute('w:val', newSize);
        }
      }
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function forcePageBreakBeforeTechnicalSkills(xml: string): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = doc.getElementsByTagNameNS(ns, 'p');

  for (const para of Array.from(paragraphs)) {
    const textNodes = para.getElementsByTagNameNS(ns, 't');
    const fullText = Array.from(textNodes).map(t => t.textContent || '').join('').trim();

    if (fullText === 'Technical Skills') {
      let pPr = para.getElementsByTagNameNS(ns, 'pPr')[0];
      if (!pPr) {
        pPr = doc.createElementNS(ns, 'w:pPr');
        para.insertBefore(pPr, para.firstChild);
      }

      const existing = pPr.getElementsByTagNameNS(ns, 'pageBreakBefore');
      if (existing.length === 0) {
        const pageBreak = doc.createElementNS(ns, 'w:pageBreakBefore');
        pPr.appendChild(pageBreak);
      }
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

export const templateFillService = {
  async getTemplateBuffer(): Promise<ArrayBuffer> {
    const stored = localStorage.getItem('output_template_docx');
    if (stored) {
      try {
        const binary = atob(stored);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const buffer = bytes.buffer;

        const zip = await JSZip.loadAsync(buffer);
        const docFile = zip.file('word/document.xml');
        if (docFile) {
          const xml = await docFile.async('string');
          if (xml.includes('{{PROFILE_SUMMARY}}')) {
            return buffer;
          }
        }
      } catch {
        // Stored template is corrupt — fall through to bundled default
      }
      localStorage.removeItem('output_template_docx');
    }
    const response = await fetch(BUNDLED_TEMPLATE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load resume template: ${response.status}`);
    }
    return response.arrayBuffer();
  },

  async fillTemplate(resume: StructuredResume): Promise<Blob> {
    const buffer = await this.getTemplateBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const tokenMap = buildTokenMap(resume);

    const header2File = zip.file('word/header2.xml');
    if (header2File) {
      let header2 = await header2File.async('string');
      header2 = mergeFragmentedTokens(header2);
      for (const [token, value] of Object.entries(tokenMap)) {
        header2 = replaceTokenInXml(header2, token, value);
      }
      header2 = adjustNameFontSize(header2, resume.candidateName);
      zip.file('word/header2.xml', header2);
    }

    const docFile = zip.file('word/document.xml');
    if (docFile) {
      let docXml = await docFile.async('string');
      docXml = mergeFragmentedTokens(docXml);
      docXml = cloneExperienceBlocks(docXml, (resume.experience || []).length);
      for (const [token, value] of Object.entries(tokenMap)) {
        docXml = replaceTokenInXml(docXml, token, value);
      }
      docXml = fillCloudSkillsTable(docXml, resume.cloudSkills || []);
      docXml = removeEmptyCertificationsTable(docXml, resume.certifications || []);
      docXml = clearEmptyExperienceBlocks(docXml);
      docXml = keepExperienceBlocksTogether(docXml);
      docXml = forcePageBreakBeforeTechnicalSkills(docXml);
      zip.file('word/document.xml', docXml);
    }

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  },
};
