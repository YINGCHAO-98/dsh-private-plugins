/**
 * Minimal type surface for dsh-plugin-manager. The plugin is consumed by the
 * Cordis loader at runtime; these declarations exist so TypeScript consumers
 * can import the entry without `any`.
 */
import type { Context } from '@deepseek-ai/cordis'

export interface PluginManagerConfig {
  /** Explicit profile name (defaults to the CLI --profile or `web`). */
  profile?: string
  /** Cloud registry URL; defaults to the bundled snapshot. */
  registryUrl?: string
}

export function apply(ctx: Context, config?: PluginManagerConfig): void

export const name: string
export const inject: string[]
