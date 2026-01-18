#!/usr/bin/env node

/**
 * CLI entry point for text diff tool
 */

import { readFileSync } from 'fs';
import { diff, formatDiff, formatDiffJson, type DiffOptions } from './core.js';
import { VERSION } from './utils.js';

function parseArgs(args: string[]): {
  original: string;
  modified: string;
  options: DiffOptions & { output?: 'text' | 'json' };
} {
  const options: DiffOptions & { output?: 'text' | 'json' } = {
    granularity: 'line',
    ignoreWhitespace: false,
    ignoreCase: false,
    output: 'text',
  };

  let original: string | undefined;
  let modified: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--granularity':
      case '-g':
        options.granularity = args[++i] as 'line' | 'word' | 'character';
        break;
      case '--ignore-whitespace':
      case '-w':
        options.ignoreWhitespace = true;
        break;
      case '--ignore-case':
      case '-i':
        options.ignoreCase = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as 'text' | 'json';
        break;
      case '--version':
      case '-v':
        console.log(`text-diff-tool v${VERSION}`);
        process.exit(0);
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: text-diff [options] <original> <modified>

Options:
  -g, --granularity <level>    Diff granularity: line, word, or character (default: line)
  -w, --ignore-whitespace       Ignore whitespace differences
  -i, --ignore-case             Ignore case differences
  -o, --output <format>         Output format: text or json (default: text)
  -v, --version                 Show version number
  -h, --help                    Show this help message

Arguments:
  <original>                    Original text or path to file (use - for stdin)
  <modified>                    Modified text or path to file (use - for stdin)

Examples:
  text-diff file1.txt file2.txt
  text-diff -g word "old text" "new text"
  text-diff -w -i file1.txt file2.txt
  echo "text1" | text-diff - "text2"
        `);
        process.exit(0);
        break;
      default:
        if (!original) {
          original = arg;
        } else if (!modified) {
          modified = arg;
        } else {
          console.error(`Unknown argument: ${arg}`);
          process.exit(1);
        }
    }
  }

  if (!original || !modified) {
    console.error('Error: Both original and modified arguments are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  return { original, modified, options };
}

function readText(source: string): string {
  if (source === '-') {
    return readFileSync(0, 'utf-8');
  }
  try {
    return readFileSync(source, 'utf-8');
  } catch (error) {
    // If file doesn't exist, treat as literal text
    return source;
  }
}

function main() {
  const args = process.argv.slice(2);
  const { original, modified, options } = parseArgs(args);

  const originalText = readText(original);
  const modifiedText = readText(modified);

  const result = diff(originalText, modifiedText, options);

  if (options.output === 'json') {
    console.log(formatDiffJson(result));
  } else {
    console.log(formatDiff(result, { color: true }));
  }
}

main();
