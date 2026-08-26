import type { AdjustmentOperation, LinePlacement } from '../contracts';

/**
 * The symbol each action is known by.
 *
 * On the mobile toolbar a symbol is the whole of what a user has to go on:
 * there is no room for a name, so two actions sharing a glyph are two actions
 * that cannot be told apart. That makes the symbol part of what an action *is*,
 * which is why it is written down once here and read by every surface rather
 * than chosen again at each one.
 *
 * Direction is carried by the family — an up glyph increases, its down twin
 * decreases — and scope by which family it is, so a user learns two things
 * rather than eleven. `tests/commands/icons.test.ts` holds them apart.
 */

/** What a shift applies to. The four scopes, as the surfaces name them. */
export type ShiftScope = 'prompt' | 'document' | 'selection' | 'line';

/**
 * A symbol per scope and direction.
 *
 * The solid arrows are the dialog, which is the one that asks how far; the file
 * is the whole note; the box is the selected block; the bare chevron is a single
 * line taking a single step. Chevron against solid arrow is the widest gap the
 * set has, which is what the two most likely to be pinned together want.
 */
export const SHIFT_ICON: Record<ShiftScope, Record<AdjustmentOperation, string>> = {
  prompt: { increase: 'arrow-big-up', decrease: 'arrow-big-down' },
  document: { increase: 'file-plus', decrease: 'file-minus' },
  selection: { increase: 'plus-square', decrease: 'minus-square' },
  line: { increase: 'chevron-up', decrease: 'chevron-down' },
};

/**
 * A symbol per placement.
 *
 * These name a level rather than a direction, so they say what the line becomes
 * instead of which way it moves: the markup stripped off, a level held equal, a
 * step in and down.
 */
export const PLACEMENT_ICON: Record<LinePlacement, string> = {
  plain: 'remove-formatting',
  sibling: 'equal',
  child: 'corner-down-right',
};
