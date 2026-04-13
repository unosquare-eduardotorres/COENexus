import { delimiter } from 'node:path'

export function buildEnvWithPath(): NodeJS.ProcessEnv {
  const env = { ...process.env }

  delete env.CLAUDECODE
  delete env.CLAUDE_CODE_ENTRYPOINT
  delete env.ELECTRON_RUN_AS_NODE

  const basePath = env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'

  const homeDir = env.HOME || env.USERPROFILE || ''
  const extraDirs: string[] = []

  if (homeDir) {
    extraDirs.push(`${homeDir}/.local/bin`)
    extraDirs.push(`${homeDir}/.nvm/current/bin`)
    extraDirs.push(`${homeDir}/.volta/bin`)
    extraDirs.push(`${homeDir}/.fnm/current/bin`)
  }
  extraDirs.push('/opt/homebrew/bin')
  extraDirs.push('/usr/local/bin')

  const missing = extraDirs.filter(d => !basePath.includes(d))
  env.PATH = missing.length > 0
    ? `${missing.join(delimiter)}${delimiter}${basePath}`
    : basePath

  return env
}
