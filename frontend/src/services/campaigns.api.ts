import { fetchApi } from './apiClient';

export interface CampaignListResponse {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  total_leads: number;
  successful_calls: number;
  failed_calls: number;
  created_at: string;
}

export interface CampaignCreateRequest {
  name: string;
  agent_id?: string;
  schedule_time?: string;
}

export const campaignsApi = {
  listCampaigns: async (): Promise<CampaignListResponse[]> => {
    const res = await fetchApi<{ campaigns: CampaignListResponse[] } | CampaignListResponse[]>('/v1/campaigns');
    // Handle both array response and { campaigns: [] } response shapes
    if (Array.isArray(res)) return res;
    return (res as any).campaigns ?? [];
  },

  createCampaign: async (data: CampaignCreateRequest): Promise<CampaignListResponse> => {
    const res = await fetchApi<CampaignListResponse>('/v1/campaigns', {
      method: 'POST',
      data,  // use `data` not `body` so fetchApi serializes correctly
    });
    return res;
  },

  getCampaignDetails: async (id: string): Promise<CampaignListResponse> => {
    const res = await fetchApi<CampaignListResponse>(`/v1/campaigns/${id}`);
    return res;
  },

  uploadLeads: async (id: string, leads: { phone_number: string, metadata?: any }[]): Promise<{ success: boolean; leads_added: number }> => {
    const res = await fetchApi<{ success: boolean; leads_added: number }>(`/v1/campaigns/${id}/leads`, {
      method: 'POST',
      data: { leads },  // use `data` not `body`
    });
    return res;
  }
};
