/**
 * Core diff types, algorithms, and utilities
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a single change in a diff operation
 */
export interface DiffChange {
  /** The type of change */
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  /** The original text (for removed/modified) */
  original?: string;
  /** The new text (for added/modified) */
  modified?: string;
  /** Line number in the original text (1-indexed) */
  originalLine?: number;
  /** Line number in the modified text (1-indexed) */
  modifiedLine?: number;
  /** Semantic similarity score (0-1) for modified changes */
  similarity?: number;
  /** Explanation of the change for agent understanding */
  explanation?: string;
  /** Key words that changed */
  keyWords?: {
    added: string[];
    removed: string[];
  };
}

/**
 * Result of a diff operation
 */
export interface DiffResult {
  /** Array of changes */
  changes: DiffChange[];
  /** Statistics about the diff */
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

/**
 * Options for diff operations
 */
export interface DiffOptions {
  /** Granularity level: 'line', 'word', 'character', 'sentence', or 'paragraph' */
  granularity?: 'line' | 'word' | 'character' | 'sentence' | 'paragraph';
  /** Whether to ignore whitespace differences */
  ignoreWhitespace?: boolean;
  /** Whether to ignore case differences */
  ignoreCase?: boolean;
  /** Whether to enable semantic analysis for better text understanding */
  semanticAnalysis?: boolean;
  /** Minimum similarity threshold for semantic matching (0-1) */
  similarityThreshold?: number;
}

// ============================================================================
// Core Diff Algorithm
// ============================================================================

/**
 * Normalizes text based on options
 */
function normalize(text: string, options: DiffOptions): string {
  let normalized = text;
  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

/**
 * Splits text into tokens based on granularity
 */
function tokenize(text: string, granularity: 'line' | 'word' | 'character' | 'sentence' | 'paragraph'): string[] {
  switch (granularity) {
    case 'line':
      return text.split(/\r?\n/);
    case 'word':
      return text.split(/(\s+)/).filter(token => token.length > 0);
    case 'character':
      return text.split('');
    case 'sentence':
      // Split by sentence endings, preserving punctuation
      return text.split(/([.!?]+[\s\n]+)/).filter(s => s.trim().length > 0);
    case 'paragraph':
      // Split by double newlines or significant whitespace
      return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    default:
      return [text];
  }
}

/**
 * Computes semantic similarity between two text strings
 * Uses simple word overlap and edit distance for text content
 */
function computeSemanticSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
  
  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0.0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  // Jaccard similarity
  const jaccard = intersection.size / union.size;
  
  // Also consider length similarity
  const lengthRatio = Math.min(text1.length, text2.length) / Math.max(text1.length, text2.length);
  
  // Weighted combination
  return (jaccard * 0.7 + lengthRatio * 0.3);
}

/**
 * Computes the longest common subsequence (LCS) between two arrays
 */
function lcs<T>(arr1: T[], arr2: T[]): T[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: T[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      result.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Performs a diff operation between two texts
 */
export function diff(
  original: string,
  modified: string,
  options: DiffOptions = {}
): DiffResult {
  const {
    granularity = 'line',
    ignoreWhitespace = false,
    ignoreCase = false,
  } = options;

  const opts = { granularity, ignoreWhitespace, ignoreCase };

  // Tokenize both texts
  const tokens1 = tokenize(original, granularity);
  const tokens2 = tokenize(modified, granularity);

  // Normalize tokens for comparison
  const normalized1 = tokens1.map(t => normalize(t, opts));
  const normalized2 = tokens2.map(t => normalize(t, opts));

  // Find LCS
  const common = lcs(normalized1, normalized2);

  // Build diff changes
  const changes: DiffChange[] = [];
  let i = 0;
  let j = 0;
  let k = 0;
  let originalLine = 1;
  let modifiedLine = 1;

  while (i < tokens1.length || j < tokens2.length) {
    if (i < tokens1.length && j < tokens2.length) {
      const norm1 = normalized1[i];
      const norm2 = normalized2[j];

      if (norm1 === norm2 && k < common.length && norm1 === common[k]) {
        // Unchanged
        changes.push({
          type: 'unchanged',
          original: tokens1[i],
          modified: tokens2[j],
          originalLine: granularity === 'line' ? originalLine : undefined,
          modifiedLine: granularity === 'line' ? modifiedLine : undefined,
        });
        i++;
        j++;
        k++;
        if (granularity === 'line') {
          originalLine++;
          modifiedLine++;
        }
      } else if (k < common.length && norm1 === common[k]) {
        // Added in modified
        changes.push({
          type: 'added',
          modified: tokens2[j],
          modifiedLine: granularity === 'line' ? modifiedLine : undefined,
        });
        j++;
        if (granularity === 'line') {
          modifiedLine++;
        }
      } else if (k < common.length && norm2 === common[k]) {
        // Removed from original
        changes.push({
          type: 'removed',
          original: tokens1[i],
          originalLine: granularity === 'line' ? originalLine : undefined,
        });
        i++;
        if (granularity === 'line') {
          originalLine++;
        }
      } else {
        // Modified (different content) - apply semantic analysis if enabled
        const origText = tokens1[i];
        const modText = tokens2[j];
        const similarity = options.semanticAnalysis 
          ? computeSemanticSimilarity(origText, modText)
          : undefined;
        
        const change: DiffChange = {
          type: 'modified',
          original: origText,
          modified: modText,
          originalLine: granularity === 'line' ? originalLine : undefined,
          modifiedLine: granularity === 'line' ? modifiedLine : undefined,
        };

        if (options.semanticAnalysis && similarity !== undefined) {
          change.similarity = similarity;
          
          // Generate explanation and key words
          const origWords = new Set((origText.toLowerCase().match(/\b\w+\b/g) || []).filter(w => w.length > 3));
          const modWords = new Set((modText.toLowerCase().match(/\b\w+\b/g) || []).filter(w => w.length > 3));
          const addedWords = [...modWords].filter(w => !origWords.has(w));
          const removedWords = [...origWords].filter(w => !modWords.has(w));
          
          change.keyWords = {
            added: addedWords.slice(0, 5),
            removed: removedWords.slice(0, 5),
          };
          
          // Generate explanation
          if (similarity > (options.similarityThreshold || 0.5)) {
            change.explanation = `Reworded with ${Math.round(similarity * 100)}% similarity. Key changes: ${addedWords.length > 0 ? `added "${addedWords[0]}"` : ''} ${removedWords.length > 0 ? `removed "${removedWords[0]}"` : ''}`.trim();
          } else {
            change.explanation = `Significantly modified. New focus: ${addedWords.slice(0, 2).join(', ')}`;
          }
        }
        
        changes.push(change);
        i++;
        j++;
        if (granularity === 'line') {
          originalLine++;
          modifiedLine++;
        }
      }
    } else if (i < tokens1.length) {
      // Remaining in original
      changes.push({
        type: 'removed',
        original: tokens1[i],
        originalLine: granularity === 'line' ? originalLine : undefined,
      });
      i++;
      if (granularity === 'line') {
        originalLine++;
      }
    } else if (j < tokens2.length) {
      // Remaining in modified
      changes.push({
        type: 'added',
        modified: tokens2[j],
        modifiedLine: granularity === 'line' ? modifiedLine : undefined,
      });
      j++;
      if (granularity === 'line') {
        modifiedLine++;
      }
    }
  }

  // Calculate statistics
  const stats = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
    unchanged: changes.filter(c => c.type === 'unchanged').length,
  };

  return { changes, stats };
}

// ============================================================================
// Advanced Diff Utilities
// ============================================================================

/**
 * Finds the next change index from a given position
 */
export function findNextChange(changes: DiffChange[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < changes.length; i++) {
    if (changes[i].type !== 'unchanged') {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the previous change index from a given position
 */
export function findPreviousChange(changes: DiffChange[], currentIndex: number): number {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (changes[i].type !== 'unchanged') {
      return i;
    }
  }
  return -1;
}

/**
 * Gets all change indices
 */
export function getAllChangeIndices(changes: DiffChange[]): number[] {
  return changes
    .map((change, index) => (change.type !== 'unchanged' ? index : -1))
    .filter(index => index !== -1);
}

/**
 * Computes diff statistics with additional insights
 */
export function computeDiffInsights(result: DiffResult): {
  totalChanges: number;
  changePercentage: number;
  similarity: number;
  largestChange: DiffChange | null;
  changeDistribution: Record<string, number>;
} {
  const { changes, stats } = result;
  const totalChanges = stats.added + stats.removed + stats.modified;
  const totalLines = changes.length;
  const changePercentage = totalLines > 0 ? (totalChanges / totalLines) * 100 : 0;
  const similarity = totalLines > 0 ? (stats.unchanged / totalLines) * 100 : 100;

  let largestChange: DiffChange | null = null;
  let maxLength = 0;

  changes.forEach(change => {
    if (change.type !== 'unchanged') {
      const length = Math.max(
        (change.original || '').length,
        (change.modified || '').length
      );
      if (length > maxLength) {
        maxLength = length;
        largestChange = change;
      }
    }
  });

  return {
    totalChanges,
    changePercentage: Math.round(changePercentage * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
    largestChange,
    changeDistribution: {
      added: stats.added,
      removed: stats.removed,
      modified: stats.modified,
      unchanged: stats.unchanged,
    },
  };
}

/**
 * Generates a merged version by accepting/rejecting changes
 */
export function generateMergedText(
  changes: DiffChange[],
  decisions: Map<number, 'accept' | 'reject' | 'keep'>
): string {
  const lines: string[] = [];

  changes.forEach((change, index) => {
    const decision = decisions.get(index) || 'keep';

    switch (change.type) {
      case 'added':
        if (decision === 'accept' || decision === 'keep') {
          lines.push(change.modified || '');
        }
        break;
      case 'removed':
        if (decision === 'reject' || decision === 'keep') {
          lines.push(change.original || '');
        }
        break;
      case 'modified':
        if (decision === 'accept') {
          lines.push(change.modified || '');
        } else if (decision === 'reject') {
          lines.push(change.original || '');
        } else {
          // Keep both or use modified as default
          lines.push(change.modified || '');
        }
        break;
      case 'unchanged':
        lines.push(change.original || '');
        break;
    }
  });

  return lines.join('\n');
}

/**
 * Computes character-level diff for highlighting
 */
export function computeCharacterDiff(original: string, modified: string): {
  original: Array<{ char: string; type: 'removed' | 'unchanged' }>;
  modified: Array<{ char: string; type: 'added' | 'unchanged' }>;
} {
  const origChars = original.split('');
  const modChars = modified.split('');

  // Simple character-by-character comparison
  const origResult: Array<{ char: string; type: 'removed' | 'unchanged' }> = [];
  const modResult: Array<{ char: string; type: 'added' | 'unchanged' }> = [];

  let origIdx = 0;
  let modIdx = 0;

  while (origIdx < origChars.length || modIdx < modChars.length) {
    const origChar = origChars[origIdx];
    const modChar = modChars[modIdx];

    if (origChar === modChar && origChar !== undefined && modChar !== undefined) {
      origResult.push({ char: origChar, type: 'unchanged' });
      modResult.push({ char: modChar, type: 'unchanged' });
      origIdx++;
      modIdx++;
    } else if (origIdx >= origChars.length) {
      modResult.push({ char: modChar, type: 'added' });
      modIdx++;
    } else if (modIdx >= modChars.length) {
      origResult.push({ char: origChar, type: 'removed' });
      origIdx++;
    } else {
      origResult.push({ char: origChar, type: 'removed' });
      modResult.push({ char: modChar, type: 'added' });
      origIdx++;
      modIdx++;
    }
  }

  return { original: origResult, modified: modResult };
}

// ============================================================================
// Formatters
// ============================================================================

import chalk from 'chalk';

/**
 * Formats diff results for console output
 */
export function formatDiff(result: DiffResult, options: { color?: boolean } = {}): string {
  const { color = true } = options;
  const output: string[] = [];

  if (!color) {
    // Plain text output
    for (const change of result.changes) {
      switch (change.type) {
        case 'added':
          output.push(`+ ${change.modified}`);
          break;
        case 'removed':
          output.push(`- ${change.original}`);
          break;
        case 'modified':
          output.push(`~ ${change.original} -> ${change.modified}`);
          break;
        case 'unchanged':
          output.push(`  ${change.original}`);
          break;
      }
    }
  } else {
    // Colored output
    for (const change of result.changes) {
      const linePrefix = change.originalLine !== undefined || change.modifiedLine !== undefined
        ? `${String(change.originalLine ?? ' ').padStart(4)} ${String(change.modifiedLine ?? ' ').padStart(4)} `
        : '';

      switch (change.type) {
        case 'added':
          output.push(
            `${linePrefix}${chalk.green('+')} ${chalk.green(change.modified ?? '')}`
          );
          break;
        case 'removed':
          output.push(
            `${linePrefix}${chalk.red('-')} ${chalk.red(change.original ?? '')}`
          );
          break;
        case 'modified':
          output.push(
            `${linePrefix}${chalk.yellow('~')} ${chalk.red(change.original ?? '')} ${chalk.gray('->')} ${chalk.green(change.modified ?? '')}`
          );
          break;
        case 'unchanged':
          output.push(
            `${linePrefix}${chalk.gray(' ')} ${change.original ?? ''}`
          );
          break;
      }
    }
  }

  // Add statistics
  output.push('');
  output.push('Statistics:');
  output.push(`  Added:    ${result.stats.added}`);
  output.push(`  Removed:  ${result.stats.removed}`);
  output.push(`  Modified: ${result.stats.modified}`);
  output.push(`  Unchanged: ${result.stats.unchanged}`);

  return output.join('\n');
}

/**
 * Formats diff results as JSON
 */
export function formatDiffJson(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}

// ============================================================================
// Text Analysis Utilities
// ============================================================================

/**
 * Analyzes text content for agent understanding
 */
export function analyzeText(text: string): {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  averageCharsPerWord: number;
  readability: {
    score: number;
    level: string;
  };
  keyTerms: string[];
} {
  const words = text.match(/\b\w+\b/g) || [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const averageCharsPerWord = wordCount > 0 ? text.replace(/\s/g, '').length / wordCount : 0;
  
  // Simple readability score (Flesch-like approximation)
  const avgSentenceLength = averageWordsPerSentence;
  const avgWordLength = averageCharsPerWord;
  const readabilityScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgWordLength);
  const readabilityLevel = readabilityScore >= 90 ? 'Very Easy'
    : readabilityScore >= 80 ? 'Easy'
    : readabilityScore >= 70 ? 'Fairly Easy'
    : readabilityScore >= 60 ? 'Standard'
    : readabilityScore >= 50 ? 'Fairly Difficult'
    : readabilityScore >= 30 ? 'Difficult'
    : 'Very Difficult';
  
  // Extract key terms (words that appear frequently, excluding common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    const lower = word.toLowerCase();
    if (!commonWords.has(lower) && word.length > 4) {
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    }
  });
  
  const keyTerms = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordsPerSentence: Math.round(averageWordsPerSentence * 100) / 100,
    averageCharsPerWord: Math.round(averageCharsPerWord * 100) / 100,
    readability: {
      score: Math.round(readabilityScore * 100) / 100,
      level: readabilityLevel,
    },
    keyTerms,
  };
}

/**
 * Generates a summary of changes for agent understanding
 */
export function summarizeChanges(result: DiffResult): {
  summary: string;
  changeTypes: Record<string, number>;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
} {
  const { stats, changes } = result;
  const totalChanges = stats.added + stats.removed + stats.modified;
  const totalItems = changes.length;
  const changeRatio = totalItems > 0 ? totalChanges / totalItems : 0;
  
  let summary = '';
  if (stats.added > 0) summary += `Added ${stats.added} item${stats.added !== 1 ? 's' : ''}. `;
  if (stats.removed > 0) summary += `Removed ${stats.removed} item${stats.removed !== 1 ? 's' : ''}. `;
  if (stats.modified > 0) summary += `Modified ${stats.modified} item${stats.modified !== 1 ? 's' : ''}. `;
  if (stats.unchanged > 0) summary += `${stats.unchanged} item${stats.unchanged !== 1 ? 's' : ''} unchanged.`;
  
  const impact: 'low' | 'medium' | 'high' = changeRatio < 0.1 ? 'low' : changeRatio < 0.3 ? 'medium' : 'high';
  
  const recommendations: string[] = [];
  if (stats.added > stats.removed * 2) {
    recommendations.push('Content expansion detected - verify new information is accurate');
  }
  if (stats.removed > stats.added * 2) {
    recommendations.push('Content reduction detected - verify important information was not lost');
  }
  if (stats.modified > stats.added + stats.removed) {
    recommendations.push('Extensive rewording detected - review for meaning preservation');
  }
  if (changeRatio > 0.5) {
    recommendations.push('Major changes detected - comprehensive review recommended');
  }
  
  return {
    summary: summary.trim() || 'No changes detected',
    changeTypes: {
      added: stats.added,
      removed: stats.removed,
      modified: stats.modified,
      unchanged: stats.unchanged,
    },
    impact,
    recommendations,
  };
}

/**
 * Streams diff computation for large texts (chunked processing)
 */
export async function* streamDiff(
  original: string,
  modified: string,
  options: DiffOptions = {},
  chunkSize: number = 1000
): AsyncGenerator<{ progress: number; partial: DiffResult | null; complete: boolean }> {
  const totalLength = Math.max(original.length, modified.length);
  let processed = 0;
  
  // For very large texts, process in chunks
  if (totalLength > chunkSize * 10) {
    const origChunks = original.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) || [original];
    const modChunks = modified.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) || [modified];
    
    const allChanges: DiffChange[] = [];
    let chunkIndex = 0;
    const maxChunks = Math.max(origChunks.length, modChunks.length);
    
    for (let i = 0; i < maxChunks; i++) {
      const origChunk = origChunks[i] || '';
      const modChunk = modChunks[i] || '';
      
      const chunkResult = diff(origChunk, modChunk, options);
      allChanges.push(...chunkResult.changes);
      
      processed += Math.max(origChunk.length, modChunk.length);
      chunkIndex++;
      
      yield {
        progress: Math.min(100, (processed / totalLength) * 100),
        partial: {
          changes: allChanges,
          stats: {
            added: allChanges.filter(c => c.type === 'added').length,
            removed: allChanges.filter(c => c.type === 'removed').length,
            modified: allChanges.filter(c => c.type === 'modified').length,
            unchanged: allChanges.filter(c => c.type === 'unchanged').length,
          },
        },
        complete: false,
      };
    }
    
    // Final complete result
    const finalStats = {
      added: allChanges.filter(c => c.type === 'added').length,
      removed: allChanges.filter(c => c.type === 'removed').length,
      modified: allChanges.filter(c => c.type === 'modified').length,
      unchanged: allChanges.filter(c => c.type === 'unchanged').length,
    };
    
    yield {
      progress: 100,
      partial: { changes: allChanges, stats: finalStats },
      complete: true,
    };
  } else {
    // Small enough to process at once
    const result = diff(original, modified, options);
    yield {
      progress: 50,
      partial: result,
      complete: false,
    };
    yield {
      progress: 100,
      partial: result,
      complete: true,
    };
  }
}
