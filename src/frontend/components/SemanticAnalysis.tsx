import React from 'react';

interface SemanticAnalysisProps {
  summary: {
    summary: string;
    impact: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  analysis?: {
    original: any;
    modified: any;
  };
}

const SemanticAnalysis: React.FC<SemanticAnalysisProps> = ({ summary, analysis }) => {
  const impactColors = {
    low: 'var(--success)',
    medium: 'var(--warning)',
    high: 'var(--error)',
  };

  return (
    <div className="semantic-panel">
      <h3 className="panel-title">Semantic Analysis</h3>
      
      <div className="summary-section">
        <div className="summary-text">{summary.summary}</div>
        <div 
          className="impact-badge"
          style={{ backgroundColor: impactColors[summary.impact] }}
        >
          {summary.impact.toUpperCase()} Impact
        </div>
      </div>

      {summary.recommendations.length > 0 && (
        <div className="recommendations">
          <h4>Recommendations:</h4>
          <ul>
            {summary.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis && (
        <div className="text-analysis">
          <h4>Text Analysis</h4>
          <div className="analysis-grid">
            <div className="analysis-item">
              <strong>Original:</strong>
              <div>Words: {analysis.original.wordCount}</div>
              <div>Readability: {analysis.original.readability?.level}</div>
            </div>
            <div className="analysis-item">
              <strong>Modified:</strong>
              <div>Words: {analysis.modified.wordCount}</div>
              <div>Readability: {analysis.modified.readability?.level}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticAnalysis;
