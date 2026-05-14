'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/status-badge';
import { useRouter } from 'next/navigation';
import { useCreateProperty } from '@/features/properties/hooks';

interface ParsedRow {
  index: number;
  data: any;
  isValid: boolean;
  errors: string[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const createMutation = useCreateProperty();
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       const droppedFile = e.dataTransfer.files[0];
       validateAndSetFile(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    if (uploadedFile.name.endsWith('.csv')) {
      setFile(uploadedFile);
      parseCSV(uploadedFile);
    } else {
      alert('Please upload a valid CSV file.');
    }
  };

  const parseCSV = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        alert('CSV seems empty or missing headers.');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows: ParsedRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: Record<string, string> = {};
        
        headers.forEach((h, idx) => {
          rowData[h] = values[idx] || '';
        });

        // Basic validation logic
        const errors: string[] = [];
        if (!rowData.title) errors.push('Missing Title');
        if (!rowData.price || isNaN(Number(rowData.price))) errors.push('Invalid Price');
        if (!rowData.city) errors.push('Missing City');

        rows.push({
          index: i + 1,
          data: rowData,
          isValid: errors.length === 0,
          errors
        });
      }

      setParsedRows(rows);
    };
    reader.readAsText(csvFile);
  };

  const handleUploadClick = async () => {
    setIsProcessing(true);
    const validRows = parsedRows.filter(r => r.isValid);
    
    // Simulate sequential or parallel upload to backend
    for (const row of validRows) {
      try {
        await createMutation.mutateAsync({
          title: row.data.title,
          property_type: (row.data.property_type as any) || 'apartment',
          price: Number(row.data.price),
          price_unit: (row.data.price_unit as any) || 'Lakh',
          area: Number(row.data.area || 0),
          location: { city: row.data.city, address: row.data.address || '' }
        });
      } catch (err) {
        console.error('Row failed', err);
      }
    }
    
    setIsProcessing(false);
    setIsSuccess(true);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 w-fit transition-colors"
      >
         <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Properties
      </button>

      <PageHeader 
        title="Bulk Upload Properties" 
        subtitle="Import multiple properties from a CSV file into the CRM." 
      />

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-8">
        
        {isSuccess ? (
           <div className="text-center py-12">
             <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
             </div>
             <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Upload Successful!</h2>
             <p className="text-slate-500 mb-8 max-w-md mx-auto">{validCount} properties were successfully imported into your CRM. They are now available for your AI agents to reference.</p>
             <button 
               onClick={() => router.push('/dashboard/properties')}
               className="bg-primary hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
             >
               View Properties
             </button>
           </div>
        ) : (
          <>
            <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="material-symbols-outlined">info</span>
              <div>
                <p className="font-bold text-sm">Download Template</p>
                <p className="text-sm mt-1 mb-2">Ensure your CSV matches our required format for smooth imports. Required columns: title, property_type, price, price_unit, area, city.</p>
                <button className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Download CSV Template</button>
              </div>
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                 file 
                   ? 'border-primary bg-primary/5' 
                   : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className={`material-symbols-outlined text-5xl mb-4 ${file ? 'text-primary' : 'text-slate-300 dark:text-slate-600'}`}>
                {file ? 'description' : 'upload_file'}
              </span>
              {file ? (
                <div>
                   <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">{file.name}</p>
                   <p className="text-sm text-slate-500 mb-6">{(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows detected</p>
                   
                   <div className="flex justify-center gap-4 mb-6">
                     <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-sm font-bold">
                       {validCount} Valid
                     </span>
                     {invalidCount > 0 && (
                       <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm font-bold">
                         {invalidCount} Invalid
                       </span>
                     )}
                   </div>

                   <button 
                      onClick={() => { setFile(null); setParsedRows([]); }}
                      className="text-sm font-bold text-red-600 hover:text-red-700 px-4 py-2 bg-red-50 rounded-lg transition-colors"
                   >
                     Remove File
                   </button>
                </div>
              ) : (
                <div>
                   <p className="font-bold text-lg text-slate-900 dark:text-white mb-2">Drag & Drop your CSV here</p>
                   <p className="text-sm text-slate-500 mb-6">or</p>
                   <label className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm inline-block">
                      Browse Files
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={handleChange}
                      />
                   </label>
                </div>
              )}
            </div>

            {invalidCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl max-h-48 overflow-y-auto p-4 text-sm">
                 <h4 className="font-bold text-red-800 mb-2 whitespace-pre-wrap">The following rows have errors and will be skipped:</h4>
                 <ul className="list-disc pl-5 text-red-700 space-y-1">
                   {parsedRows.filter(r => !r.isValid).map((r, i) => (
                     <li key={i}>Row {r.index}: {r.errors.join(', ')}</li>
                   ))}
                 </ul>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
               <button 
                 onClick={handleUploadClick}
                 disabled={!file || validCount === 0 || isProcessing}
                 className="bg-primary hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {isProcessing && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                 {isProcessing ? 'Uploading...' : `Upload ${validCount} Valid Properties`}
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
