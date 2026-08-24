import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { readSourceTree } from './support/sourceTree';
import type { SourceFile } from './support/sourceTree';

/**
 * The structural rules `src/` is written to, checked rather than asserted.
 *
 *   1. Every folder has exactly one entry file — its door.
 *   2. Every file gets its dependencies from its parent: the import graph is a
 *      tree rooted at main.ts, so no file has two importers.
 *   3. No file declares more than 7 entities.
 *   4. No entity has more than 7 elements — members for a class or interface,
 *      parameters for a function.
 *
 * Rule 2 has one carve-out: modules that declare types and nothing else. A
 * type is erased at compile time, so importing one couples nothing and cannot
 * appear in the shipped module graph — it is vocabulary, not a dependency. The
 * carve-out is earned per file, not granted by name: a type-only module that
 * grows a function stops qualifying and the tree rule starts applying to it.
 */

const LIMIT = 7;
const ROOT = 'main.ts';

const files = readSourceTree();
const byPath = new Map(files.map((file) => [file.path, file]));

/** Import edges that survive compilation — the ones the tree rule governs. */
function structuralEdges(): Array<{ from: SourceFile; to: SourceFile }> {
  const edges: Array<{ from: SourceFile; to: SourceFile }> = [];

  for (const from of files) {
    const targets = new Set(from.imports.map((imported) => imported.to));
    for (const path of targets) {
      const to = byPath.get(path);
      assert.ok(to, `${from.path} imports ${path}, which does not exist`);
      if (!to.typeOnly) {
        edges.push({ from, to });
      }
    }
  }

  return edges;
}

const edges = structuralEdges();

describe('rule 1: one door per folder', () => {
  const folders = [...new Set(files.map((file) => file.folder))].filter((f) => f !== '.');

  for (const folder of folders) {
    test(`${folder}/ is entered at exactly one file`, () => {
      const doors = new Set(
        edges
          .filter((edge) => edge.to.folder === folder && edge.from.folder !== folder)
          .map((edge) => edge.to.path)
      );

      assert.equal(
        doors.size,
        1,
        `expected one door into ${folder}/, found ${doors.size}: ${[...doors].join(', ')}`
      );
    });
  }
});

describe('rule 2: every file gets its dependencies from its parent', () => {
  for (const file of files) {
    if (file.typeOnly) {
      continue;
    }

    test(`${file.path} has exactly one parent`, () => {
      const parents = edges
        .filter((edge) => edge.to.path === file.path)
        .map((edge) => edge.from.path);

      if (file.path === ROOT) {
        assert.deepEqual(parents, [], 'the root is imported by nothing');
        return;
      }

      assert.equal(
        parents.length,
        1,
        `expected one parent for ${file.path}, found ${parents.length}: ${parents.join(', ')}`
      );
    });
  }

  test('the graph is a tree: every file is reachable from the root', () => {
    const children = new Map<string, string[]>();
    for (const edge of edges) {
      children.set(edge.from.path, [...(children.get(edge.from.path) ?? []), edge.to.path]);
    }

    const seen = new Set<string>();
    const queue = [ROOT];
    while (queue.length > 0) {
      const path = queue.pop() as string;
      if (seen.has(path)) {
        continue;
      }
      seen.add(path);
      queue.push(...(children.get(path) ?? []));
    }

    const unreachable = files
      .filter((file) => !file.typeOnly && !seen.has(file.path))
      .map((file) => file.path);

    assert.deepEqual(unreachable, []);
  });

  test('a folder never reaches into a sibling folder past its door', () => {
    const crossFolder = edges.filter(
      (edge) => edge.from.folder !== edge.to.folder && edge.to.folder !== '.'
    );

    for (const edge of crossFolder) {
      const door = doorOf(edge.to.folder);
      assert.equal(
        edge.to.path,
        door,
        `${edge.from.path} reaches ${edge.to.path}, but the door of ${edge.to.folder}/ is ${door}`
      );
    }
  });
});

describe('rule 2, continued: no file re-exports what another file declares', () => {
  /**
   * A re-export makes this file look like the parent while the caller stays
   * coupled to whatever is behind it — the arrow in the graph points at the
   * wrong file. Banning them outright is what keeps "one parent" mean what it
   * says, since a name can then only come from where it was declared.
   */
  for (const file of files) {
    test(`${file.path} declares what it exports`, () => {
      assert.deepEqual(
        file.reExports,
        [],
        `${file.path} re-exports ${file.reExports.join(', ')}; import from where they are declared instead`
      );
    });
  }
});

describe('the type-only carve-out stays honest', () => {
  const exempt = files.filter((file) => file.typeOnly);

  test('there is at least one type-only module, and it is reachable by name', () => {
    assert.ok(exempt.length > 0, 'expected a shared vocabulary module');
  });

  for (const file of exempt) {
    test(`${file.path} declares types and nothing that can run`, () => {
      const runnable = file.entities.filter(
        (entity) => entity.kind !== 'interface' && entity.kind !== 'type'
      );

      assert.deepEqual(
        runnable.map((entity) => entity.name),
        [],
        `${file.path} is exempt from the tree rule, so it must stay type-only`
      );
    });

    test(`${file.path} imports nothing itself`, () => {
      assert.deepEqual(file.imports.map((imported) => imported.to), []);
    });
  }
});

describe(`rule 3: no file declares more than ${LIMIT} entities`, () => {
  for (const file of files) {
    test(`${file.path} declares ${file.entities.length}`, () => {
      assert.ok(
        file.entities.length <= LIMIT,
        `${file.path} declares ${file.entities.length}: ${file.entities
          .map((entity) => entity.name)
          .join(', ')}`
      );
    });
  }
});

describe(`rule 4: no entity has more than ${LIMIT} elements`, () => {
  for (const file of files) {
    for (const entity of file.entities) {
      if (entity.elements.length === 0) {
        continue;
      }

      test(`${file.path} — ${entity.name} has ${entity.elements.length}`, () => {
        assert.ok(
          entity.elements.length <= LIMIT,
          `${entity.name} has ${entity.elements.length}: ${entity.elements.join(', ')}`
        );
      });
    }
  }
});

/** The single file outsiders enter a folder through. */
function doorOf(folder: string): string {
  const doors = new Set(
    edges
      .filter((edge) => edge.to.folder === folder && edge.from.folder !== folder)
      .map((edge) => edge.to.path)
  );
  return [...doors][0] ?? `${folder}/?`;
}
