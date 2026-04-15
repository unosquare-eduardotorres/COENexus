import { readFileSync } from 'fs'
import { join } from 'path'

export const PATH_SCHEMA = readFileSync(
  join(__dirname, '../../schema.sql'),
  'utf-8'
)
