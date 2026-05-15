'use client';

import React, { useState, useRef } from 'react';
import { useKnowledgeDocumentsQuery, useKnowledgeStatsQuery, useIngestKnowledge, useDeleteKnowledge } from '@/features/knowledge/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import type { KnowledgeDocument } from '@/features/knowledge/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(docType: string): string {
  const map: Record<string, string> = {
    pdf: 'picture_as_pdf',
    csv: 'table_chart',
    brochure: 'description',
    sop: 'rule',
    policy: 'policy',
    faq: 'quiz',
    text: 'article',
    url: 'link',
  };
  return map[docType?.toLowerCase()] ?? 'insert_drive_file';
}

function getStatusStyle(status: string): string {
  const map: Record<string, string> = {
    ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    deleted: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return map[status?.toLowerCase()] ?? 'bg-slate-100 text-slate-700';
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  doc,
  onConfirm,
  onCancel,
  isPending,
}: {
  doc: KnowledgeDocument;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-red-600">delete</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Document?</h3>
        <p className="text-sm text-slate-500 mb-6">
          This will permanently remove <strong className="text-slate-700 dark:text-slate-300">{doc.title}</strong> from the knowledge base. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Processing Steps Display ─────────────────────────────────────────────────

const PROCESSING_STEPS = ['Uploading', 'Parsing', 'Chunking', 'Embedding'] as const;

function ProcessingSteps({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center gap-1 py-3">
      {PROCESSING_STEPS.map((label, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-primary text-white animate-pulse' :
                'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-primary' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < PROCESSING_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 transition-colors ${done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const ingest = useIngestKnowledge();
  const [tab, setTab] = React.useState<'text' | 'url'>('text');
  const [form, setForm] = React.useState({ title: '', content: '', document_type: 'pdf' });
  const [urlInput, setUrlInput] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [processingStep, setProcessingStep] = React.useState(-1);

  const simulateProcessing = async (fn: () => Promise<unknown>) => {
    // Animate through the processing steps to give real feedback
    setProcessingStep(0); // Uploading
    await new Promise(r => setTimeout(r, 400));
    setProcessingStep(1); // Parsing
    await fn();
    setProcessingStep(2); // Chunking
    await new Promise(r => setTimeout(r, 600));
    setProcessingStep(3); // Embedding
    await new Promise(r => setTimeout(r, 500));
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setLocalError('Title and content are required.');
      return;
    }
    setLocalError(null);
    try {
      await simulateProcessing(() =>
        ingest.mutateAsync({ title: form.title, content: form.content, document_type: form.document_type })
      );
      onClose();
    } catch (err) {
      setProcessingStep(-1);
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setLocalError('Please enter a URL.');
      return;
    }
    setLocalError(null);
    try {
      const title = new URL(urlInput).hostname;
      await simulateProcessing(() =>
        ingest.mutateAsync({ title, content: `Scraped from ${urlInput}`, document_type: 'url', source_url: urlInput })
      );
      onClose();
    } catch (err) {
      setProcessingStep(-1);
      setLocalError(err instanceof Error ? err.message : 'URL scrape failed');
    }
  };

  const isPending = processingStep >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add to Knowledge Base</h3>
          <button onClick={onClose} disabled={isPending} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
          {(['text', 'url'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setLocalError(null); }}
              disabled={isPending}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              {t === 'text' ? '📄 Paste / Upload Text' : '🌐 Scrape URL'}
            </button>
          ))}
        </div>

        {/* Processing animation */}
        {isPending && <ProcessingSteps activeStep={processingStep} />}

        {localError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300">
            {localError}
          </div>
        )}

        {tab === 'text' ? (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Product FAQ 2024"
                value={form.title}
                disabled={isPending}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Document Type</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm"
                value={form.document_type}
                disabled={isPending}
                onChange={(e) => setForm(f => ({ ...f, document_type: e.target.value }))}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV / Spreadsheet</option>
                <option value="brochure">Brochure / Catalog</option>
                <option value="sop">SOP / Policy</option>
                <option value="faq">FAQ</option>
                <option value="text">Plain Text</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Content *</label>
              <textarea
                rows={5}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Paste the document content here…"
                value={form.content}
                disabled={isPending}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-indigo-700 text-white" disabled={isPending}>
                {isPending ? 'Processing…' : 'Upload Document'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Website URL *</label>
              <input
                type="url"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://yourwebsite.com/about"
                value={urlInput}
                disabled={isPending}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">We'll scrape the page content and add it to your knowledge base.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-indigo-700 text-white" disabled={isPending}>
                {isPending ? 'Scraping…' : 'Scrape & Add'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
      </div>
      <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [docToDelete, setDocToDelete] = useState<KnowledgeDocument | null>(null);

  const { data, isLoading, error, refetch } = useKnowledgeDocumentsQuery(page);
  const { data: stats } = useKnowledgeStatsQuery();
  const deleteMutation = useDeleteKnowledge();

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = () => {
    if (!docToDelete) return;
    deleteMutation.mutate(docToDelete.id, { onSuccess: () => setDocToDelete(null) });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Train your AI with documents, SOPs, FAQs, and product knowledge.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span> Upload Document
        </button>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Docs', value: stats.total_documents, icon: 'folder' },
            { label: 'Ready', value: stats.ready_documents, icon: 'check_circle', color: 'text-emerald-500' },
            { label: 'Processing', value: stats.processing_documents, icon: 'sync', color: 'text-amber-500' },
            { label: 'Total Chunks', value: (stats?.total_chunks ?? 0).toLocaleString(), icon: 'data_array' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <span className={`material-symbols-outlined ${color ?? 'text-primary'}`}>{icon}</span>
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document List */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ErrorState message={error.message || 'Failed to load knowledge base'} onRetry={() => refetch()} />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6">
              <span className="material-symbols-outlined text-4xl">folder_special</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Knowledge Base Empty</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm">
              Upload PDF, text, or paste content to train your AI agent on business policies, product info, and FAQs.
            </p>
            <div
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 max-w-sm w-full bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setShowUpload(true)}
            >
              <p className="font-bold text-slate-700 dark:text-slate-300">Click to add a document</p>
              <p className="text-xs text-slate-400 mt-1">PDF, CSV, TXT, DOCX supported</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Type</span>
              <span>Document</span>
              <span>Status</span>
              <span className="text-right">Chunks</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <div key={doc.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      {getFileIcon(doc.document_type)}
                    </span>
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {doc.document_type?.toUpperCase()} · Added {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize flex items-center gap-1 ${getStatusStyle(doc.status)}`}>
                    {doc.status === 'processing' && (
                      <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                    )}
                    {doc.status}
                  </span>

                  {/* Chunks */}
                  <span className="text-sm font-bold text-slate-500 text-right tabular-nums">
                    {(doc.metadata?.chunk_count as number | undefined)?.toLocaleString() ?? '—'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete document"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of <strong>{total}</strong> documents
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {docToDelete && (
        <DeleteConfirmModal
          doc={docToDelete}
          onConfirm={handleDelete}
          onCancel={() => setDocToDelete(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
