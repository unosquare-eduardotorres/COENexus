import ExcelJS from 'exceljs'

interface ExcelColumnDef {
  header: string
  key: string
  width?: number
  style?: Partial<ExcelJS.Style>
}

interface ExcelExportOptions {
  sheetName: string
  columns: ExcelColumnDef[]
  rows: Record<string, unknown>[]
  statusColumn?: { key: string; colorMap: Record<string, { bg: string; font: string }> }
}

export async function generateExcelBuffer(options: ExcelExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(options.sheetName)

  sheet.columns = options.columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width ?? Math.max(col.header.length + 4, 15),
  }))

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1c1c26' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  for (const row of options.rows) {
    const dataRow = sheet.addRow(row)

    if (options.statusColumn) {
      const statusValue = String(row[options.statusColumn.key] ?? '')
      const colors = options.statusColumn.colorMap[statusValue]
      if (colors) {
        const cell = dataRow.getCell(options.statusColumn.key)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
        cell.font = { color: { argb: colors.font }, bold: true, size: 10 }
      }
    }

    dataRow.alignment = { vertical: 'top', wrapText: true }
  }

  sheet.columns.forEach(col => {
    let maxLen = col.header?.length ?? 10
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length
      if (len > maxLen) maxLen = Math.min(len, 50)
    })
    col.width = maxLen + 3
  })

  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF2a2a3a' } },
        bottom: { style: 'thin', color: { argb: 'FF2a2a3a' } },
        left: { style: 'thin', color: { argb: 'FF2a2a3a' } },
        right: { style: 'thin', color: { argb: 'FF2a2a3a' } },
      }
    })
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
