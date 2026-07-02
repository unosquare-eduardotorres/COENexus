import { createLogger } from '../logger'
import { getConfig } from '../../config'

const log = createLogger('ExecApiClient')

export async function fetchExecApi<T>(
  path: string,
  token: string,
  signal?: AbortSignal
): Promise<T> {
  const { execApi } = getConfig()
  const url = `${execApi.apiUrl}${path}`
  const start = Date.now()

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (!response.ok) {
    log.error(`Exec API error: GET ${url}`, new Error(`${response.status}`), {
      status: response.status,
      durationMs: Date.now() - start,
    })
    if (response.status === 401) {
      throw new Error(
        'Authentication failed — the provided token may not have access to the Exec API. ' +
        'Ensure you are using a valid token from reports.unosquare.com.'
      )
    }
    throw new Error(`Exec API ${response.status}: ${response.statusText}`)
  }

  log.debug(`Exec API OK: GET ${url}`, { durationMs: Date.now() - start })
  return response.json() as Promise<T>
}
