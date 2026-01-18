import React from 'react';

interface StatsPanelProps {
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  insights?: {
    totalChanges: number;
    changePercentage: number;
    similarity: number;
  };
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, insights }) => {
  return (
    <div className="stats-panel">
      <h3 className="panel-title">Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card stat-added">
          <div className="stat-value">{stats.added}</div>
          <div className="stat-label">Added</div>
        </div>
        <div className="stat-card stat-removed">
          <div className="stat-value">{stats.removed}</div>
          <div className="stat-label">Removed</div>
        </div>
        <div className="stat-card stat-modified">
          <div className="stat-value">{stats.modified}</div>
          <div className="stat-label">Modified</div>
        </div>
        <div className="stat-card stat-unchanged">
          <div className="stat-value">{stats.unchanged}</div>
          <div className="stat-label">Unchanged</div>
        </div>
      </div>
      {insights && (
        <div className="insights">
          <div className="insight-item">
            <span className="insight-label">Total Changes:</span>
            <span className="insight-value">{insights.totalChanges}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Change %:</span>
            <span className="insight-value">{insights.changePercentage.toFixed(1)}%</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Similarity:</span>
            <span className="insight-value">{insights.similarity.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
