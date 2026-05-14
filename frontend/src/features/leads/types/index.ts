export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'proposal' 
  | 'negotiation' 
  | 'won' 
  | 'lost';

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  assigned_agent: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  property_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  assigned_agent?: string;
  search?: string;
}

export interface LeadCreateInput {
  name: string;
  email: string;
  phone: string;
  status?: LeadStatus;
  source?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
  notes?: string;
}

export interface LeadUpdateInput extends Partial<LeadCreateInput> {
  assigned_agent?: string;
  status?: LeadStatus;
}
