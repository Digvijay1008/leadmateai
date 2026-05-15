'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { campaignsApi, CampaignListResponse } from '@/services/campaigns.api';

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchCampaign(params.id as string);
    }
  }, [params.id]);

  const fetchCampaign = async (id: string) => {
    try {
      const data = await campaignsApi.getCampaignDetails(id);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to fetch campaign', error);
      router.push('/dashboard/campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaign) return;

    setUploading(true);
    
    // Simple CSV parser
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setUploading(false);
        return;
      }

      // Very simple parsing: split by new line
      const lines = text.split('\n');
      const leads: { phone_number: string }[] = [];
      
      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes('phone')) return; // Skip simple header
        
        // Split by comma
        const parts = line.split(',');
        const phone = parts[0]?.trim(); // Assuming phone is the first column for simplicity
        
        if (phone && phone.length > 5) {
          leads.push({ phone_number: phone });
        }
      });

      if (leads.length === 0) {
        alert('No valid phone numbers found in CSV. Ensure phone number is the first column.');
        setUploading(false);
        return;
      }

      try {
        await campaignsApi.uploadLeads(campaign.id, leads);
        alert(`Successfully queued ${leads.length} contacts for dialing.`);
        fetchCampaign(campaign.id);
      } catch (error) {
        console.error('Failed to upload leads', error);
        alert('Failed to upload leads.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = () => {
      alert('Error reading file');
      setUploading(false);
    };

    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <header className="shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-50 to-transparent dark:from-indigo-900/10 pointer-events-none rounded-bl-full" />
        
        <div className="relative z-10 flex gap-4 items-center">
          <button 
            onClick={() => router.push('/dashboard/campaigns')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black font-headline text-slate-900 dark:text-white tracking-tight">{campaign.name}</h1>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md ${
                  campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  campaign.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {campaign.status}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400 font-mono">ID: {campaign.id}</p>
          </div>
        </div>

        <div className="relative z-10">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-sm">upload</span>
            )}
            {uploading ? 'Processing CSV...' : 'Upload CSV Contacts'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary mb-4">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Contacts</p>
          <p className="text-3xl font-black font-headline text-slate-800 dark:text-white">{campaign.total_leads}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 mb-4">
            <span className="material-symbols-outlined">call_made</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Successful Calls</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-headline text-slate-800 dark:text-white">{campaign.successful_calls}</p>
            {campaign.total_leads > 0 && (
              <span className="text-sm font-bold text-emerald-500">
                ({Math.round((campaign.successful_calls / campaign.total_leads) * 100)}%)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-4">
            <span className="material-symbols-outlined">call_missed_outgoing</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Failed Calls</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-headline text-slate-800 dark:text-white">{campaign.failed_calls}</p>
            {campaign.total_leads > 0 && (
              <span className="text-sm font-bold text-red-500">
                ({Math.round((campaign.failed_calls / campaign.total_leads) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary/50 mx-auto mb-4">
            <span className="material-symbols-outlined tracking-widest text-3xl">route</span>
          </div>
          <h3 className="text-lg font-bold font-headline text-slate-800 dark:text-gray-100 mb-2">Campaign Queue Running</h3>
          <p className="text-sm font-medium text-slate-500">
            Once you upload your CSV of contacts, the backend distributed background job scheduler will pick them up immediately in batches of 5 and dial via your SIP trunk. You can refresh this page to watch the metrics increment dynamically.
          </p>
        </div>
      </div>
    </div>
  );
}
