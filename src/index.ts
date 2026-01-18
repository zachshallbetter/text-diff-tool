/**
 * Text diff tool - Main library exports
 */

export { diff, formatDiff, formatDiffJson, streamDiff, analyzeText, summarizeChanges } from './core.js';
export {
  findNextChange,
  findPreviousChange,
  getAllChangeIndices,
  computeDiffInsights,
  generateMergedText,
  computeCharacterDiff,
} from './core.js';
export { VERSION } from './utils.js';
export type { DiffChange, DiffResult, DiffOptions } from './core.js';
