import { delimiter } from 'node:path'

export function buildEnvWithPath(): NodeJS.ProcessEnv {
  const env = { ...process.env }

  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.ELECTRON_RUN_AS_NODE

  const basePath = env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'

  const homeDir = env.HOME || env.USERPROFILE || ''

  const priorityDirs: string[] = []
  const fallbackDirs: string[] = []

  priorityDirs.push('/usr/local/bin')
  priorityDirs.push('/opt/homebrew/bin')
  if (homeDir) {
    priorityDirs.push(`${homeDir}/.nvm/current/bin`)
    priorityDirs.push(`${homeDir}/.volta/bin`)
    priorityDirs.push(`${homeDir}/.fnm/current/bin`)
    fallbackDirs.push(`${homeDir}/.local/bin`)
  }

  const missingPriority = priorityDirs.filter(d => !basePath.includes(d))
  const missingFallback = fallbackDirs.filter(d => !basePath.includes(d))

  let path = basePath
  if (missingPriority.length > 0) {
    path = `${missingPriority.join(delimiter)}${delimiter}${path}`
  }
  if (missingFallback.length > 0) {
    path = `${path}${delimiter}${missingFallback.join(delimiter)}`
  }
  env.PATH = path

  return env
}
