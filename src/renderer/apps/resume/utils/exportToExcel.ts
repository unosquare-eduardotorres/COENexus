import JSZip from 'jszip';

export interface ColumnDef {
  header: string;
  key?: string;
  accessor?: (row: Record<string, unknown>) => string | number | boolean | null | undefined;
  type?: 'number' | 'string' | 'score' | 'hyperlink';
  width?: number;
}

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_CONTENT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_DRAW = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_DRAW_SS = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';

const DEFAULT_WIDTHS: Record<string, number> = {
  rank: 6, matchScore: 8, name: 22, candidateStatus: 12, seniority: 12,
  role: 24, mainSkill: 16, country: 14, expectedSalary: 16, currentSalary: 16,
  lastStatusUpdate: 14, type: 12, technical: 13, domain: 13, leadership: 13,
  softSkills: 14, availability: 13, sharepointUrl: 14,
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

function xmlCell(ref: string, value: number | string, styleIndex: number, isSharedString: boolean): string {
  const sAttr = styleIndex > 0 ? ` s="${styleIndex}"` : '';
  if (isSharedString) {
    return `<c r="${ref}"${sAttr} t="s"><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${sAttr}><v>${value}</v></c>`;
}

function resolveValue(col: ColumnDef, record: Record<string, unknown>): string | number | boolean | null | undefined {
  if (col.accessor) return col.accessor(record);
  if (col.key) return record[col.key] as string | number | boolean | null | undefined;
  return undefined;
}

function getScoreStyle(value: number, isAltRow: boolean): number {
  if (value >= 85) return isAltRow ? 7 : 2;
  if (value >= 70) return isAltRow ? 8 : 3;
  return isAltRow ? 9 : 4;
}

function buildStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS_MAIN}">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="0"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF065F46"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF92400E"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF991B1B"/><name val="Calibri"/></font>
    <font><u/><sz val="11"/><color rgb="FF1D4ED8"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0D9488"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF9FAFB"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function buildSharedStrings(strings: string[]): string {
  const items = strings.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="${NS_MAIN}" count="${strings.length}" uniqueCount="${strings.length}">
${items}
</sst>`;
}

interface StringTable {
  table: string[];
  index: Map<string, number>;
}

function getStringIndex(st: StringTable, val: string): number {
  const existing = st.index.get(val);
  if (existing !== undefined) return existing;
  const idx = st.table.length;
  st.table.push(val);
  st.index.set(val, idx);
  return idx;
}

interface HyperlinkEntry {
  ref: string;
  url: string;
  rId: string;
}

function buildDataSheet(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  st: StringTable,
): { xml: string; hyperlinks: HyperlinkEntry[] } {
  const colCount = columns.length;
  const lastCol = colLetter(colCount - 1);
  const totalRows = data.length + 1;

  const colsXml = columns
    .map((col, i) => {
      const w = col.width ?? (col.key ? DEFAULT_WIDTHS[col.key] : undefined) ?? 14;
      return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`;
    })
    .join('');

  const headerCells = columns
    .map((col, ci) => xmlCell(cellRef(ci, 1), getStringIndex(st, col.header), 1, true))
    .join('');
  const headerRowXml = `<row r="1">${headerCells}</row>`;

  const hyperlinks: HyperlinkEntry[] = [];
  const dataRows: string[] = [];

  for (let ri = 0; ri < data.length; ri++) {
    const record = data[ri];
    const rowNum = ri + 2;
    const isAlt = ri % 2 === 1;
    const defaultStyle = isAlt ? 6 : 0;

    const cells = columns.map((col, ci) => {
      const ref = cellRef(ci, rowNum);
      const raw = resolveValue(col, record);

      if (col.type === 'hyperlink') {
        const url = raw != null ? String(raw) : '';
        if (url) {
          const rId = `rId${hyperlinks.length + 1}`;
          hyperlinks.push({ ref, url, rId });
          const ssIdx = getStringIndex(st, 'Open');
          return xmlCell(ref, ssIdx, 5, true);
        }
        const ssIdx = getStringIndex(st, '');
        return xmlCell(ref, ssIdx, defaultStyle, true);
      }

      if (col.type === 'score' && typeof raw === 'number') {
        const style = getScoreStyle(raw, isAlt);
        return xmlCell(ref, raw, style, false);
      }

      if (col.type === 'number' && typeof raw === 'number') {
        return xmlCell(ref, raw, defaultStyle, false);
      }

      if (typeof raw === 'number') {
        return xmlCell(ref, raw, defaultStyle, false);
      }

      if (typeof raw === 'boolean') {
        const ssIdx = getStringIndex(st, raw ? 'Yes' : 'No');
        return xmlCell(ref, ssIdx, defaultStyle, true);
      }

      const strVal = raw != null ? String(raw) : '';
      const ssIdx = getStringIndex(st, strVal);
      return xmlCell(ref, ssIdx, defaultStyle, true);
    }).join('');

    dataRows.push(`<row r="${rowNum}">${cells}</row>`);
  }

  let hyperlinksXml = '';
  if (hyperlinks.length > 0) {
    const entries = hyperlinks
      .map((h) => `<hyperlink ref="${h.ref}" r:id="${h.rId}" display="Open"/>`)
      .join('');
    hyperlinksXml = `<hyperlinks>${entries}</hyperlinks>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
  <dimension ref="A1:${lastCol}${totalRows}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>
    ${headerRowXml}
    ${dataRows.join('\n    ')}
  </sheetData>
  <autoFilter ref="A1:${lastCol}${totalRows}"/>
  ${hyperlinksXml}
</worksheet>`;

  return { xml, hyperlinks };
}

function buildSheet1Rels(hyperlinks: HyperlinkEntry[]): string {
  const rels = hyperlinks
    .map((h) => `<Relationship Id="${h.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(h.url)}" TargetMode="External"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">${rels}</Relationships>`;
}

interface ChartDataSet {
  categories: string[];
  values: number[];
}

function computeDashboardData(data: Record<string, unknown>[]): {
  scoreDistribution: ChartDataSet;
  countryBreakdown: ChartDataSet;
  mainSkills: ChartDataSet;
  typeSplit: ChartDataSet;
} {
  const scoreBuckets = [0, 0, 0, 0, 0];
  const countryMap = new Map<string, number>();
  const skillMap = new Map<string, number>();
  let employeeCount = 0;
  let candidateCount = 0;

  for (const row of data) {
    const score = typeof row.matchScore === 'number' ? row.matchScore : 0;
    if (score >= 90) scoreBuckets[0]++;
    else if (score >= 80) scoreBuckets[1]++;
    else if (score >= 70) scoreBuckets[2]++;
    else if (score >= 60) scoreBuckets[3]++;
    else scoreBuckets[4]++;

    const country = String(row.country ?? 'Unknown');
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1);

    const skill = String(row.mainSkill ?? 'Unknown');
    skillMap.set(skill, (skillMap.get(skill) ?? 0) + 1);

    const type = String(row.type ?? '').toLowerCase();
    if (type === 'employee') employeeCount++;
    else candidateCount++;
  }

  const sortedCountries = [...countryMap.entries()].sort((a, b) => b[1] - a[1]);
  const sortedSkills = [...skillMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    scoreDistribution: {
      categories: ['90-100', '80-89', '70-79', '60-69', '<60'],
      values: scoreBuckets,
    },
    countryBreakdown: {
      categories: sortedCountries.map(([k]) => k),
      values: sortedCountries.map(([, v]) => v),
    },
    mainSkills: {
      categories: sortedSkills.map(([k]) => k),
      values: sortedSkills.map(([, v]) => v),
    },
    typeSplit: {
      categories: ['Employee', 'Candidate'],
      values: [employeeCount, candidateCount],
    },
  };
}

interface DashboardRanges {
  scoreStart: number;
  scoreEnd: number;
  countryStart: number;
  countryEnd: number;
  skillStart: number;
  skillEnd: number;
  typeStart: number;
  typeEnd: number;
}

function buildDashboardSheet(
  dashboard: ReturnType<typeof computeDashboardData>,
  st: StringTable,
): { xml: string; ranges: DashboardRanges } {
  const rows: string[] = [];
  let currentRow = 1;

  const writeTableHeader = (row: number, col: number, label1: string, label2: string): void => {
    const c1 = xmlCell(cellRef(col, row), getStringIndex(st, label1), 1, true);
    const c2 = xmlCell(cellRef(col + 1, row), getStringIndex(st, label2), 1, true);
    rows.push(`<row r="${row}">${c1}${c2}</row>`);
  };

  const writeTableRow = (row: number, col: number, cat: string, val: number): void => {
    const c1 = xmlCell(cellRef(col, row), getStringIndex(st, cat), 0, true);
    const c2 = xmlCell(cellRef(col + 1, row), val, 0, false);
    rows.push(`<row r="${row}">${c1}${c2}</row>`);
  };

  const titleIdx = getStringIndex(st, 'Match Results Dashboard');
  rows.push(`<row r="${currentRow}"><c r="A${currentRow}" s="1" t="s"><v>${titleIdx}</v></c></row>`);
  currentRow += 2;

  writeTableHeader(currentRow, 0, 'Score Range', 'Count');
  currentRow++;
  const scoreStartRow = currentRow;
  for (let i = 0; i < dashboard.scoreDistribution.categories.length; i++) {
    writeTableRow(currentRow, 0, dashboard.scoreDistribution.categories[i], dashboard.scoreDistribution.values[i]);
    currentRow++;
  }
  const scoreEndRow = currentRow - 1;
  currentRow += 2;

  writeTableHeader(currentRow, 0, 'Country', 'Count');
  currentRow++;
  const countryStartRow = currentRow;
  for (let i = 0; i < dashboard.countryBreakdown.categories.length; i++) {
    writeTableRow(currentRow, 0, dashboard.countryBreakdown.categories[i], dashboard.countryBreakdown.values[i]);
    currentRow++;
  }
  const countryEndRow = currentRow - 1;
  currentRow += 2;

  writeTableHeader(currentRow, 4, 'Main Skill', 'Count');
  currentRow++;
  const skillStartRow = currentRow;
  for (let i = 0; i < dashboard.mainSkills.categories.length; i++) {
    writeTableRow(currentRow, 4, dashboard.mainSkills.categories[i], dashboard.mainSkills.values[i]);
    currentRow++;
  }
  const skillEndRow = currentRow - 1;
  currentRow += 2;

  writeTableHeader(currentRow, 4, 'Type', 'Count');
  currentRow++;
  const typeStartRow = currentRow;
  for (let i = 0; i < dashboard.typeSplit.categories.length; i++) {
    writeTableRow(currentRow, 4, dashboard.typeSplit.categories[i], dashboard.typeSplit.values[i]);
    currentRow++;
  }
  const typeEndRow = currentRow - 1;

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
  <cols>
    <col min="1" max="1" width="16" customWidth="1"/>
    <col min="2" max="2" width="10" customWidth="1"/>
    <col min="3" max="4" width="4" customWidth="1"/>
    <col min="5" max="5" width="22" customWidth="1"/>
    <col min="6" max="6" width="10" customWidth="1"/>
  </cols>
  <sheetData>
    ${rows.join('\n    ')}
  </sheetData>
  <drawing r:id="rId1"/>
</worksheet>`;

  return {
    xml,
    ranges: {
      scoreStart: scoreStartRow, scoreEnd: scoreEndRow,
      countryStart: countryStartRow, countryEnd: countryEndRow,
      skillStart: skillStartRow, skillEnd: skillEndRow,
      typeStart: typeStartRow, typeEnd: typeEndRow,
    },
  };
}

interface ChartPlacement {
  chartId: number;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

function buildDrawingXml(placements: ChartPlacement[]): string {
  const anchors = placements.map((p, i) => `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>${p.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${p.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${p.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${p.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}"/>
        <xdr:cNvGraphicFramePr>
          <a:graphicFrameLocks noGrp="1"/>
        </xdr:cNvGraphicFramePr>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="${NS_CHART}" xmlns:r="${NS_REL}" r:id="rId${i + 1}"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${NS_DRAW_SS}" xmlns:a="${NS_DRAW}" xmlns:c="${NS_CHART}" xmlns:r="${NS_REL}">
${anchors}
</xdr:wsDr>`;
}

function buildDrawingRels(chartCount: number): string {
  const rels = Array.from({ length: chartCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">${rels}</Relationships>`;
}

function buildBarChart(
  sheetName: string,
  catRange: string,
  valRange: string,
  title: string,
  colors: string[],
  horizontal: boolean = false,
): string {
  const dir = horizontal ? 'bar' : 'col';
  const colorPoints = colors.map((c, i) => `
            <c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></c:spPr></c:dPt>`).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS_CHART}" xmlns:a="${NS_DRAW}" xmlns:r="${NS_REL}">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1200" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="${dir}"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          ${colorPoints}
          <c:cat><c:strRef><c:f>${sheetName}!${catRange}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${sheetName}!${valRange}</c:f></c:numRef></c:val>
        </c:ser>
        <c:axId val="1"/>
        <c:axId val="2"/>
      </c:barChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horizontal ? 'l' : 'b'}"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horizontal ? 'b' : 'l'}"/><c:crossAx val="1"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function buildPieChart(
  sheetName: string,
  catRange: string,
  valRange: string,
  title: string,
  isDoughnut: boolean = false,
): string {
  const chartType = isDoughnut ? 'doughnutChart' : 'pieChart';
  const holeSize = isDoughnut ? '<c:holeSize val="50"/>' : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS_CHART}" xmlns:a="${NS_DRAW}" xmlns:r="${NS_REL}">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1200" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:${chartType}>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="1"/><c:showSerName val="0"/><c:showPercent val="1"/></c:dLbls>
          <c:cat><c:strRef><c:f>${sheetName}!${catRange}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${sheetName}!${valRange}</c:f></c:numRef></c:val>
        </c:ser>
        ${holeSize}
      </c:${chartType}>
    </c:plotArea>
    <c:legend><c:legendPos val="r"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function buildContentTypes(chartCount: number): string {
  const chartOverrides = Array.from({ length: chartCount }, (_, i) =>
    `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
  ).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${NS_CONTENT}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  ${chartOverrides}
</Types>`;
}

function buildWorkbook(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
  <sheets>
    <sheet name="Match Results" sheetId="1" r:id="rId1"/>
    <sheet name="Dashboard" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;
}

function buildWorkbookRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

function buildRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildSheet2Rels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_PKG_REL}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  filename: string,
): Promise<void> {
  const st: StringTable = { table: [], index: new Map() };

  const { xml: sheet1Xml, hyperlinks } = buildDataSheet(data, columns, st);

  const dashboard = computeDashboardData(data);
  const { xml: sheet2Xml, ranges } = buildDashboardSheet(dashboard, st);

  const skillLen = dashboard.mainSkills.categories.length;
  const scoreColors = ['22C55E', 'A3E635', 'FACC15', 'FB923C', 'EF4444'];

  const chart1 = buildBarChart(
    'Dashboard',
    `$A$${ranges.scoreStart}:$A$${ranges.scoreEnd}`,
    `$B$${ranges.scoreStart}:$B$${ranges.scoreEnd}`,
    'Score Distribution',
    scoreColors,
  );

  const chart2 = buildPieChart(
    'Dashboard',
    `$A$${ranges.countryStart}:$A$${ranges.countryEnd}`,
    `$B$${ranges.countryStart}:$B$${ranges.countryEnd}`,
    'Country Breakdown',
  );

  const skillColors = Array.from({ length: skillLen }, (_, i) => {
    const hue = Math.round((i * 360) / Math.max(skillLen, 1));
    return hslToHex(hue, 70, 55);
  });

  const chart3 = buildBarChart(
    'Dashboard',
    `$E$${ranges.skillStart}:$E$${ranges.skillEnd}`,
    `$F$${ranges.skillStart}:$F$${ranges.skillEnd}`,
    'Top Main Skills',
    skillColors,
    true,
  );

  const chart4 = buildPieChart(
    'Dashboard',
    `$E$${ranges.typeStart}:$E$${ranges.typeEnd}`,
    `$F$${ranges.typeStart}:$F$${ranges.typeEnd}`,
    'Type Split',
    true,
  );

  const chartPlacements: ChartPlacement[] = [
    { chartId: 1, fromCol: 3, fromRow: 2, toCol: 10, toRow: 18 },
    { chartId: 2, fromCol: 3, fromRow: 19, toCol: 10, toRow: 35 },
    { chartId: 3, fromCol: 8, fromRow: 2, toCol: 15, toRow: 18 },
    { chartId: 4, fromCol: 8, fromRow: 19, toCol: 15, toRow: 35 },
  ];

  const drawingXml = buildDrawingXml(chartPlacements);
  const drawingRelsXml = buildDrawingRels(4);

  const zip = new JSZip();

  zip.file('[Content_Types].xml', buildContentTypes(4));
  zip.file('_rels/.rels', buildRootRels());
  zip.file('xl/workbook.xml', buildWorkbook());
  zip.file('xl/_rels/workbook.xml.rels', buildWorkbookRels());
  zip.file('xl/styles.xml', buildStyles());
  zip.file('xl/sharedStrings.xml', buildSharedStrings(st.table));
  zip.file('xl/worksheets/sheet1.xml', sheet1Xml);
  zip.file('xl/worksheets/sheet2.xml', sheet2Xml);

  if (hyperlinks.length > 0) {
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', buildSheet1Rels(hyperlinks));
  }

  zip.file('xl/worksheets/_rels/sheet2.xml.rels', buildSheet2Rels());
  zip.file('xl/drawings/drawing1.xml', drawingXml);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', drawingRelsXml);
  zip.file('xl/charts/chart1.xml', chart1);
  zip.file('xl/charts/chart2.xml', chart2);
  zip.file('xl/charts/chart3.xml', chart3);
  zip.file('xl/charts/chart4.xml', chart4);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}
