import Database from 'better-sqlite3'
import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

interface MigrationStats {
  table: string
  pgCount: number
  sqliteCount: number
  vectorsTransferred: number
}

interface CliArgs {
  pgUrl: string
  sqlitePath: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  let pgUrl = ''
  let sqlitePath = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pg-url' && i + 1 < args.length) pgUrl = args[++i]
    else if (args[i].startsWith('--pg-url=')) pgUrl = args[i].split('=').slice(1).join('=')
    else if (args[i] === '--sqlite-path' && i + 1 < args.length) sqlitePath = args[++i]
    else if (args[i].startsWith('--sqlite-path=')) sqlitePath = args[i].split('=').slice(1).join('=')
  }

  if (!pgUrl || !sqlitePath) {
    console.error('Usage: npx tsx scripts/migrate-pg-to-sqlite.ts --pg-url="postgresql://..." --sqlite-path="./nexus.db"')
    process.exit(1)
  }

  return { pgUrl, sqlitePath: resolve(sqlitePath) }
}

function pgVectorToFloat32Array(pgVectorText: string): Float32Array {
  const values = pgVectorText.replace(/[\[\]]/g, '').split(',').map(Number)
  return new Float32Array(values)
}

function snakeCase(pascalCase: string): string {
  return pascalCase
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

function boolToInt(value: unknown): number {
  if (value === true) return 1
  if (value === false) return 0
  if (typeof value === 'number') return value ? 1 : 0
  return 0
}

function toIsoString(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

async function migrateTable(
  pgClient: pg.Client,
  sqliteDb: Database.Database,
  pgTable: string,
  sqliteTable: string,
  columnMap: Record<string, { sqliteCol: string; transform?: (val: unknown) => unknown }>,
  skipColumns?: string[]
): Promise<MigrationStats> {
  const countResult = await pgClient.query(`SELECT COUNT(*) as c FROM "${pgTable}"`)
  const pgCount = parseInt(countResult.rows[0].c, 10)

  console.log(`\n  Migrating ${pgTable} -> ${sqliteTable} (${pgCount} rows)...`)

  if (pgCount === 0) {
    return { table: sqliteTable, pgCount: 0, sqliteCount: 0, vectorsTransferred: 0 }
  }

  const pgCols = Object.keys(columnMap).filter(c => !skipColumns?.includes(c))
  const selectCols = pgCols.map(c => `"${c}"`).join(', ')

  const result = await pgClient.query(`SELECT ${selectCols} FROM "${pgTable}" ORDER BY "Id"`)

  const sqliteCols = pgCols.map(c => columnMap[c].sqliteCol)
  const placeholders = sqliteCols.map(() => '?').join(', ')
  const insertSql = `INSERT OR REPLACE INTO ${sqliteTable} (${sqliteCols.join(', ')}) VALUES (${placeholders})`
  const insertStmt = sqliteDb.prepare(insertSql)

  const insertMany = sqliteDb.transaction((rows: unknown[][]) => {
    for (const row of rows) {
      insertStmt.run(...row)
    }
  })

  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < result.rows.length; i += batchSize) {
    const batch = result.rows.slice(i, i + batchSize)
    const transformedBatch = batch.map(pgRow => {
      return pgCols.map(pgCol => {
        const mapping = columnMap[pgCol]
        const rawValue = pgRow[pgCol.toLowerCase()] ?? pgRow[pgCol]
        return mapping.transform ? mapping.transform(rawValue) : rawValue
      })
    })
    insertMany(transformedBatch)
    inserted += batch.length
    if (inserted % 1000 === 0 || inserted === result.rows.length) {
      process.stdout.write(`\r    Inserted ${inserted}/${pgCount}`)
    }
  }

  console.log()

  const sqliteCount = (sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${sqliteTable}`).get() as { c: number }).c

  return { table: sqliteTable, pgCount, sqliteCount, vectorsTransferred: 0 }
}

async function migrateEmbeddings(
  pgClient: pg.Client,
  sqliteDb: Database.Database
): Promise<MigrationStats> {
  const countResult = await pgClient.query('SELECT COUNT(*) as c FROM "ResumeEmbeddings"')
  const pgCount = parseInt(countResult.rows[0].c, 10)

  console.log(`\n  Migrating ResumeEmbeddings -> resume_embeddings + vec_embeddings (${pgCount} rows)...`)

  if (pgCount === 0) {
    return { table: 'resume_embeddings', pgCount: 0, sqliteCount: 0, vectorsTransferred: 0 }
  }

  const result = await pgClient.query(`
    SELECT "Id", "SourceType", "SourceId", "UpstreamId",
           "Embedding"::text as embedding_text, "ResumeText",
           "CreatedAt", "UpdatedAt", "IsBench"
    FROM "ResumeEmbeddings"
    ORDER BY "Id"
  `)

  const insertEmbedding = sqliteDb.prepare(`
    INSERT OR REPLACE INTO resume_embeddings (id, source_type, source_id, upstream_id, embedding, resume_text, created_at, updated_at, is_bench)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let hasVecModule = false
  let deleteVec: Database.Statement | null = null
  let insertVec: Database.Statement | null = null
  try {
    deleteVec = sqliteDb.prepare(
      'DELETE FROM vec_embeddings WHERE rowid = ?'
    )
    insertVec = sqliteDb.prepare(
      'INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)'
    )
    hasVecModule = true
  } catch {
    console.log('    sqlite-vec module not available — skipping vec_embeddings inserts (Electron app will populate on startup)')
  }

  let vectorsTransferred = 0

  const insertAll = sqliteDb.transaction(() => {
    for (const row of result.rows) {
      const id = row.Id ?? row.id
      const sourceType = row.SourceType ?? row.sourcetype
      const sourceId = row.SourceId ?? row.sourceid
      const upstreamId = row.UpstreamId ?? row.upstreamid
      const embeddingText = row.embedding_text
      const resumeText = row.ResumeText ?? row.resumetext
      const createdAt = toIsoString(row.CreatedAt ?? row.createdat)
      const updatedAt = toIsoString(row.UpdatedAt ?? row.updatedat)
      const isBench = boolToInt(row.IsBench ?? row.isbench)

      let embeddingBuffer: Buffer | null = null
      if (embeddingText) {
        const float32 = pgVectorToFloat32Array(embeddingText)
        embeddingBuffer = Buffer.from(float32.buffer)
        vectorsTransferred++
      }

      insertEmbedding.run(id, sourceType, sourceId, upstreamId, embeddingBuffer, resumeText, createdAt, updatedAt, isBench)

      if (embeddingBuffer && hasVecModule && insertVec && deleteVec) {
        deleteVec.run(id)
        insertVec.run(id, embeddingBuffer)
      }
    }
  })

  insertAll()

  const sqliteCount = (sqliteDb.prepare('SELECT COUNT(*) as c FROM resume_embeddings').get() as { c: number }).c

  console.log(`    Inserted ${sqliteCount} embeddings, ${vectorsTransferred} vectors transferred`)

  return { table: 'resume_embeddings', pgCount, sqliteCount, vectorsTransferred }
}

async function migrate(pgUrl: string, sqlitePath: string): Promise<MigrationStats[]> {
  const pgClient = new pg.Client({ connectionString: pgUrl })
  await pgClient.connect()
  console.log('Connected to PostgreSQL')

  const sqliteDb = new Database(sqlitePath)
  sqliteDb.pragma('journal_mode = WAL')
  sqliteDb.pragma('foreign_keys = ON')

  const schemaPath = join(__dirname, '../src/main/db/schema.sql')
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8')
    sqliteDb.exec(schema)
    console.log('SQLite schema applied')
  } else {
    console.warn('Schema file not found at', schemaPath, '— expecting tables to exist')
  }

  const allStats: MigrationStats[] = []

  const employeeStats = await migrateTable(pgClient, sqliteDb, 'SyncedEmployees', 'synced_employees', {
    Id: { sqliteCol: 'id' },
    UpstreamId: { sqliteCol: 'upstream_id' },
    FullName: { sqliteCol: 'full_name' },
    Email: { sqliteCol: 'email' },
    Seniority: { sqliteCol: 'seniority' },
    MainSkill: { sqliteCol: 'main_skill' },
    Country: { sqliteCol: 'country' },
    GrossMonthlySalary: { sqliteCol: 'gross_monthly_salary' },
    SalaryCurrency: { sqliteCol: 'salary_currency' },
    LastAccount: { sqliteCol: 'last_account' },
    LastAccountStartDate: { sqliteCol: 'last_account_start_date', transform: toIsoString },
    Rate: { sqliteCol: 'rate' },
    HasResume: { sqliteCol: 'has_resume', transform: boolToInt },
    ResumeNoteId: { sqliteCol: 'resume_note_id' },
    ResumeDateCreated: { sqliteCol: 'resume_date_created', transform: toIsoString },
    ResumeFilename: { sqliteCol: 'resume_filename' },
    IsBench: { sqliteCol: 'is_bench', transform: boolToInt },
    JobTitle: { sqliteCol: 'job_title' },
    Status: { sqliteCol: 'status' },
    StatusReason: { sqliteCol: 'status_reason' },
    Failed: { sqliteCol: 'failed', transform: boolToInt },
    SyncedAt: { sqliteCol: 'synced_at', transform: toIsoString },
  })
  allStats.push(employeeStats)

  const candidateStats = await migrateTable(pgClient, sqliteDb, 'SyncedCandidates', 'synced_candidates', {
    Id: { sqliteCol: 'id' },
    UpstreamId: { sqliteCol: 'upstream_id' },
    FullName: { sqliteCol: 'full_name' },
    Email: { sqliteCol: 'email' },
    Seniority: { sqliteCol: 'seniority' },
    MainSkill: { sqliteCol: 'main_skill' },
    Country: { sqliteCol: 'country' },
    CurrentSalary: { sqliteCol: 'current_salary' },
    SalaryCurrency: { sqliteCol: 'salary_currency' },
    CoeCertified: { sqliteCol: 'coe_certified', transform: boolToInt },
    CandidateStatus: { sqliteCol: 'candidate_status' },
    LastStatusUpdate: { sqliteCol: 'last_status_update', transform: toIsoString },
    SalaryExpectations: { sqliteCol: 'salary_expectations' },
    SalaryExpectationsCurrency: { sqliteCol: 'salary_expectations_currency' },
    HasResume: { sqliteCol: 'has_resume', transform: boolToInt },
    ResumeNoteId: { sqliteCol: 'resume_note_id' },
    ResumeDateCreated: { sqliteCol: 'resume_date_created', transform: toIsoString },
    ResumeFilename: { sqliteCol: 'resume_filename' },
    Status: { sqliteCol: 'status' },
    StatusReason: { sqliteCol: 'status_reason' },
    Failed: { sqliteCol: 'failed', transform: boolToInt },
    SyncedAt: { sqliteCol: 'synced_at', transform: toIsoString },
  })
  allStats.push(candidateStats)

  const positionStats = await migrateTable(pgClient, sqliteDb, 'SyncedOpenPositions', 'synced_open_positions', {
    Id: { sqliteCol: 'id' },
    UpstreamId: { sqliteCol: 'upstream_id' },
    Account: { sqliteCol: 'account' },
    Coe: { sqliteCol: 'coe' },
    Practice: { sqliteCol: 'practice' },
    Stakeholder: { sqliteCol: 'stakeholder' },
    MainSkill: { sqliteCol: 'main_skill' },
    Countries: { sqliteCol: 'countries' },
    Seniorities: { sqliteCol: 'seniorities' },
    AvailableRange: { sqliteCol: 'available_range' },
    AccountOverview: { sqliteCol: 'account_overview' },
    JobDescription: { sqliteCol: 'job_description' },
    JobTitle: { sqliteCol: 'job_title' },
    PositionStatus: { sqliteCol: 'position_status' },
    Aging: { sqliteCol: 'aging' },
    Created: { sqliteCol: 'created', transform: toIsoString },
    ReadyDate: { sqliteCol: 'ready_date', transform: toIsoString },
    LastModification: { sqliteCol: 'last_modification', transform: toIsoString },
    Sourcing: { sqliteCol: 'sourcing' },
    Replacement: { sqliteCol: 'replacement', transform: boolToInt },
    Status: { sqliteCol: 'status' },
    StatusReason: { sqliteCol: 'status_reason' },
    Failed: { sqliteCol: 'failed', transform: boolToInt },
    SyncedAt: { sqliteCol: 'synced_at', transform: toIsoString },
  })
  allStats.push(positionStats)

  const embeddingStats = await migrateEmbeddings(pgClient, sqliteDb)
  allStats.push(embeddingStats)

  const matchSessionStats = await migrateTable(pgClient, sqliteDb, 'MatchSessions', 'match_sessions', {
    Id: { sqliteCol: 'id' },
    Name: { sqliteCol: 'name' },
    MatchFlowType: { sqliteCol: 'match_flow_type' },
    DataSource: { sqliteCol: 'data_source' },
    TopN: { sqliteCol: 'top_n' },
    SearchMode: { sqliteCol: 'search_mode' },
    JobDescription: { sqliteCol: 'job_description' },
    JdSource: { sqliteCol: 'jd_source' },
    ConstraintsJson: { sqliteCol: 'constraints_json' },
    PipelineStatsJson: { sqliteCol: 'pipeline_stats_json' },
    PipelineStagesJson: { sqliteCol: 'pipeline_stages_json' },
    ResultsJson: { sqliteCol: 'results_json' },
    Status: { sqliteCol: 'status' },
    CreatedAt: { sqliteCol: 'created_at', transform: toIsoString },
    CompletedAt: { sqliteCol: 'completed_at', transform: toIsoString },
  })
  allStats.push(matchSessionStats)

  const resumeSessionStats = await migrateTable(pgClient, sqliteDb, 'ResumeSessions', 'resume_sessions', {
    Id: { sqliteCol: 'id' },
    Name: { sqliteCol: 'name' },
    SourceType: { sqliteCol: 'source_type' },
    CandidateUpstreamId: { sqliteCol: 'candidate_upstream_id' },
    EmployeeUpstreamId: { sqliteCol: 'employee_upstream_id' },
    CurrentStepKey: { sqliteCol: 'current_step_key' },
    CompletedStepsJson: { sqliteCol: 'completed_steps_json' },
    StepperContextJson: { sqliteCol: 'stepper_context_json' },
    ResumeContentJson: { sqliteCol: 'resume_content_json' },
    OriginalResumeText: { sqliteCol: 'original_resume_text' },
    OriginalFileName: { sqliteCol: 'original_file_name' },
    OriginalFileType: { sqliteCol: 'original_file_type' },
    ProcessingMode: { sqliteCol: 'processing_mode' },
    RefinementMode: { sqliteCol: 'refinement_mode' },
    UploadStatus: { sqliteCol: 'upload_status' },
    VectorizationStatus: { sqliteCol: 'vectorization_status' },
    Version: { sqliteCol: 'version' },
    Status: { sqliteCol: 'status' },
    CreatedAt: { sqliteCol: 'created_at', transform: toIsoString },
    UpdatedAt: { sqliteCol: 'updated_at', transform: toIsoString },
    CompletedAt: { sqliteCol: 'completed_at', transform: toIsoString },
    ResumeEmbeddingId: { sqliteCol: 'resume_embedding_id' },
  })
  allStats.push(resumeSessionStats)

  const transformSessionStats = await migrateTable(pgClient, sqliteDb, 'TransformSessions', 'transform_sessions', {
    Id: { sqliteCol: 'id' },
    Name: { sqliteCol: 'name' },
    ContextType: { sqliteCol: 'context_type' },
    ContextId: { sqliteCol: 'context_id' },
    ContextName: { sqliteCol: 'context_name' },
    ProcessingMode: { sqliteCol: 'processing_mode' },
    RefinementMode: { sqliteCol: 'refinement_mode' },
    JobDescription: { sqliteCol: 'job_description' },
    JobDescriptionSource: { sqliteCol: 'job_description_source' },
    SelectedPositionId: { sqliteCol: 'selected_position_id' },
    ResumeContentJson: { sqliteCol: 'resume_content_json' },
    WizardStateJson: { sqliteCol: 'wizard_state_json' },
    Status: { sqliteCol: 'status' },
    CreatedAt: { sqliteCol: 'created_at', transform: toIsoString },
    UpdatedAt: { sqliteCol: 'updated_at', transform: toIsoString },
  })
  allStats.push(transformSessionStats)

  const opcStats = await migrateTable(pgClient, sqliteDb, 'OpenPositionCandidates', 'open_position_candidates', {
    Id: { sqliteCol: 'id' },
    OpenPositionId: { sqliteCol: 'open_position_id' },
    CandidateRequisitionId: { sqliteCol: 'candidate_requisition_id' },
    CandidateId: { sqliteCol: 'candidate_id' },
    CandidateName: { sqliteCol: 'candidate_name' },
    MainSkill: { sqliteCol: 'main_skill' },
    IsEmployee: { sqliteCol: 'is_employee', transform: boolToInt },
    CandidateStatus: { sqliteCol: 'candidate_status' },
    Rate: { sqliteCol: 'rate' },
    StartDate: { sqliteCol: 'start_date', transform: toIsoString },
    SyncedAt: { sqliteCol: 'synced_at', transform: toIsoString },
  })
  allStats.push(opcStats)

  await pgClient.end()
  sqliteDb.close()

  return allStats
}

function printStats(stats: MigrationStats[]): void {
  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary')
  console.log('='.repeat(60))

  let allMatch = true
  for (const s of stats) {
    const match = s.pgCount === s.sqliteCount
    const icon = match ? '✓' : '✗'
    const vecInfo = s.vectorsTransferred > 0 ? ` (${s.vectorsTransferred} vectors)` : ''
    console.log(`  ${icon} ${s.table}: PG=${s.pgCount} → SQLite=${s.sqliteCount}${vecInfo}`)
    if (!match) allMatch = false
  }

  console.log('='.repeat(60))
  if (allMatch) {
    console.log('All tables migrated successfully — row counts match.')
  } else {
    console.error('WARNING: Some tables have mismatched row counts!')
    process.exitCode = 1
  }
}

async function main(): Promise<void> {
  const { pgUrl, sqlitePath } = parseArgs()

  console.log('PostgreSQL → SQLite Migration')
  console.log(`  Source: ${pgUrl.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`  Target: ${sqlitePath}`)
  console.log()

  try {
    const stats = await migrate(pgUrl, sqlitePath)
    printStats(stats)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

main()
