/**
 * Resolve hook: append `.ts` for relative bare imports so
 * `node --experimental-strip-types` can load the Diff Lab engine.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[cm]?[jt]sx?$/.test(specifier) &&
    !specifier.endsWith('.json')
  ) {
    try {
      return await nextResolve(specifier + '.ts', context)
    } catch {
      /* fall through */
    }
  }
  return nextResolve(specifier, context)
}
