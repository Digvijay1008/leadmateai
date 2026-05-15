export type ContactStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  status: ContactStatus;
  source: string;
  assigned_agent: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  status?: ContactStatus;
  source?: string;
  assigned_agent?: string;
  search?: string;
}

export interface ContactCreateInput {
  name: string;
  email: string;
  phone: string;
  status?: ContactStatus;
  source?: string;
  notes?: string;
}

export interface ContactUpdateInput extends Partial<ContactCreateInput> {
  assigned_agent?: string;
  status?: ContactStatus;
}
