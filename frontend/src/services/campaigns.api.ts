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
    const res = await fetchApi('/v1/campaigns');
    return res as CampaignListResponse[];
  },

  createCampaign: async (data: CampaignCreateRequest): Promise<CampaignListResponse> => {
    const res = await fetchApi('/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res as CampaignListResponse;
  },

  getCampaignDetails: async (id: string): Promise<CampaignListResponse> => {
    const res = await fetchApi(`/v1/campaigns/${id}`);
    return res as CampaignListResponse;
  },

  uploadLeads: async (id: string, leads: { phone_number: string, metadata?: any }[]): Promise<{ success: boolean; leads_added: number }> => {
    const res = await fetchApi(`/v1/campaigns/${id}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leads }),
    });
    return res as { success: boolean; leads_added: number };
  }
};
