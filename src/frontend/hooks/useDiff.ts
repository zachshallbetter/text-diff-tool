import { useState, useCallback } from 'react';
import type { DiffResult, DiffOptions } from '../../core.js';

interface DiffResponse extends DiffResult {
  insights?: any;
  summary?: any;
  analysis?: {
    original: any;
    modified: any;
  };
}

export function useDiff() {
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeDiff = useCallback(async (
    original: string,
    modified: string,
    options: DiffOptions
  ) => {
    if (!original || !modified) {
      setDiffResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = options.semanticAnalysis 
        ? '/api/diff/semantic'
        : '/api/diff';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original,
          modified,
          options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compute diff');
      }

      const data = await response.json();
      setDiffResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setDiffResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const streamDiff = useCallback(async (
    original: string,
    modified: string,
    options: DiffOptions,
    onProgress?: (progress: number, partial: DiffResult | null) => void,
    onComplete?: (result: DiffResponse) => void
  ) => {
    if (!original || !modified) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diff/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original,
          modified,
          options: { ...options, semanticAnalysis: true },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream not available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'progress') {
              onProgress?.(data.progress, data.partial);
            } else if (data.type === 'complete') {
              setDiffResult(data.data);
              onComplete?.(data.data);
              setLoading(false);
              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return {
    diffResult,
    loading,
    error,
    computeDiff,
    streamDiff,
  };
}
