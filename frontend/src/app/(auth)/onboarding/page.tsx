'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  const [formData, setFormData] = useState({
    workspaceName: '',
    agentName: '',
    voiceType: 'professional_female',
  });

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));
  const handleComplete = () => router.push('/dashboard');

  const progress = (step / totalSteps) * 100;

  return (
    <div className="bg-background text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-slate-50 dark:bg-slate-950">
        <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>
      
      <header className="p-8 flex justify-between items-center w-full z-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-sm">real_estate_agent</span>
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">LeadMate</span>
        </div>
        <button onClick={handleComplete} className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Skip for now</button>
      </header>

      <main className="flex-grow flex items-center justify-center p-6 pb-24 z-10 w-full">
        <div className="w-full max-w-2xl">
          {/* Progress Header */}
          <div className="mb-10">
            <p className="text-primary font-bold tracking-widest text-xs uppercase mb-2">Step {step} of {totalSteps}</p>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-10 shadow-2xl border border-white/50 dark:border-slate-800/50 min-h-[400px] flex flex-col">
            
            {/* Step 1: Workspace */}
            {step === 1 && (
              <div className="flex-grow animate-in fade-in slide-in-from-right-4 duration-500">
                <h1 className="text-3xl font-black font-headline mb-2 tracking-tight">Set up your workspace</h1>
                <p className="text-slate-500 text-sm mb-8 font-medium">This is where your agents and team will collaborate.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 ml-1">Workspace Name</label>
                    <input type="text" value={formData.workspaceName} onChange={e => setFormData({...formData, workspaceName: e.target.value})} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="Nexus Properties" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Agent Customization */}
            {step === 2 && (
              <div className="flex-grow animate-in fade-in slide-in-from-right-4 duration-500">
                <h1 className="text-3xl font-black font-headline mb-2 tracking-tight">Create your first AI Agent</h1>
                <p className="text-slate-500 text-sm mb-8 font-medium">Give your virtual assistant a name and voice.</p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 ml-1">Agent Name</label>
                    <input type="text" value={formData.agentName} onChange={e => setFormData({...formData, agentName: e.target.value})} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="Sarah" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-500 ml-1">Voice Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'professional_female', label: 'Professional (Female)' },
                        { id: 'professional_male', label: 'Professional (Male)' },
                        { id: 'warm_friendly', label: 'Warm & Friendly' },
                        { id: 'energetic', label: 'Energetic' }
                      ].map(v => (
                        <div key={v.id} onClick={() => setFormData({...formData, voiceType: v.id})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.voiceType === v.id ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:border-primary/50'}`}>
                          {v.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Knowledge Base */}
            {step === 3 && (
              <div className="flex-grow animate-in fade-in slide-in-from-right-4 duration-500">
                <h1 className="text-3xl font-black font-headline mb-2 tracking-tight">Upload Knowledge Base</h1>
                <p className="text-slate-500 text-sm mb-8 font-medium">Train your agent on your agency's standard operating procedures.</p>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-4xl text-primary mb-4">upload_file</span>
                  <p className="font-bold text-slate-900 dark:text-white mb-1">Drag & drop your documents</p>
                  <p className="text-sm text-slate-500 mb-6">Supports PDF, DOCX, TXT up to 20MB</p>
                  <button className="px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Browse Files</button>
                </div>
              </div>
            )}

            {/* Step 4: First Property */}
            {step === 4 && (
              <div className="flex-grow animate-in fade-in slide-in-from-right-4 duration-500">
                <h1 className="text-3xl font-black font-headline mb-2 tracking-tight">Add your first Listing</h1>
                <p className="text-slate-500 text-sm mb-8 font-medium">Let's give your agent a property to sell.</p>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/50">
                  <span className="material-symbols-outlined text-4xl text-emerald-500 mb-4">add_home</span>
                  <p className="font-bold text-slate-900 dark:text-white mb-1">Upload property details</p>
                  <p className="text-sm text-slate-500 mb-6">Upload an MLS sheet or property brochure</p>
                  <button className="px-6 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Browse Listings</button>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              {step > 1 ? (
                <button onClick={handleBack} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Back</button>
              ) : <div></div>}
              
              {step < totalSteps ? (
                <button onClick={handleNext} className="bg-primary hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95">Continue</button>
              ) : (
                <button onClick={handleComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                  Complete Setup <span className="material-symbols-outlined text-sm">rocket_launch</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
