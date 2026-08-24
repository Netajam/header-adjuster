/**
 * The one word every layer of the plugin has to say.
 *
 * The settings store a default for each direction, the dialog labels itself
 * with one, the commands come in pairs of them, and the core measures a shift
 * by one — so it belongs to none of them and sits above all of them. Keeping it
 * out of `core/` is what stops four folders from reaching into `core/` for a
 * three-line definition.
 */
export type AdjustmentOperation = 'increase' | 'decrease';
