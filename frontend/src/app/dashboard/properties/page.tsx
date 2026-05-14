'use client';

import React, { useState, useEffect } from 'react';
import { usePropertiesQuery, useDeleteProperty } from '@/features/properties/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import type { PropertyFilters, Property } from '@/features/properties/types';
import { PropertyFormModal } from '@/features/properties/components/PropertyFormModal';
import { DeleteConfirmationModal } from '@/features/properties/components/DeleteConfirmationModal';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL query params
  const [filters, setFilters] = useState<PropertyFilters>({
    property_type: searchParams.get('property_type') as any || undefined,
    status: searchParams.get('status') as any || undefined,
    search: searchParams.get('search') || undefined,
  });
  
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | undefined>(undefined);

  const { data, isLoading, error, refetch } = usePropertiesQuery(filters, page);
  const deleteMutation = useDeleteProperty();

  const properties = data?.properties || [];
  const total = data?.total || 0;

  // Sync state back to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.property_type) params.set('property_type', filters.property_type);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (page > 1) params.set('page', String(page));

    router.replace(`/dashboard/properties?${params.toString()}`, { scroll: false });
  }, [filters, page, router]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      sold: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
      under_offer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  const formatPrice = (price: number, unit?: string) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lakh`;
    return `₹${price.toLocaleString()}`;
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setPropertyToDelete(undefined);
        }
      });
    }
  };

  if (isLoading) return <LoadingState message="Loading properties..." />;
  if (error) return <ErrorState message={error.message || 'Failed to fetch properties'} onRetry={() => refetch()} />;

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">Properties CRM</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage listings, projects, and property specs for AI context.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => router.push('/dashboard/bulk-upload')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span> Bulk Upload
          </button>
          <button 
            onClick={() => { setEditingProperty(undefined); setIsFormModalOpen(true); }}
            className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> Add Property
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
         <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Search properties, projects, locations..." 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white"
              value={filters.search || ''}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
         </div>
         <select 
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 font-medium"
            value={filters.property_type || ''}
            onChange={(e) => { setFilters(f => ({ ...f, property_type: e.target.value as any || undefined })); setPage(1); }}
         >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
         </select>
         <select 
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 font-medium"
            value={filters.status || ''}
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value as any || undefined })); setPage(1); }}
         >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="under_offer">Under Offer</option>
         </select>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col">
          <EmptyState
            icon="domain_disabled"
            title="No Properties Found"
            description="Your AI agent needs property data to answer prospect inquiries accurately. Try adjusting your filters or upload a CSV."
            actionLabel="Add Property"
            onAction={() => { setEditingProperty(undefined); setIsFormModalOpen(true); }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="h-40 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center group">
                <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingProperty(property); setIsFormModalOpen(true); }} className="w-8 h-8 rounded-full bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-50">
                     <span className="material-symbols-outlined text-[18px]">edit</span>
                   </button>
                   <button onClick={() => { setPropertyToDelete(property); setIsDeleteModalOpen(true); }} className="w-8 h-8 rounded-full bg-white text-red-600 shadow-sm flex items-center justify-center hover:bg-red-50">
                     <span className="material-symbols-outlined text-[18px]">delete</span>
                   </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">{property.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span className="line-clamp-1">{property.location?.address}{property.location?.address && property.location?.city ? ', ' : ''}{property.location?.city}</span>
                </p>
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${getStatusBadge(property.status)}`}>
                    {property.status.replace('_', ' ')}
                  </span>
                  <p className="text-lg font-black text-primary">{formatPrice(property.price, property.price_unit)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {properties.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm font-bold text-slate-500">Showing {properties.length} properties</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <PropertyFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        propertyToEdit={editingProperty} 
      />

      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen}
        propertyName={propertyToDelete?.title || ''}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}