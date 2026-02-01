import { QuartzTransformerPlugin } from "../types"

export interface Options {
  /** The vault prefix to strip from wiki links */
  prefix: string
}

const defaultOptions: Options = {
  prefix: "Personal/learnings/tech-stuff/",
}

export const StripVaultPrefix: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  // Escape special regex characters in the prefix
  const escapedPrefix = opts.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // Match wiki links that start with the prefix
  // Handles: [[prefix/path]], [[prefix/path|alias]], [[prefix/path#anchor]], [[prefix/path#anchor|alias]]
  const prefixRegex = new RegExp(`\\[\\[${escapedPrefix}`, "g")

  return {
    name: "StripVaultPrefix",
    textTransform(_ctx, src) {
      return src.replace(prefixRegex, "[[")
    },
  }
}
