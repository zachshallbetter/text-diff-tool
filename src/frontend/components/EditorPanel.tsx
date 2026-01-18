import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface EditorPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => {
  const [stats, setStats] = React.useState({ lines: 0, words: 0, chars: 0 });

  useEffect(() => {
    const lines = value.split('\n').length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const chars = value.length;
    setStats({ lines, words, chars });
  }, [value]);

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <label className="editor-label">{label}</label>
        <div className="editor-stats">
          {stats.lines} line{stats.lines !== 1 ? 's' : ''} • {stats.words} word{stats.words !== 1 ? 's' : ''} • {stats.chars} char{stats.chars !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="editor-container">
        <Editor
          height="400px"
          defaultLanguage="plaintext"
          value={value}
          onChange={(val) => onChange(val || '')}
          theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: true },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontSize: 14,
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            automaticLayout: true,
          }}
          loading={<div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Loading editor...</div>}
        />
        {!value && placeholder && (
          <div className="editor-placeholder">{placeholder}</div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;
