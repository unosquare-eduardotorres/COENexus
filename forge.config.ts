import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import FusesPlugin from '@electron-forge/plugin-fuses'
import AutoUnpackNativesPlugin from '@electron-forge/plugin-auto-unpack-natives'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { resolve } from 'path'

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
    icon: './resources/icon',
    appBundleId: 'com.unosquare.coe-nexus',
    name: 'COE Nexus',
    executableName: 'coe-nexus',
    osxSign: {
      identity: process.env.APPLE_SIGNING_IDENTITY || undefined,
      optionsForFile: () => ({
        hardenedRuntime: true,
        entitlements: resolve(__dirname, 'entitlements.mac.plist'),
        'entitlements-inherit': resolve(__dirname, 'entitlements.mac.inherit.plist'),
      }),
    },
    osxNotarize: process.env.APPLE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_NOTARIZE
      ? {
          appleId: process.env.APPLE_ID,
          teamId: process.env.APPLE_TEAM_ID,
          appleIdPassword: process.env.APPLE_NOTARIZE,
        }
      : undefined,
    extraResource: [
      './resources/sqlite-vec',
    ],
    ignore: [
      /^\/backend/,
      /^\/scripts/,
      /^\/\.claude/,
      /^\/\.git/,
      /^\/node_modules\/\.cache/,
      /^\/entitlements\.mac/,
    ],
  },

  makers: [
    new MakerDMG({
      format: 'ULFO',
      name: 'COE Nexus',
    }),
    new MakerSquirrel({
      name: 'COENexus',
      setupIcon: './resources/icon.ico',
    }),
    new MakerZIP({}, ['linux']),
  ],

  plugins: [
    new AutoUnpackNativesPlugin(),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],

  outDir: './dist',

  hooks: {
    postPackage: async (_forgeConfig, options) => {
      console.info(`Packaged for ${options.platform}/${options.arch} at: ${options.outputPaths.join(', ')}`)
    },
  },
}

export default config
