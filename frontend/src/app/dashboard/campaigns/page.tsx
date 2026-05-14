'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignsApi, CampaignListResponse } from '@/services/campaigns.api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Campaign Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const data = await campaignsApi.listCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    try {
      await campaignsApi.createCampaign({ name: newCampaignName });
      setNewCampaignName('');
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to create campaign', error);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
      <header className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Campaigns</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage bulk outbound dialing campaigns and track performance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Campaign
        </button>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
            <span className="material-symbols-outlined text-4xl">campaign</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 font-headline">No Campaigns Yet</h2>
          <p className="text-slate-500 max-w-sm mb-6">Create your first campaign to upload leads and automate bulk outbound dialing.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary/10 text-primary hover:bg-primary/20 font-bold py-2.5 px-6 rounded-xl transition-all"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => (
            <Link 
              href={`/dashboard/campaigns/${campaign.id}`} 
              key={campaign.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 font-headline group-hover:text-primary transition-colors line-clamp-1">{campaign.name}</h3>
                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${
                  campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  campaign.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {campaign.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Leads</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{campaign.total_leads}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Success</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{campaign.successful_calls}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Failed</p>
                  <p className="font-semibold text-red-500">{campaign.failed_calls}</p>
                </div>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                {campaign.total_leads > 0 && (
                  <div 
                    className="bg-primary h-full rounded-full transition-all" 
                    style={{ width: `${Math.round(((campaign.successful_calls + campaign.failed_calls) / campaign.total_leads) * 100)}%` }}
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium text-right">
                {campaign.total_leads > 0 
                  ? `${Math.round(((campaign.successful_calls + campaign.failed_calls) / campaign.total_leads) * 100)}% Processed`
                  : '0% Processed'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold font-headline text-slate-800 dark:text-white mb-1">Create Campaign</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Name your campaign to get started.</p>
              
              <form onSubmit={handleCreateCampaign}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Name</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Q3 Summer Outreach"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-headline"
                  />
                </div>
                
                <div className="flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newCampaignName.trim()}
                    className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
