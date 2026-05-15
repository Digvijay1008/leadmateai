'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useContactsQuery } from '@/features/contacts/hooks';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ContactStatus, ContactFilters } from '@/features/contacts/types';

const STATUS_STYLES: Record<ContactStatus, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  qualified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  proposal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  negotiation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function ContactsPage() {
  const [filters, setFilters] = useState<ContactFilters>({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useContactsQuery(filters, page);

  const contacts = data?.leads ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  if (isLoading) {
    return <LoadingState message="Loading contacts..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message || 'Failed to load contacts'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white tracking-tight">
            Contacts
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage your contact pipeline and track engagement.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filter
          </button>
          <button className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Contact
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2"
            />
          </div>
        </div>

        {contacts.length === 0 ? (
          <EmptyState
            icon="group_off"
            title="No Contacts Found"
            description="Add a contact manually or connect an integration to populate this table."
            actionLabel="Add Contact"
          />
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contacts.map(contact => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{contact.name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{contact.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{contact.phone}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[contact.status] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {contact.source || 'Direct'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {contact.phone ? (
                        <Link
                          href={`/dashboard/dialer?phone=${encodeURIComponent(contact.phone)}&contact_id=${contact.id}&name=${encodeURIComponent(contact.name ?? '')}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          Dial Now
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">No phone</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Showing {contacts.length} of {total} contacts
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
