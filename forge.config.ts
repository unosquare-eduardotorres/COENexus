import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZip } from '@electron-forge/maker-zip'
import FusesPlugin from '@electron-forge/plugin-fuses'
import AutoUnpackNativesPlugin from '@electron-forge/plugin-auto-unpack-natives'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
    icon: './resources/icon',
    appBundleId: 'com.unosquare.operation-nexus',
    name: 'Operation Nexus',
    executableName: 'operation-nexus',
    osxSign: {},
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
    ],
  },

  makers: [
    new MakerDMG({
      format: 'ULFO',
    }),
    new MakerSquirrel({
      name: 'OperationNexus',
      setupIcon: './resources/icon.ico',
    }),
    new MakerZip({}, ['linux']),
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

  hooks: {
    postPackage: async (_forgeConfig, options) => {
      console.info(`Packaged for ${options.platform}/${options.arch} at: ${options.outputPaths.join(', ')}`)
    },
  },
}

export default config
