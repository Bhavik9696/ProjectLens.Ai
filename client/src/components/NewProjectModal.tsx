import React, { useState } from 'react';
import { X, FolderPlus, GitBranch, Calendar, Code, Sparkles } from 'lucide-react';
import { Project } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('2026-10-30');
  const [techStackInput, setTechStackInput] = useState('React, Node.js, Express, MongoDB');
  const [githubUrl, setGithubUrl] = useState('https://github.com/company/new-app');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const techStack = techStackInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      deadline,
      techStack,
      githubUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateProject(newProject);
    onClose();
  };

  const inputClass =
    'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 placeholder:text-[var(--text-6)] font-sans transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/85 backdrop-blur-md p-4">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[var(--text-1)] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 shadow-[0_0_12px_rgba(214,255,63,0.1)]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-1)]">Create New Software Project</h3>
              <p className="text-xs font-mono text-[var(--text-4)]">Step 1: Define project parameters and repository link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] p-1 rounded-lg hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-[var(--accent)] uppercase tracking-widest mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Healthcare Patient Portal"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-[var(--text-4)] uppercase tracking-widest mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of software goals and target audience"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Deadline & Tech Stack Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[var(--text-4)] uppercase tracking-widest mb-1.5">
                Target Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[var(--text-4)] uppercase tracking-widest mb-1.5">
                Tech Stack
              </label>
              <input
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                placeholder="React, Node.js, MongoDB"
                className={inputClass}
              />
            </div>
          </div>

          {/* GitHub Repository URL */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-[var(--text-4)] uppercase tracking-widest mb-1.5">
              GitHub Repository URL
            </label>
            <div className="relative">
              <GitBranch className="w-4 h-4 text-[var(--accent)] absolute left-3.5 top-3" />
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/organization/repository"
                className={`${inputClass} pl-10 font-mono`}
              />
            </div>
          </div>

          {/* Info hint */}
          <div className="p-3 rounded-lg bg-[var(--accent)]/8 border border-[var(--accent)]/25 flex items-start gap-2 text-xs text-[var(--accent)]">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              After creation, you can upload SRS documents and connect GitHub to perform deterministic code analysis.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-4)] hover:text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--accent)] hover:brightness-110 text-black shadow-[0_0_15px_-4px_var(--accent)] transition-all cursor-pointer"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
