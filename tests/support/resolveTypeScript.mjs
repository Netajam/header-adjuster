/**
 * Lets Node resolve the extensionless relative imports the source uses.
 *
 * `src/` is written for esbuild and `tsc`, which both resolve `./heading` to
 * `./heading.ts`. Node's ESM loader does not, so the test runner registers this
 * hook to fill the extension in. It only ever touches relative specifiers whose
 * final segment carries no extension, so nothing else in resolution changes.
 *
 * Loaded via `node --import ./tests/support/resolveTypeScript.mjs`.
 */
import { registerHooks } from 'node:module';

/**
 * `obsidian` is supplied by the app at runtime and is not installable, so
 * tests point it at a stub. See `obsidianStub.ts` for what that does and does
 * not buy you.
 */
const OBSIDIAN_STUB = new URL('./obsidianStub.ts', import.meta.url).href;

function needsTypeScriptExtension(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return false;
  }
  const basename = specifier.slice(specifier.lastIndexOf('/') + 1);
  return basename.length > 0 && !basename.includes('.');
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'obsidian') {
      return { url: OBSIDIAN_STUB, shortCircuit: true };
    }
    if (needsTypeScriptExtension(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Not a TypeScript module — fall through to normal resolution.
      }
    }
    return nextResolve(specifier, context);
  },
});
