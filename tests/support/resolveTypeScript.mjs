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

function needsTypeScriptExtension(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return false;
  }
  const basename = specifier.slice(specifier.lastIndexOf('/') + 1);
  return basename.length > 0 && !basename.includes('.');
}

registerHooks({
  resolve(specifier, context, nextResolve) {
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
