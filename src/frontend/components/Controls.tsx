import React from 'react';
import type { DiffOptions } from '../../core.js';

interface ControlsProps {
  options: DiffOptions;
  onOptionsChange: (options: DiffOptions) => void;
  realtimeEnabled: boolean;
  onRealtimeToggle: (enabled: boolean) => void;
  onComputeDiff: () => void;
  loading: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  options,
  onOptionsChange,
  realtimeEnabled,
  onRealtimeToggle,
  onComputeDiff,
  loading,
}) => {
  const updateOption = <K extends keyof DiffOptions>(
    key: K,
    value: DiffOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="controls-panel">
      <h3 className="panel-title">Options</h3>
      
      <div className="control-group">
        <label className="control-label">Granularity</label>
        <select
          className="control-select"
          value={options.granularity || 'line'}
          onChange={(e) => updateOption('granularity', e.target.value as any)}
        >
          <option value="line">Line</option>
          <option value="word">Word</option>
          <option value="character">Character</option>
          <option value="sentence">Sentence</option>
          <option value="paragraph">Paragraph</option>
        </select>
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={options.ignoreWhitespace || false}
            onChange={(e) => updateOption('ignoreWhitespace', e.target.checked)}
          />
          Ignore Whitespace
        </label>
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={options.ignoreCase || false}
            onChange={(e) => updateOption('ignoreCase', e.target.checked)}
          />
          Ignore Case
        </label>
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={options.semanticAnalysis || false}
            onChange={(e) => updateOption('semanticAnalysis', e.target.checked)}
          />
          Semantic Analysis
        </label>
      </div>

      {options.semanticAnalysis && (
        <div className="control-group">
          <label className="control-label">
            Similarity Threshold: {((options.similarityThreshold || 0.5) * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={options.similarityThreshold || 0.5}
            onChange={(e) => updateOption('similarityThreshold', parseFloat(e.target.value))}
            className="control-range"
          />
        </div>
      )}

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={realtimeEnabled}
            onChange={(e) => onRealtimeToggle(e.target.checked)}
          />
          Real-time Diff
        </label>
      </div>

      {!realtimeEnabled && (
        <button
          className="btn btn-primary"
          onClick={onComputeDiff}
          disabled={loading}
        >
          {loading ? 'Computing...' : 'Compute Diff'}
        </button>
      )}
    </div>
  );
};

export default Controls;
