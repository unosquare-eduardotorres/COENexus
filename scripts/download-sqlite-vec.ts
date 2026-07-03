import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

interface ReleaseAsset {
  name: string
  browser_download_url: string
}

interface ReleaseResponse {
  tag_name: string
  assets: ReleaseAsset[]
}

const RELEASE_API_URL = 'https://api.github.com/repos/asg017/sqlite-vec/releases/latest'
const OUTPUT_DIR = resolve(process.cwd(), 'resources/sqlite-vec')

function getTarget(): { extension: '.dylib' | '.so' | '.dll'; platformTokens: string[]; archTokens: string[] } {
  const arch = process.arch

  if (process.platform === 'darwin') {
    return {
      extension: '.dylib',
      platformTokens: ['darwin', 'macos', 'osx'],
      archTokens: arch === 'arm64' ? ['arm64', 'aarch64'] : ['x64', 'x86_64', 'amd64']
    }
  }

  if (process.platform === 'linux') {
    return {
      extension: '.so',
      platformTokens: ['linux'],
      archTokens: arch === 'arm64' ? ['arm64', 'aarch64'] : ['x64', 'x86_64', 'amd64']
    }
  }

  if (process.platform === 'win32') {
    return {
      extension: '.dll',
      platformTokens: ['windows', 'win32'],
      archTokens: arch === 'arm64' ? ['arm64', 'aarch64'] : ['x64', 'x86_64', 'amd64']
    }
  }

  throw new Error(`Unsupported platform: ${process.platform}`)
}

function includesAny(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token))
}

function selectAsset(assets: ReleaseAsset[]): ReleaseAsset {
  const { extension, platformTokens, archTokens } = getTarget()

  const tarballPlatformAndArch = assets.find((asset) => {
    const name = asset.name.toLowerCase()
    return name.endsWith('.tar.gz') && name.includes('loadable') && includesAny(name, platformTokens) && includesAny(name, archTokens)
  })
  if (tarballPlatformAndArch) return tarballPlatformAndArch

  const tarballPlatformOnly = assets.find((asset) => {
    const name = asset.name.toLowerCase()
    return name.endsWith('.tar.gz') && name.includes('loadable') && includesAny(name, platformTokens)
  })
  if (tarballPlatformOnly) return tarballPlatformOnly

  const platformAndArch = assets.find((asset) => {
    const name = asset.name.toLowerCase()
    return name.includes(`vec0${extension}`) && includesAny(name, platformTokens) && includesAny(name, archTokens)
  })
  if (platformAndArch) return platformAndArch

  const platformOnly = assets.find((asset) => {
    const name = asset.name.toLowerCase()
    return name.includes(`vec0${extension}`) && includesAny(name, platformTokens)
  })
  if (platformOnly) return platformOnly

  const directName = assets.find((asset) => asset.name.toLowerCase() === `vec0${extension}`)
  if (directName) return directName

  throw new Error(`Could not find sqlite-vec binary asset for ${process.platform}-${process.arch}`)
}

async function fetchLatestRelease(): Promise<ReleaseResponse> {
  const response = await fetch(RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'operation-nexus-sqlite-vec-downloader'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to query latest sqlite-vec release: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<ReleaseResponse>
}

async function downloadAsset(asset: ReleaseAsset): Promise<Buffer> {
  const response = await fetch(asset.browser_download_url, {
    headers: { 'User-Agent': 'operation-nexus-sqlite-vec-downloader' }
  })

  if (!response.ok) {
    throw new Error(`Failed to download ${asset.name}: ${response.status} ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer)
}

function parseTarOctal(value: Buffer): number {
  const parsed = value.toString('utf8').replace(/\0.*$/, '').trim()
  return parsed ? parseInt(parsed, 8) : 0
}

function extractFromTarGz(archive: Buffer, fileName: string): Buffer {
  const tar = gunzipSync(archive)
  let offset = 0

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break

    const name = header
      .subarray(0, 100)
      .toString('utf8')
      .replace(/\0.*$/, '')
      .trim()
    const size = parseTarOctal(header.subarray(124, 136))
    const contentStart = offset + 512
    const contentEnd = contentStart + size
    const normalizedName = name.toLowerCase()

    if (normalizedName.endsWith(`/${fileName.toLowerCase()}`) || normalizedName === fileName.toLowerCase()) {
      return tar.subarray(contentStart, contentEnd)
    }

    offset = contentStart + Math.ceil(size / 512) * 512
  }

  throw new Error(`Archive does not contain ${fileName}`)
}

async function main(): Promise<void> {
  const { extension } = getTarget()
  const outputPath = resolve(OUTPUT_DIR, `vec0${extension}`)
  const forceDownload = process.argv.includes('--force')

  if (!forceDownload && existsSync(outputPath)) {
    console.log(`sqlite-vec already exists at ${outputPath} — skipping download (use --force to re-download)`)
    return
  }

  const release = await fetchLatestRelease()
  const asset = selectAsset(release.assets)

  await mkdir(OUTPUT_DIR, { recursive: true })
  const downloaded = await downloadAsset(asset)
  const binary = asset.name.toLowerCase().endsWith('.tar.gz')
    ? extractFromTarGz(downloaded, `vec0${extension}`)
    : downloaded
  await writeFile(outputPath, binary)

  console.log(`Downloaded sqlite-vec ${release.tag_name}: ${asset.name}`)
  console.log(`Saved to ${outputPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
