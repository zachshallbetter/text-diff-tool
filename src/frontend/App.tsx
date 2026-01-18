import React, { useState, useCallback } from 'react';
import EditorPanel from './components/EditorPanel';
import DiffView from './components/DiffView';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import SemanticAnalysis from './components/SemanticAnalysis';
import Header from './components/Header';
import { useDiff } from './hooks/useDiff';
import { useTheme } from './hooks/useTheme';
import type { DiffOptions } from '../core.js';
import './App.css';

const App: React.FC = () => {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [options, setOptions] = useState<DiffOptions>({
    granularity: 'line',
    ignoreWhitespace: false,
    ignoreCase: false,
    semanticAnalysis: true,
  });
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  const { diffResult, loading, error, computeDiff, streamDiff } = useDiff();
  const { theme, toggleTheme } = useTheme();

  const handleDiff = useCallback(() => {
    if (options.semanticAnalysis) {
      computeDiff(original, modified, options);
    } else {
      computeDiff(original, modified, options);
    }
  }, [original, modified, options, computeDiff]);

  const handleRealtimeChange = useCallback(() => {
    if (realtimeEnabled && original && modified) {
      // Debounced real-time diff
      const timeoutId = setTimeout(() => {
        computeDiff(original, modified, options);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [original, modified, options, realtimeEnabled, computeDiff]);

  React.useEffect(() => {
    if (realtimeEnabled) {
      return handleRealtimeChange();
    }
  }, [original, modified, options, realtimeEnabled, handleRealtimeChange]);

  return (
    <div className="app" data-theme={theme}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <div className="app-container">
        <div className="app-sidebar">
          <Controls
            options={options}
            onOptionsChange={setOptions}
            realtimeEnabled={realtimeEnabled}
            onRealtimeToggle={setRealtimeEnabled}
            onComputeDiff={handleDiff}
            loading={loading}
          />
          {diffResult && (
            <>
              <StatsPanel stats={diffResult.stats} insights={diffResult.insights} />
              {diffResult.summary && (
                <SemanticAnalysis
                  summary={diffResult.summary}
                  analysis={diffResult.analysis}
                />
              )}
            </>
          )}
        </div>
        <div className="app-main">
          <div className="editor-section">
            <EditorPanel
              label="Original Text"
              value={original}
              onChange={setOriginal}
              placeholder="Enter original text here..."
            />
            <EditorPanel
              label="Modified Text"
              value={modified}
              onChange={setModified}
              placeholder="Enter modified text here..."
            />
          </div>
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          {diffResult && (
            <DiffView
              changes={diffResult.changes}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
