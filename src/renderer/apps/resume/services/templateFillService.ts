import JSZip from 'jszip';
import { StructuredResume, ExperienceEntry } from '../types';
import { escapeXml } from '../utils/escapeHtml';

const BUNDLED_TEMPLATE_PATH = './templates/USQ Resume Template.docx';

const KNOWN_TECH_NAMES: Record<string, string> = {
  'javascript': 'JavaScript', 'typescript': 'TypeScript', 'python': 'Python',
  'java': 'Java', 'c#': 'C#', 'c++': 'C++', 'go': 'Go', 'golang': 'Go',
  'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
  'kotlin': 'Kotlin', 'scala': 'Scala', 'dart': 'Dart', 'r': 'R',
  'html': 'HTML', 'css': 'CSS', 'sass': 'Sass', 'scss': 'SCSS', 'less': 'LESS',
  'sql': 'SQL', 't-sql': 'T-SQL', 'plsql': 'PL/SQL', 'pl/sql': 'PL/SQL',
  'graphql': 'GraphQL', 'bash': 'Bash', 'powershell': 'PowerShell',
  'solidity': 'Solidity', 'objective-c': 'Objective-C',
  'react': 'React', 'react native': 'React Native', 'reactjs': 'ReactJS',
  'angular': 'Angular', 'angularjs': 'AngularJS', 'vue': 'Vue', 'vue.js': 'Vue.js',
  'vuejs': 'VueJS', 'next.js': 'Next.js', 'nextjs': 'Next.js', 'nuxt': 'Nuxt',
  'nuxt.js': 'Nuxt.js', 'svelte': 'Svelte', 'tailwind css': 'Tailwind CSS',
  'tailwindcss': 'TailwindCSS', 'bootstrap': 'Bootstrap', 'jquery': 'jQuery',
  'redux': 'Redux', 'mobx': 'MobX', 'zustand': 'Zustand',
  'storybook': 'Storybook', 'webpack': 'Webpack', 'vite': 'Vite',
  'material ui': 'Material UI', 'mui': 'MUI', 'chakra ui': 'Chakra UI',
  'node.js': 'Node.js', 'nodejs': 'Node.js', 'express': 'Express',
  'express.js': 'Express.js', 'nestjs': 'NestJS', 'fastify': 'Fastify',
  'django': 'Django', 'flask': 'Flask', 'fastapi': 'FastAPI',
  'spring boot': 'Spring Boot', 'spring': 'Spring', '.net': '.NET',
  'asp.net': 'ASP.NET', 'entity framework': 'Entity Framework',
  'dapper': 'Dapper', 'ado.net': 'ADO.NET', 'rails': 'Rails',
  'ruby on rails': 'Ruby on Rails', 'laravel': 'Laravel',
  'gin': 'Gin', 'fiber': 'Fiber',
  'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL', 'mysql': 'MySQL',
  'mongodb': 'MongoDB', 'redis': 'Redis', 'sqlite': 'SQLite',
  'sql server': 'SQL Server', 'oracle': 'Oracle', 'dynamodb': 'DynamoDB',
  'cassandra': 'Cassandra', 'couchdb': 'CouchDB', 'neo4j': 'Neo4j',
  'elasticsearch': 'Elasticsearch', 'supabase': 'Supabase', 'firebase': 'Firebase',
  'firestore': 'Firestore', 'cosmosdb': 'CosmosDB', 'mariadb': 'MariaDB',
  'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'google cloud': 'Google Cloud',
  'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'K8s',
  'terraform': 'Terraform', 'ansible': 'Ansible', 'jenkins': 'Jenkins',
  'github actions': 'GitHub Actions', 'gitlab ci': 'GitLab CI',
  'circleci': 'CircleCI', 'travis ci': 'Travis CI',
  'nginx': 'NGINX', 'apache': 'Apache', 'vercel': 'Vercel', 'netlify': 'Netlify',
  'heroku': 'Heroku', 'cloudflare': 'Cloudflare',
  'aws lambda': 'AWS Lambda', 'azure functions': 'Azure Functions',
  's3': 'S3', 'ec2': 'EC2', 'ecs': 'ECS', 'eks': 'EKS',
  'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab', 'bitbucket': 'Bitbucket',
  'jira': 'Jira', 'confluence': 'Confluence', 'figma': 'Figma',
  'postman': 'Postman', 'swagger': 'Swagger', 'grafana': 'Grafana',
  'datadog': 'Datadog', 'splunk': 'Splunk', 'new relic': 'New Relic',
  'sonarqube': 'SonarQube', 'eslint': 'ESLint', 'prettier': 'Prettier',
  'jest': 'Jest', 'mocha': 'Mocha', 'cypress': 'Cypress',
  'playwright': 'Playwright', 'selenium': 'Selenium', 'vitest': 'Vitest',
  'junit': 'JUnit', 'pytest': 'pytest', 'rspec': 'RSpec',
  'testing library': 'Testing Library', 'enzyme': 'Enzyme',
  'openai': 'OpenAI', 'langchain': 'LangChain', 'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch', 'scikit-learn': 'scikit-learn', 'pandas': 'Pandas',
  'numpy': 'NumPy', 'hugging face': 'Hugging Face',
  'web3': 'Web3', 'polygon': 'Polygon', 'ethereum': 'Ethereum',
  'smart contracts': 'Smart Contracts', 'usdc': 'USDC', 'nft': 'NFT',
  'defi': 'DeFi', 'ai integration': 'AI Integration',
  'rest': 'REST', 'restful': 'RESTful', 'soap': 'SOAP', 'grpc': 'gRPC',
  'websocket': 'WebSocket', 'websockets': 'WebSockets',
  'oauth': 'OAuth', 'jwt': 'JWT', 'saml': 'SAML',
  'ci/cd': 'CI/CD', 'agile': 'Agile', 'scrum': 'Scrum', 'kanban': 'Kanban',
  'microservices': 'Microservices', 'serverless': 'Serverless',
  'rabbitmq': 'RabbitMQ', 'kafka': 'Kafka', 'sqs': 'SQS', 'sns': 'SNS',
};

function smartCaseSkill(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const lookup = KNOWN_TECH_NAMES[trimmed.toLowerCase()];
  if (lookup) return lookup;

  return trimmed.replace(/\b\w+/g, (word) => {
    if (word === word.toUpperCase() && word.length > 1) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

const HEADER_FILL = '304FF3';
const DATA_FILL_EVEN = 'FFFFFF';
const DATA_FILL_ODD = 'EEF2FF';
const DATA_TEXT_COLOR = '666666';
const DATA_FONT_SIZE = '18';
const HEADER_FONT_SIZE = '20';

function styleHeaderRow(row: Element, ns: string, doc: Document): void {
  const cells = row.getElementsByTagNameNS(ns, 'tc');
  for (const cell of Array.from(cells)) {
    const shd = cell.getElementsByTagNameNS(ns, 'shd')[0];
    if (shd) shd.setAttribute('w:fill', HEADER_FILL);

    const runs = cell.getElementsByTagNameNS(ns, 'r');
    for (const run of Array.from(runs)) {
      const rPr = run.getElementsByTagNameNS(ns, 'rPr')[0];
      if (!rPr) continue;

      let color = rPr.getElementsByTagNameNS(ns, 'color')[0];
      if (!color) {
        color = doc.createElementNS(ns, 'w:color');
        rPr.appendChild(color);
      }
      color.setAttribute('w:val', 'FFFFFF');

      for (const tag of ['sz', 'szCs']) {
        let el = rPr.getElementsByTagNameNS(ns, tag)[0];
        if (!el) {
          el = doc.createElementNS(ns, `w:${tag}`);
          rPr.appendChild(el);
        }
        el.setAttribute('w:val', HEADER_FONT_SIZE);
      }
    }
  }
}

function styleDataRow(row: Element, ns: string, doc: Document, rowIndex: number): void {
  const fill = rowIndex % 2 === 0 ? DATA_FILL_EVEN : DATA_FILL_ODD;
  const cells = row.getElementsByTagNameNS(ns, 'tc');

  for (const cell of Array.from(cells)) {
    const shd = cell.getElementsByTagNameNS(ns, 'shd')[0];
    if (shd) shd.setAttribute('w:fill', fill);

    const runs = cell.getElementsByTagNameNS(ns, 'r');
    for (const run of Array.from(runs)) {
      let rPr = run.getElementsByTagNameNS(ns, 'rPr')[0];
      if (!rPr) {
        rPr = doc.createElementNS(ns, 'w:rPr');
        run.insertBefore(rPr, run.firstChild);
      }

      for (const tag of ['i', 'iCs']) {
        const el = rPr.getElementsByTagNameNS(ns, tag)[0];
        if (el) rPr.removeChild(el);
      }

      let color = rPr.getElementsByTagNameNS(ns, 'color')[0];
      if (!color) {
        color = doc.createElementNS(ns, 'w:color');
        rPr.appendChild(color);
      }
      color.setAttribute('w:val', DATA_TEXT_COLOR);

      for (const tag of ['sz', 'szCs']) {
        let el = rPr.getElementsByTagNameNS(ns, tag)[0];
        if (!el) {
          el = doc.createElementNS(ns, `w:${tag}`);
          rPr.appendChild(el);
        }
        el.setAttribute('w:val', DATA_FONT_SIZE);
      }
    }
  }
}

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
      tokens[`${prefix}DESC}}`] = exp.description || '';
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
      const hasDrawing = para.getElementsByTagNameNS(ns, 'drawing').length > 0;
      if (!hasDrawing) {
        para.parentNode?.removeChild(para);
      }
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

function removeEmptyEducationSection(xml: string, education: { institution: string; degree: string }[]): string {
  if (education.length > 0) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, 'p'));

  let academicIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const textNodes = paragraphs[i].getElementsByTagNameNS(ns, 't');
    const text = Array.from(textNodes).map(t => t.textContent || '').join('').trim();
    if (text === 'Academic Background') {
      academicIdx = i;
      break;
    }
  }
  if (academicIdx === -1) return xml;

  const toRemove = [paragraphs[academicIdx]];
  for (let j = academicIdx + 1; j < paragraphs.length && j <= academicIdx + 4; j++) {
    const textNodes = paragraphs[j].getElementsByTagNameNS(ns, 't');
    const text = Array.from(textNodes).map(t => t.textContent || '').join('').trim();
    if (text === '') toRemove.push(paragraphs[j]);
    else break;
  }
  for (const p of toRemove) p.parentNode?.removeChild(p);
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

function getParaText(para: Element, ns: string): string {
  const textNodes = para.getElementsByTagNameNS(ns, 't');
  return Array.from(textNodes).map(t => t.textContent || '').join('');
}

function stripProjectFromRolePara(rolePara: Element, ns: string): void {
  const runs = Array.from(rolePara.getElementsByTagNameNS(ns, 'r'));
  for (const run of runs) {
    const textNodes = run.getElementsByTagNameNS(ns, 't');
    for (const t of Array.from(textNodes)) {
      const content = t.textContent || '';
      if (content.includes('—')) {
        t.textContent = '';
      }
    }
  }
}

function createProjectHeadingPara(doc: Document, ns: string, projectName: string): Element {
  const para = doc.createElementNS(ns, 'w:p');
  const pPr = doc.createElementNS(ns, 'w:pPr');
  const spacing = doc.createElementNS(ns, 'w:spacing');
  spacing.setAttribute('w:before', '120');
  spacing.setAttribute('w:after', '40');
  pPr.appendChild(spacing);
  para.appendChild(pPr);

  const run = doc.createElementNS(ns, 'w:r');
  const rPr = doc.createElementNS(ns, 'w:rPr');
  rPr.appendChild(doc.createElementNS(ns, 'w:b'));
  rPr.appendChild(doc.createElementNS(ns, 'w:bCs'));
  run.appendChild(rPr);
  const t = doc.createElementNS(ns, 'w:t');
  t.textContent = projectName;
  run.appendChild(t);
  para.appendChild(run);
  return para;
}

function replaceWithProjectHeading(rolePara: Element, ns: string, projectName: string): void {
  const runs = Array.from(rolePara.getElementsByTagNameNS(ns, 'r'));
  for (const run of runs) run.parentNode?.removeChild(run);

  const pPr = rolePara.getElementsByTagNameNS(ns, 'pPr')[0];
  if (pPr) {
    const existingSpacing = pPr.getElementsByTagNameNS(ns, 'spacing')[0];
    if (existingSpacing) {
      existingSpacing.setAttribute('w:before', '120');
      existingSpacing.setAttribute('w:after', '40');
    }
  }

  const ownerDoc = rolePara.ownerDocument;
  const run = ownerDoc.createElementNS(ns, 'w:r');
  const rPr = ownerDoc.createElementNS(ns, 'w:rPr');
  rPr.appendChild(ownerDoc.createElementNS(ns, 'w:b'));
  rPr.appendChild(ownerDoc.createElementNS(ns, 'w:bCs'));
  run.appendChild(rPr);
  const t = ownerDoc.createElementNS(ns, 'w:t');
  t.textContent = projectName;
  run.appendChild(t);
  rolePara.appendChild(run);
}

function groupMultiProjectBlocks(xml: string, experience: ExperienceEntry[]): string {
  if (experience.length < 2) return xml;

  const groups: { start: number; end: number }[] = [];
  let groupStart = 0;
  for (let i = 1; i <= experience.length; i++) {
    const prev = experience[i - 1];
    const curr = i < experience.length ? experience[i] : null;
    const sameGroup = curr &&
      curr.company === prev.company &&
      curr.title === prev.title &&
      curr.startDate === prev.startDate &&
      curr.endDate === prev.endDate &&
      (curr.projectName || prev.projectName);

    if (!sameGroup) {
      if (i - groupStart > 1) groups.push({ start: groupStart, end: i - 1 });
      groupStart = i;
    }
  }

  if (groups.length === 0) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(ns, 'p'));

  const blocks: { company: Element; role: Element; desc: Element; tech: Element }[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParaText(paragraphs[i], ns);
    if (text.includes('Technologies') && text.includes('Tools') && i >= 3) {
      blocks.push({
        company: paragraphs[i - 3],
        role: paragraphs[i - 2],
        desc: paragraphs[i - 1],
        tech: paragraphs[i],
      });
    }
  }

  for (const group of groups.reverse()) {
    for (let entryIdx = group.end; entryIdx >= group.start; entryIdx--) {
      const block = blocks[entryIdx];
      if (!block) continue;
      const exp = experience[entryIdx];
      const projectName = exp.projectName || '';

      if (entryIdx === group.start) {
        stripProjectFromRolePara(block.role, ns);
        if (projectName) {
          const projectPara = createProjectHeadingPara(doc, ns, projectName);
          block.desc.parentNode?.insertBefore(projectPara, block.desc);
        }
      } else {
        block.company.parentNode?.removeChild(block.company);
        if (projectName) {
          replaceWithProjectHeading(block.role, ns, projectName);
        } else {
          block.role.parentNode?.removeChild(block.role);
        }
      }
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

function restructureSkillsLayout(xml: string): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  let outerContainer: Element | null = null;
  for (const table of Array.from(tables)) {
    const textNodes = table.getElementsByTagNameNS(ns, 't');
    const tableText = Array.from(textNodes).map(t => t.textContent || '').join('');
    const hasSkillContent = tableText.includes('Technologies') || tableText.includes('{{SKILL_');
    const nestedTables = table.getElementsByTagNameNS(ns, 'tbl');
    if (hasSkillContent && nestedTables.length > 0) {
      outerContainer = table;
      break;
    }
  }

  if (!outerContainer) return xml;

  const outerTblPr = outerContainer.getElementsByTagNameNS(ns, 'tblPr')[0];
  let fullWidth = 9360;
  if (outerTblPr) {
    const outerTblW = outerTblPr.getElementsByTagNameNS(ns, 'tcW')[0]
      || outerTblPr.getElementsByTagNameNS(ns, 'tblW')[0];
    if (outerTblW) {
      const w = parseInt(outerTblW.getAttribute('w:w') || '0', 10);
      if (w > 0) fullWidth = w;
    }
  }

  const nestedTables = Array.from(outerContainer.getElementsByTagNameNS(ns, 'tbl'));
  const parent = outerContainer.parentNode;
  if (!parent) return xml;

  for (const innerTable of nestedTables) {
    const tblPr = innerTable.getElementsByTagNameNS(ns, 'tblPr')[0];
    if (tblPr) {
      const tblW = tblPr.getElementsByTagNameNS(ns, 'tblW')[0];
      if (tblW) {
        tblW.setAttribute('w:w', String(fullWidth));
        tblW.setAttribute('w:type', 'dxa');
      }
    }
  }

  const sortedTables: Element[] = [];
  const findByText = (text: string) =>
    nestedTables.find(t => {
      const tText = Array.from(t.getElementsByTagNameNS(ns, 't'))
        .map(n => n.textContent || '').join('');
      return tText.includes(text);
    });

  const techTable = findByText('Technologies') || findByText('{{SKILL_');
  const cloudTable = findByText('AI Cloud Skills') || findByText('AI & Cloud') || findByText('{{CLOUD_');
  const certTable = findByText('Certifications') || findByText('{{CERT_');

  if (techTable) sortedTables.push(techTable);
  if (cloudTable) sortedTables.push(cloudTable);
  if (certTable) sortedTables.push(certTable);

  const createSpacer = (): Element => {
    const p = doc.createElementNS(ns, 'w:p');
    const pPr = doc.createElementNS(ns, 'w:pPr');
    const spacing = doc.createElementNS(ns, 'w:spacing');
    spacing.setAttribute('w:before', '60');
    spacing.setAttribute('w:after', '60');
    spacing.setAttribute('w:line', '40');
    spacing.setAttribute('w:lineRule', 'exact');
    pPr.appendChild(spacing);
    p.appendChild(pPr);
    return p;
  };

  const insertionRef = outerContainer;
  for (let i = 0; i < sortedTables.length; i++) {
    if (i > 0) {
      parent.insertBefore(createSpacer(), insertionRef);
    }
    parent.insertBefore(sortedTables[i], insertionRef);
  }
  parent.removeChild(outerContainer);

  return new XMLSerializer().serializeToString(doc);
}

function fillTechnologiesTable(xml: string, skills: string[]): string {
  const filteredSkills = skills.filter(Boolean).map(smartCaseSkill);
  if (filteredSkills.length === 0) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  const techTable = findInnermostTable(
    Array.from(tables), ns, 'Technologies'
  ) || findInnermostTable(Array.from(tables), ns, '{{SKILL_');

  if (!techTable) return xml;

  const rows = Array.from(techTable.getElementsByTagNameNS(ns, 'tr'));
  if (rows.length < 2) return xml;

  const headerRow = rows[0];
  const templateDataRow = rows[1];

  for (let i = 2; i < rows.length; i++) {
    rows[i].parentNode?.removeChild(rows[i]);
  }

  const colCount = filteredSkills.length <= 6 ? 2
    : filteredSkills.length <= 9 ? 3
    : 4;

  const tblPr = techTable.getElementsByTagNameNS(ns, 'tblPr')[0];
  let tableWidth = 9360;
  if (tblPr) {
    const tblW = tblPr.getElementsByTagNameNS(ns, 'tblW')[0];
    if (tblW) {
      const w = parseInt(tblW.getAttribute('w:w') || '0', 10);
      if (w > 0) tableWidth = w;
    }
  }
  const cellWidth = Math.floor(tableWidth / colCount);

  const tblGrid = techTable.getElementsByTagNameNS(ns, 'tblGrid')[0];
  if (tblGrid) {
    const existingCols = tblGrid.getElementsByTagNameNS(ns, 'gridCol');
    while (existingCols.length > 0) {
      tblGrid.removeChild(existingCols[0]);
    }
    for (let c = 0; c < colCount; c++) {
      const gridCol = doc.createElementNS(ns, 'w:gridCol');
      gridCol.setAttribute('w:w', String(cellWidth));
      tblGrid.appendChild(gridCol);
    }
  }

  const headerCells = headerRow.getElementsByTagNameNS(ns, 'tc');
  if (headerCells.length > 0) {
    while (headerCells.length > 1) {
      headerRow.removeChild(headerCells[headerCells.length - 1]);
    }
    const hTcPr = headerCells[0].getElementsByTagNameNS(ns, 'tcPr')[0];
    if (hTcPr) {
      const hTcW = hTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
      if (hTcW) hTcW.setAttribute('w:w', String(tableWidth));
      let gridSpan = hTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
      if (!gridSpan) {
        gridSpan = doc.createElementNS(ns, 'w:gridSpan');
        hTcPr.insertBefore(gridSpan, hTcPr.firstChild);
      }
      gridSpan.setAttribute('w:val', String(colCount));
    }
  }

  styleHeaderRow(headerRow, ns, doc);

  const buildDataRow = (cellTexts: string[]): Element => {
    const newRow = templateDataRow.cloneNode(true) as Element;
    const cells = newRow.getElementsByTagNameNS(ns, 'tc');

    const templateCell = cells[0];

    while (cells.length > 1) {
      newRow.removeChild(cells[cells.length - 1]);
    }

    const firstTcPr = templateCell.getElementsByTagNameNS(ns, 'tcPr')[0];
    if (firstTcPr) {
      const tcW = firstTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
      if (tcW) tcW.setAttribute('w:w', String(cellWidth));
      const gs = firstTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
      if (gs) firstTcPr.removeChild(gs);
    }

    const tNodes = templateCell.getElementsByTagNameNS(ns, 't');
    if (tNodes.length > 0) {
      tNodes[0].textContent = cellTexts[0] || '';
      for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = '';
    }

    for (let c = 1; c < colCount; c++) {
      const clonedCell = templateCell.cloneNode(true) as Element;
      const clonedTNodes = clonedCell.getElementsByTagNameNS(ns, 't');
      if (clonedTNodes.length > 0) {
        clonedTNodes[0].textContent = cellTexts[c] || '';
        for (let j = 1; j < clonedTNodes.length; j++) clonedTNodes[j].textContent = '';
      }
      newRow.appendChild(clonedCell);
    }

    return newRow;
  };

  const rowCount = Math.ceil(filteredSkills.length / colCount);
  const firstRow = buildDataRow(filteredSkills.slice(0, colCount));
  styleDataRow(firstRow, ns, doc, 0);
  templateDataRow.parentNode?.replaceChild(firstRow, templateDataRow);

  let lastInserted = firstRow;
  for (let r = 1; r < rowCount; r++) {
    const start = r * colCount;
    const rowTexts = filteredSkills.slice(start, start + colCount);
    const newRow = buildDataRow(rowTexts);
    styleDataRow(newRow, ns, doc, r);
    lastInserted.parentNode?.insertBefore(newRow, lastInserted.nextSibling);
    lastInserted = newRow;
  }

  return new XMLSerializer().serializeToString(doc);
}

function fillCloudSkillsTable(xml: string, cloudSkills: string[]): string {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  const cloudTable = findInnermostTable(
    Array.from(tables), ns, 'AI Cloud Skills and Tools'
  ) || findInnermostTable(
    Array.from(tables), ns, 'AI & Cloud'
  ) || findInnermostTable(Array.from(tables), ns, '{{CLOUD_');

  if (!cloudTable) return xml;

  const rows = Array.from(cloudTable.getElementsByTagNameNS(ns, 'tr'));
  if (rows.length < 2) return xml;

  const templateRow = rows[rows.length - 1];

  const casedSkills = cloudSkills.map(smartCaseSkill);

  if (casedSkills.length === 0) {
    cloudTable.parentNode?.removeChild(cloudTable);
    return new XMLSerializer().serializeToString(doc);
  }

  const colCount = casedSkills.length <= 4 ? 2 : 3;

  const tblPr = cloudTable.getElementsByTagNameNS(ns, 'tblPr')[0];
  let tableWidth = 9360;
  if (tblPr) {
    const tblW = tblPr.getElementsByTagNameNS(ns, 'tblW')[0];
    if (tblW) {
      const w = parseInt(tblW.getAttribute('w:w') || '0', 10);
      if (w > 0) tableWidth = w;
    }
  }
  const cellWidth = Math.floor(tableWidth / colCount);

  const tblGrid = cloudTable.getElementsByTagNameNS(ns, 'tblGrid')[0];
  if (tblGrid) {
    const existingCols = tblGrid.getElementsByTagNameNS(ns, 'gridCol');
    while (existingCols.length > 0) {
      tblGrid.removeChild(existingCols[0]);
    }
    for (let c = 0; c < colCount; c++) {
      const gridCol = doc.createElementNS(ns, 'w:gridCol');
      gridCol.setAttribute('w:w', String(cellWidth));
      tblGrid.appendChild(gridCol);
    }
  }

  const headerRow = rows[0];
  const headerCells = headerRow.getElementsByTagNameNS(ns, 'tc');
  if (headerCells.length > 0) {
    while (headerCells.length > 1) {
      headerRow.removeChild(headerCells[headerCells.length - 1]);
    }
    const hTcPr = headerCells[0].getElementsByTagNameNS(ns, 'tcPr')[0];
    if (hTcPr) {
      const hTcW = hTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
      if (hTcW) hTcW.setAttribute('w:w', String(tableWidth));
      let gridSpan = hTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
      if (!gridSpan) {
        gridSpan = doc.createElementNS(ns, 'w:gridSpan');
        hTcPr.insertBefore(gridSpan, hTcPr.firstChild);
      }
      gridSpan.setAttribute('w:val', String(colCount));
    }
  }

  const headerTextNodes = headerRow.getElementsByTagNameNS(ns, 't');
  for (const t of Array.from(headerTextNodes)) {
    if ((t.textContent || '').includes('AI Cloud Skills')) {
      t.textContent = 'AI & Cloud - Skills and Tools';
    }
  }

  styleHeaderRow(headerRow, ns, doc);

  const buildCloudRow = (texts: string[]): Element => {
    const newRow = templateRow.cloneNode(true) as Element;
    const cells = newRow.getElementsByTagNameNS(ns, 'tc');
    const templateCell = cells[0];

    while (cells.length > 1) {
      newRow.removeChild(cells[cells.length - 1]);
    }

    const firstTcPr = templateCell.getElementsByTagNameNS(ns, 'tcPr')[0];
    if (firstTcPr) {
      const tcW = firstTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
      if (tcW) tcW.setAttribute('w:w', String(cellWidth));
      const gs = firstTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
      if (gs) firstTcPr.removeChild(gs);
    }
    const tNodes = templateCell.getElementsByTagNameNS(ns, 't');
    if (tNodes.length > 0) {
      tNodes[0].textContent = texts[0] || '';
      for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = '';
    }
    for (let c = 1; c < colCount; c++) {
      const clonedCell = templateCell.cloneNode(true) as Element;
      const clonedTNodes = clonedCell.getElementsByTagNameNS(ns, 't');
      if (clonedTNodes.length > 0) {
        clonedTNodes[0].textContent = texts[c] || '';
        for (let j = 1; j < clonedTNodes.length; j++) clonedTNodes[j].textContent = '';
      }
      newRow.appendChild(clonedCell);
    }

    return newRow;
  };

  const rowCount = Math.ceil(casedSkills.length / colCount);
  const firstRow = buildCloudRow(casedSkills.slice(0, colCount));
  styleDataRow(firstRow, ns, doc, 0);
  templateRow.parentNode?.replaceChild(firstRow, templateRow);

  let lastInserted = firstRow;
  for (let r = 1; r < rowCount; r++) {
    const start = r * colCount;
    const rowTexts = casedSkills.slice(start, start + colCount);
    const newRow = buildCloudRow(rowTexts);
    styleDataRow(newRow, ns, doc, r);
    lastInserted.parentNode?.insertBefore(newRow, lastInserted.nextSibling);
    lastInserted = newRow;
  }

  return new XMLSerializer().serializeToString(doc);
}

function fillCertificationsTable(xml: string, certifications: { name: string }[]): string {
  if (certifications.length === 0) return xml;

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(ns, 'tbl');

  const certTable = findInnermostTable(
    Array.from(tables), ns, 'Certifications'
  ) || findInnermostTable(Array.from(tables), ns, '{{CERT_');

  if (!certTable) return xml;

  const rows = Array.from(certTable.getElementsByTagNameNS(ns, 'tr'));
  if (rows.length < 2) return xml;

  const templateRow = rows[rows.length - 1];

  const tblPr = certTable.getElementsByTagNameNS(ns, 'tblPr')[0];
  let tableWidth = 9360;
  if (tblPr) {
    const tblW = tblPr.getElementsByTagNameNS(ns, 'tblW')[0];
    if (tblW) {
      const w = parseInt(tblW.getAttribute('w:w') || '0', 10);
      if (w > 0) tableWidth = w;
    }
  }

  const maxNameLength = Math.max(...certifications.map(c => c.name.length));
  const certColCount = maxNameLength <= 35 ? 2 : 1;
  const cellWidth = Math.floor(tableWidth / certColCount);

  const tblGrid = certTable.getElementsByTagNameNS(ns, 'tblGrid')[0];
  if (tblGrid) {
    const existingCols = tblGrid.getElementsByTagNameNS(ns, 'gridCol');
    while (existingCols.length > 0) {
      tblGrid.removeChild(existingCols[0]);
    }
    for (let c = 0; c < certColCount; c++) {
      const gridCol = doc.createElementNS(ns, 'w:gridCol');
      gridCol.setAttribute('w:w', String(cellWidth));
      tblGrid.appendChild(gridCol);
    }
  }

  const headerRow = rows[0];
  const headerCells = headerRow.getElementsByTagNameNS(ns, 'tc');
  if (headerCells.length > 0) {
    while (headerCells.length > 1) {
      headerRow.removeChild(headerCells[headerCells.length - 1]);
    }
    const hTcPr = headerCells[0].getElementsByTagNameNS(ns, 'tcPr')[0];
    if (hTcPr) {
      const hTcW = hTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
      if (hTcW) hTcW.setAttribute('w:w', String(tableWidth));
      let gridSpan = hTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
      if (!gridSpan) {
        gridSpan = doc.createElementNS(ns, 'w:gridSpan');
        hTcPr.insertBefore(gridSpan, hTcPr.firstChild);
      }
      gridSpan.setAttribute('w:val', String(certColCount));
    }
  }

  styleHeaderRow(headerRow, ns, doc);

  if (certColCount === 1) {
    const buildSingleCellRow = (certName: string): Element => {
      const newRow = templateRow.cloneNode(true) as Element;
      const cells = newRow.getElementsByTagNameNS(ns, 'tc');

      while (cells.length > 1) {
        newRow.removeChild(cells[cells.length - 1]);
      }

      const firstCell = cells[0];
      const tcPr = firstCell.getElementsByTagNameNS(ns, 'tcPr')[0];
      if (tcPr) {
        const tcW = tcPr.getElementsByTagNameNS(ns, 'tcW')[0];
        if (tcW) tcW.setAttribute('w:w', String(tableWidth));

        let gridSpan = tcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
        if (!gridSpan) {
          gridSpan = doc.createElementNS(ns, 'w:gridSpan');
          tcPr.insertBefore(gridSpan, tcPr.firstChild);
        }
        gridSpan.setAttribute('w:val', '1');
      }

      const tNodes = firstCell.getElementsByTagNameNS(ns, 't');
      if (tNodes.length > 0) {
        tNodes[0].textContent = certName;
        for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = '';
      }

      return newRow;
    };

    const parent = templateRow.parentNode;
    const firstCertRow = buildSingleCellRow(certifications[0].name);
    styleDataRow(firstCertRow, ns, doc, 0);
    parent?.replaceChild(firstCertRow, templateRow);

    let lastInserted = firstCertRow;
    for (let i = 1; i < certifications.length; i++) {
      const newRow = buildSingleCellRow(certifications[i].name);
      styleDataRow(newRow, ns, doc, i);
      parent?.insertBefore(newRow, lastInserted.nextSibling);
      lastInserted = newRow;
    }
  } else {
    const certNames = certifications.map(c => c.name);

    const buildCertRow = (texts: string[]): Element => {
      const newRow = templateRow.cloneNode(true) as Element;
      const cells = newRow.getElementsByTagNameNS(ns, 'tc');
      const templateCell = cells[0];

      while (cells.length > 1) {
        newRow.removeChild(cells[cells.length - 1]);
      }

      const firstTcPr = templateCell.getElementsByTagNameNS(ns, 'tcPr')[0];
      if (firstTcPr) {
        const tcW = firstTcPr.getElementsByTagNameNS(ns, 'tcW')[0];
        if (tcW) tcW.setAttribute('w:w', String(cellWidth));
        const gs = firstTcPr.getElementsByTagNameNS(ns, 'gridSpan')[0];
        if (gs) firstTcPr.removeChild(gs);
      }
      const tNodes = templateCell.getElementsByTagNameNS(ns, 't');
      if (tNodes.length > 0) {
        tNodes[0].textContent = texts[0] || '';
        for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = '';
      }

      for (let c = 1; c < certColCount; c++) {
        const clonedCell = templateCell.cloneNode(true) as Element;
        const clonedTNodes = clonedCell.getElementsByTagNameNS(ns, 't');
        if (clonedTNodes.length > 0) {
          clonedTNodes[0].textContent = texts[c] || '';
          for (let j = 1; j < clonedTNodes.length; j++) clonedTNodes[j].textContent = '';
        }
        newRow.appendChild(clonedCell);
      }

      return newRow;
    };

    const rowCount = Math.ceil(certNames.length / certColCount);
    const firstRow = buildCertRow(certNames.slice(0, certColCount));
    styleDataRow(firstRow, ns, doc, 0);
    templateRow.parentNode?.replaceChild(firstRow, templateRow);

    let lastInserted = firstRow;
    for (let r = 1; r < rowCount; r++) {
      const start = r * certColCount;
      const rowTexts = certNames.slice(start, start + certColCount);
      const newRow = buildCertRow(rowTexts);
      styleDataRow(newRow, ns, doc, r);
      lastInserted.parentNode?.insertBefore(newRow, lastInserted.nextSibling);
      lastInserted = newRow;
    }
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

      if (pPr.getElementsByTagNameNS(ns, 'keepLines').length === 0) {
        const keepLines = doc.createElementNS(ns, 'w:keepLines');
        pPr.insertBefore(keepLines, pPr.firstChild);
      }

      if (pPr.getElementsByTagNameNS(ns, 'keepNext').length === 0) {
        const keepNext = doc.createElementNS(ns, 'w:keepNext');
        pPr.insertBefore(keepNext, pPr.firstChild);
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
      techPPr.insertBefore(keepLines, techPPr.firstChild);
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
        pPr.insertBefore(pageBreak, pPr.firstChild);
      }
      break;
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function deduplicateParaIds(xml: string): string {
  const generateId = () =>
    Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join('');

  const seenParaIds = new Set<string>();
  let result = xml.replace(/w14:paraId="([A-Fa-f0-9]{8})"/g, (match, id) => {
    if (seenParaIds.has(id)) {
      const newId = generateId();
      seenParaIds.add(newId);
      return `w14:paraId="${newId}"`;
    }
    seenParaIds.add(id);
    return match;
  });

  const seenTextIds = new Set<string>();
  result = result.replace(/w14:textId="([A-Fa-f0-9]{8})"/g, (match, id) => {
    if (id === '77777777') return match;
    if (seenTextIds.has(id)) {
      const newId = generateId();
      seenTextIds.add(newId);
      return `w14:textId="${newId}"`;
    }
    seenTextIds.add(id);
    return match;
  });

  return result;
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
      header2 = deduplicateParaIds(header2);
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
      docXml = groupMultiProjectBlocks(docXml, resume.experience || []);
      docXml = restructureSkillsLayout(docXml);

      const templateSkills = (resume.templateSkills || []).filter(Boolean);
      docXml = fillTechnologiesTable(docXml, templateSkills);

      const sortedCloudSkills = [...(resume.cloudSkills || [])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      docXml = fillCloudSkillsTable(docXml, sortedCloudSkills);

      const certsWithIssuer = (resume.certifications || []).map(c => {
        if (c.issuer && !c.name.toLowerCase().includes(c.issuer.toLowerCase())) {
          return { name: `${c.name} (${c.issuer})` };
        }
        return { name: c.name };
      });
      docXml = fillCertificationsTable(docXml, certsWithIssuer);
      docXml = removeEmptyCertificationsTable(docXml, certsWithIssuer);
      docXml = removeEmptyEducationSection(docXml, resume.education || []);
      docXml = clearEmptyExperienceBlocks(docXml);
      docXml = keepExperienceBlocksTogether(docXml);
      docXml = forcePageBreakBeforeTechnicalSkills(docXml);
      docXml = deduplicateParaIds(docXml);
      zip.file('word/document.xml', docXml);
    }

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  },
};
