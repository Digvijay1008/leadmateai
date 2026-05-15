'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { contactsApi } from '@/services/contacts.api';

interface ParsedContact {
  name: string;
  phone: string;
  email: string;
  source: string;
}

interface ParseResult {
  valid: ParsedContact[];
  invalid: { row: number; reason: string }[];
}

function parseContactsCsv(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    return { valid: [], invalid: [{ row: 0, reason: 'CSV is empty or missing headers' }] };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const valid: ParsedContact[] = [];
  const invalid: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const phone = row['phone'] || row['phone_number'] || row['mobile'] || '';
    const name = row['name'] || row['full_name'] || '';

    if (!phone || phone.length < 7) {
      invalid.push({ row: i + 1, reason: 'Missing or invalid phone number' });
      continue;
    }

    valid.push({
      name: name || 'Unknown',
      phone,
      email: row['email'] || '',
      source: row['source'] || 'csv_import',
    });
  }

  return { valid, invalid };
}

export default function BulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleFile = useCallback((selected: File) => {
    if (!selected.name.endsWith('.csv')) {
      alert('Please upload a .csv file.');
      return;
    }
    setFile(selected);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) setParseResult(parseContactsCsv(text));
    };
    reader.readAsText(selected);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleUpload = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsUploading(true);
    let count = 0;

    for (const contact of parseResult.valid) {
      try {
        await contactsApi.create({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          source: contact.source,
        });
        count++;
      } catch {
        // individual row failure — continue with the rest
      }
    }

    setUploadedCount(count);
    setIsUploading(false);
    setIsDone(true);
  };

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setIsDone(false);
    setUploadedCount(0);
  };

  const validCount = parseResult?.valid.length ?? 0;
  const invalidCount = parseResult?.invalid.length ?? 0;

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 w-fit transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </button>

      <header className="mb-8">
        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">
          Bulk Import Contacts
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Upload a CSV file to import multiple contacts at once.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-6">
        {isDone ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
              Import Complete
            </h2>
            <p className="text-slate-500 mb-8">
              {uploadedCount} contact{uploadedCount !== 1 ? 's' : ''} imported successfully.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push('/dashboard/contacts')}
                className="bg-primary hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                View Contacts
              </button>
              <button
                onClick={resetState}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Import More
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="material-symbols-outlined shrink-0">info</span>
              <div>
                <p className="font-bold text-sm">Required CSV columns</p>
                <p className="text-sm mt-1">
                  <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">phone</code> (required),{' '}
                  <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">name</code>,{' '}
                  <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">email</code>,{' '}
                  <code className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1 rounded">source</code> (optional)
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                file
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span
                className={`material-symbols-outlined text-5xl mb-4 block ${
                  file ? 'text-primary' : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {file ? 'description' : 'upload_file'}
              </span>

              {file && parseResult ? (
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">{file.name}</p>
                  <p className="text-sm text-slate-500 mb-4">
                    {(file.size / 1024).toFixed(1)} KB · {parseResult.valid.length + parseResult.invalid.length} rows
                  </p>
                  <div className="flex justify-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-sm font-bold">
                      {validCount} valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm font-bold">
                        {invalidCount} skipped
                      </span>
                    )}
                  </div>
                  <button
                    onClick={resetState}
                    className="text-sm font-bold text-red-600 hover:text-red-700 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                    Drag & drop your CSV here
                  </p>
                  <p className="text-sm text-slate-500 mb-6">or</p>
                  <label className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm inline-block">
                    Browse Files
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Validation errors */}
            {invalidCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl max-h-48 overflow-y-auto p-4">
                <h4 className="font-bold text-red-800 dark:text-red-400 mb-2 text-sm">
                  Rows that will be skipped:
                </h4>
                <ul className="list-disc pl-5 text-red-700 dark:text-red-400 space-y-1 text-sm">
                  {parseResult?.invalid.map((r, i) => (
                    <li key={i}>Row {r.row}: {r.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleUpload}
                disabled={!file || validCount === 0 || isUploading}
                className="bg-primary hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                )}
                {isUploading ? 'Importing...' : `Import ${validCount} Contact${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
