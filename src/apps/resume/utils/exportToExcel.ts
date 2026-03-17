import JSZip from 'jszip';

interface ColumnDef {
  header: string;
  accessor: (row: Record<string, unknown>) => string | number | boolean | null | undefined;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function columnLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function buildSharedStrings(strings: string[]): string {
  const items = strings.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${items}
</sst>`;
}

function buildSheet(rows: (string | number)[][], colCount: number): string {
  const lastCol = columnLetter(colCount - 1);
  const sheetData = rows.map((row, ri) => {
    const cells = row.map((val, ci) => {
      const ref = `${columnLetter(ci)}${ri + 1}`;
      if (typeof val === 'number') {
        return `<c r="${ref}"><v>${val}</v></c>`;
      }
      return `<c r="${ref}" t="s"><v>${val}</v></c>`;
    }).join('');
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCol}${rows.length}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    ${Array.from({ length: colCount }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="18" bestFit="1" customWidth="1"/>`).join('\n    ')}
  </cols>
  <sheetData>
    ${sheetData}
  </sheetData>
</worksheet>`;
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  filename: string,
): Promise<void> {
  const stringTable: string[] = [];
  const stringIndex = new Map<string, number>();

  const getStringIndex = (val: string): number => {
    const existing = stringIndex.get(val);
    if (existing !== undefined) return existing;
    const idx = stringTable.length;
    stringTable.push(val);
    stringIndex.set(val, idx);
    return idx;
  };

  const rows: (string | number)[][] = [];

  const headerRow = columns.map((col) => getStringIndex(col.header));
  rows.push(headerRow);

  for (const record of data) {
    const row = columns.map((col) => {
      const raw = col.accessor(record);
      if (raw == null) return getStringIndex('');
      if (typeof raw === 'boolean') return getStringIndex(raw ? 'Yes' : 'No');
      if (typeof raw === 'number') return raw;
      return getStringIndex(String(raw));
    });
    rows.push(row);
  }

  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Export" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`);

  zip.file('xl/sharedStrings.xml', buildSharedStrings(stringTable));
  zip.file('xl/worksheets/sheet1.xml', buildSheet(rows, columns.length));

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type { ColumnDef };
