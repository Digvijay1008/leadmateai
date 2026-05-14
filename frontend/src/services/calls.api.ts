import { fetchApi } from './apiClient';

export interface OutboundCallRequest {
    to: string;
    agent_id?: string;
}

export interface OutboundCallResponse {
    success: boolean;
    call_uuid: string;
    session_id: string;
    livekit_room_name: string;
    livekit_token: string;
    livekit_url: string;
    max_duration_seconds: number;
    status: string;
}

export const callsApi = {
    startOutboundCall: async (data: OutboundCallRequest): Promise<OutboundCallResponse> => {
        return fetchApi<OutboundCallResponse>('/v1/calls/outbound', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};
