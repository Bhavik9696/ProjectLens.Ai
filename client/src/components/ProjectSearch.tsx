import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FolderKanban } from 'lucide-react';
import { ProjectIntelligenceData } from '../types';

interface ProjectSearchProps {
  projects: ProjectIntelligenceData[];
  currentProject: ProjectIntelligenceData | null;
  onSelectProject: (id: string) => void;
}

export const ProjectSearch: React.FC<ProjectSearchProps> = ({ projects, currentProject, onSelectProject }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.project.name.toLowerCase().includes(q) ||
        p.project.description?.toLowerCase().includes(q) ||
        p.project.techStack?.some((t) => t.toLowerCase().includes(q))
    );
  }, [projects, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onSelectProject(id);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[highlightedIndex];
      if (target) handleSelect(target.project.id);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[var(--text-5)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={currentProject?.project.name || 'Search projects…'}
          disabled={projects.length === 0}
          aria-label="Search projects"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="project-search-listbox"
          className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] text-xs font-mono font-medium rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none disabled:opacity-50 placeholder:text-[var(--text-5)] transition-colors"
        />
      </div>

      {isOpen && projects.length > 0 && (
        <div
          id="project-search-listbox"
          role="listbox"
          className="absolute z-40 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/50"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[var(--text-5)] font-mono">No projects match "{query}"</p>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.project.id}
                role="option"
                aria-selected={p.project.id === currentProject?.project.id}
                onClick={() => handleSelect(p.project.id)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full flex items-start gap-2.5 text-left px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                  i === highlightedIndex ? 'bg-[var(--accent)]/8' : ''
                } ${p.project.id === currentProject?.project.id ? 'border-l-2 border-[var(--accent)]' : 'border-l-2 border-transparent'}`}
              >
                <FolderKanban className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--text-1)] truncate">{p.project.name}</span>
                  <span className="block text-[10px] text-[var(--text-5)] truncate">
                    {p.requirements.length} requirements · {p.healthMetrics.overallScore}% health
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
