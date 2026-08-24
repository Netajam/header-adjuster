import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * Reads `src/` the way the architecture rules talk about it: files, the
 * relative imports between them, and the declarations inside them.
 *
 * Uses TypeScript's own parser rather than regexes, so `import type` is
 * distinguishable from a value import — the distinction the type-only
 * exemption rests on.
 */

export const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

export interface SourceImport {
  /** Path of the imported module, relative to `src/`. */
  to: string;
  /** True when every binding in the statement is erased at compile time. */
  typeOnly: boolean;
}

export interface SourceEntity {
  name: string;
  kind: string;
  /** Members for a class or interface; parameters for a function. */
  elements: string[];
}

export interface SourceFile {
  /** Path relative to `src/`, e.g. `core/heading.ts`. */
  path: string;
  folder: string;
  imports: SourceImport[];
  entities: SourceEntity[];
  /** True when the file declares types and nothing that can run. */
  typeOnly: boolean;
}

export function readSourceTree(): SourceFile[] {
  return listTypeScriptFiles(SRC).map(readSource);
}

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function readSource(absolutePath: string): SourceFile {
  const text = readFileSync(absolutePath, 'utf8');
  const ast = ts.createSourceFile(absolutePath, text, ts.ScriptTarget.Latest, true);
  const path = relative(SRC, absolutePath);
  const entities = ast.statements.flatMap(describeStatement);

  return {
    path,
    folder: dirname(path),
    imports: ast.statements.flatMap((statement) =>
      describeImport(statement, absolutePath)
    ),
    entities,
    typeOnly: entities.every((entity) => entity.kind === 'interface' || entity.kind === 'type'),
  };
}

/** Relative imports and re-exports, resolved to a path under `src/`. */
function describeImport(statement: ts.Statement, from: string): SourceImport[] {
  const isImport = ts.isImportDeclaration(statement);
  const isExportFrom = ts.isExportDeclaration(statement) && statement.moduleSpecifier;
  if (!isImport && !isExportFrom) {
    return [];
  }

  const specifier = (statement as ts.ImportDeclaration | ts.ExportDeclaration)
    .moduleSpecifier;
  if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) {
    return [];
  }

  const target = relative(SRC, resolve(dirname(from), `${specifier.text}.ts`));
  return [{ to: target, typeOnly: isTypeOnly(statement) }];
}

function isTypeOnly(statement: ts.Statement): boolean {
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    if (!clause) {
      return false;
    }
    if (clause.isTypeOnly) {
      return true;
    }
    const bindings = clause.namedBindings;
    return Boolean(
      bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((element) => element.isTypeOnly)
    );
  }
  return ts.isExportDeclaration(statement) && statement.isTypeOnly;
}

function describeStatement(statement: ts.Statement): SourceEntity[] {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    return [
      {
        name: statement.name.text,
        kind: 'function',
        elements: statement.parameters.map((parameter) => parameter.name.getText()),
      },
    ];
  }
  if (ts.isClassDeclaration(statement) && statement.name) {
    return [
      {
        name: statement.name.text,
        kind: 'class',
        elements: statement.members.map(memberName),
      },
    ];
  }
  if (ts.isInterfaceDeclaration(statement)) {
    return [
      {
        name: statement.name.text,
        kind: 'interface',
        elements: statement.members.map(memberName),
      },
    ];
  }
  if (ts.isTypeAliasDeclaration(statement)) {
    return [{ name: statement.name.text, kind: 'type', elements: [] }];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.map((declaration) => ({
      name: declaration.name.getText(),
      kind: 'const',
      elements: [],
    }));
  }
  return [];
}

function memberName(member: ts.ClassElement | ts.TypeElement): string {
  return member.name?.getText() ?? 'constructor';
}
