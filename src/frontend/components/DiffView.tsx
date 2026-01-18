import React, { useState, useMemo } from 'react';
import type { DiffChange } from '../../core.js';

interface DiffViewProps {
  changes: DiffChange[];
  loading?: boolean;
}

const DiffView: React.FC<DiffViewProps> = ({ changes, loading }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'added' | 'removed' | 'modified'>('all');

  const filteredChanges = useMemo(() => {
    if (filter === 'all') return changes;
    return changes.filter(c => c.type === filter);
  }, [changes, filter]);

  const changeIndices = useMemo(() => {
    return changes
      .map((c, i) => (c.type !== 'unchanged' ? i : -1))
      .filter(i => i !== -1);
  }, [changes]);

  const navigateChange = (direction: 'next' | 'prev') => {
    if (changeIndices.length === 0) return;
    
    const currentIdx = selectedIndex !== null 
      ? changeIndices.indexOf(selectedIndex)
      : -1;
    
    let newIdx: number;
    if (direction === 'next') {
      newIdx = currentIdx < changeIndices.length - 1 
        ? currentIdx + 1 
        : 0;
    } else {
      newIdx = currentIdx > 0 
        ? currentIdx - 1 
        : changeIndices.length - 1;
    }
    
    setSelectedIndex(changeIndices[newIdx]);
    const element = document.querySelector(`[data-change-index="${changeIndices[newIdx]}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateChange('next');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateChange('prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [changeIndices]);

  if (loading) {
    return (
      <div className="diff-view loading">
        <div className="loading-spinner">Computing diff...</div>
      </div>
    );
  }

  return (
    <div className="diff-view">
      <div className="diff-controls">
        <div className="diff-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({changes.length})
          </button>
          <button
            className={`filter-btn ${filter === 'added' ? 'active' : ''}`}
            onClick={() => setFilter('added')}
          >
            Added ({changes.filter(c => c.type === 'added').length})
          </button>
          <button
            className={`filter-btn ${filter === 'removed' ? 'active' : ''}`}
            onClick={() => setFilter('removed')}
          >
            Removed ({changes.filter(c => c.type === 'removed').length})
          </button>
          <button
            className={`filter-btn ${filter === 'modified' ? 'active' : ''}`}
            onClick={() => setFilter('modified')}
          >
            Modified ({changes.filter(c => c.type === 'modified').length})
          </button>
        </div>
        {changeIndices.length > 0 && (
          <div className="diff-navigation">
            <button onClick={() => navigateChange('prev')}>↑ Prev</button>
            <span className="change-counter">
              {selectedIndex !== null ? changeIndices.indexOf(selectedIndex) + 1 : 0} / {changeIndices.length}
            </span>
            <button onClick={() => navigateChange('next')}>Next ↓</button>
          </div>
        )}
      </div>

      <div className="diff-output">
        <div className="diff-header">
          <div className="diff-header-cell">Line</div>
          <div className="diff-header-cell">Original</div>
          <div className="diff-header-cell">Line</div>
          <div className="diff-header-cell">Modified</div>
        </div>
        <div className="diff-content">
          {filteredChanges.map((change, index) => {
            const actualIndex = changes.indexOf(change);
            const isSelected = selectedIndex === actualIndex;
            const isChange = change.type !== 'unchanged';
            
            return (
              <div
                key={actualIndex}
                data-change-index={actualIndex}
                className={`diff-line diff-${change.type} ${isSelected ? 'selected' : ''} ${isChange ? 'interactive' : ''}`}
                onClick={() => isChange && setSelectedIndex(actualIndex)}
              >
                <div className={`diff-line-number ${change.originalLine === undefined ? 'empty' : ''}`}>
                  {change.originalLine || ''}
                </div>
                <div className="diff-content-cell">
                  {change.original && (
                    <span className={`diff-text ${change.type === 'removed' || change.type === 'modified' ? 'highlight' : ''}`}>
                      {change.original}
                    </span>
                  )}
                  {change.explanation && (
                    <div className="change-explanation">{change.explanation}</div>
                  )}
                  {change.similarity !== undefined && (
                    <div className="similarity-badge">
                      {Math.round(change.similarity * 100)}% similar
                    </div>
                  )}
                </div>
                <div className={`diff-line-number ${change.modifiedLine === undefined ? 'empty' : ''}`}>
                  {change.modifiedLine || ''}
                </div>
                <div className="diff-content-cell">
                  {change.modified && (
                    <span className={`diff-text ${change.type === 'added' || change.type === 'modified' ? 'highlight' : ''}`}>
                      {change.modified}
                    </span>
                  )}
                  {change.keyWords && (
                    <div className="key-words">
                      {change.keyWords.added.length > 0 && (
                        <span className="key-words-added">
                          +{change.keyWords.added.slice(0, 3).join(', ')}
                        </span>
                      )}
                      {change.keyWords.removed.length > 0 && (
                        <span className="key-words-removed">
                          -{change.keyWords.removed.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DiffView;
