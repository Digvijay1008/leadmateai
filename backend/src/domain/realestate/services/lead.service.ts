import {
    createLead,
    getLeadById,
    listLeads,
    updateLead,
    deleteLead,
    addLeadActivity,
    listLeadActivities,
    addLeadNote,
    listLeadNotes,
    assignLead,
    getLeadStatusHistory,
    recordStatusChange,
    type LeadFilters,
} from '../repositories/lead.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/index.js';

export interface CreateLeadRequest {
    property_id?: string;
    project_id?: string;
    assigned_agent_id?: string;
    full_name: string;
    phone: string;
    email?: string;
    source?: string;
    priority?: string;
    budget_min?: number;
    budget_max?: number;
    preferred_location?: string;
    property_type?: string;
    follow_up_at?: string;
}

export interface UpdateLeadRequest {
    property_id?: string;
    project_id?: string;
    assigned_agent_id?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    source?: string;
    status?: string;
    priority?: string;
    budget_min?: number;
    budget_max?: number;
    preferred_location?: string;
    property_type?: string;
    follow_up_at?: string;
    notes_summary?: string;
    lead_score?: number;
}

export interface ListLeadsRequest extends LeadFilters {}

export interface AddActivityRequest {
    activity_type: string;
    channel?: string;
    description?: string;
}

export interface AddNoteRequest {
    note: string;
}

export interface AssignLeadRequest {
    assigned_to: string;
}

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'booked', 'lost'];
const VALID_SOURCES = ['website', 'whatsapp', 'broker', 'referral', 'walkin', 'portal', 'campaign', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_ACTIVITY_TYPES = ['call', 'whatsapp', 'email', 'site_visit', 'followup', 'meeting', 'demo', 'other'];

export async function createLeadService(
    tenantId: string,
    request: CreateLeadRequest
) {
    if (!request.full_name) {
        throw new ValidationError('full_name is required');
    }
    if (!request.phone) {
        throw new ValidationError('phone is required');
    }

    return createLead({
        tenantId,
        propertyId: request.property_id,
        projectId: request.project_id,
        assignedAgentId: request.assigned_agent_id,
        fullName: request.full_name,
        phone: request.phone,
        email: request.email,
        source: request.source,
        priority: request.priority,
        budgetMin: request.budget_min,
        budgetMax: request.budget_max,
        preferredLocation: request.preferred_location,
        propertyType: request.property_type,
        followUpAt: request.follow_up_at ? new Date(request.follow_up_at) : undefined,
    });
}

export async function getLeadService(
    leadId: string,
    tenantId: string
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }
    return lead;
}

export async function listLeadsService(
    tenantId: string,
    filters: ListLeadsRequest
) {
    return listLeads(tenantId, filters);
}

export async function updateLeadService(
    leadId: string,
    tenantId: string,
    request: UpdateLeadRequest
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    if (request.status && !VALID_STATUSES.includes(request.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (request.source && !VALID_SOURCES.includes(request.source)) {
        throw new ValidationError(`Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`);
    }
    if (request.priority && !VALID_PRIORITIES.includes(request.priority)) {
        throw new ValidationError(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    const oldStatus = request.status ? lead.status : undefined;
    const updated = await updateLead(leadId, tenantId, {
        propertyId: request.property_id,
        projectId: request.project_id,
        assignedAgentId: request.assigned_agent_id,
        fullName: request.full_name,
        phone: request.phone,
        email: request.email,
        source: request.source,
        status: request.status,
        priority: request.priority,
        budgetMin: request.budget_min,
        budgetMax: request.budget_max,
        preferredLocation: request.preferred_location,
        propertyType: request.property_type,
        followUpAt: request.follow_up_at ? new Date(request.follow_up_at) : undefined,
        notesSummary: request.notes_summary,
        leadScore: request.lead_score,
        lastContactedAt: request.status || request.notes_summary ? new Date() : undefined,
    });

    if (request.status && oldStatus && oldStatus !== request.status) {
        await recordStatusChange({
            tenantId,
            leadId,
            oldStatus,
            newStatus: request.status,
        });
    }

    return updated;
}

export async function deleteLeadService(
    leadId: string,
    tenantId: string
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    const deleted = await deleteLead(leadId, tenantId);
    if (!deleted) {
        throw new Error('Failed to delete lead');
    }

    return { success: true };
}

export async function addActivityService(
    tenantId: string,
    leadId: string,
    request: AddActivityRequest
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    if (!request.activity_type || !VALID_ACTIVITY_TYPES.includes(request.activity_type)) {
        throw new ValidationError(`Invalid activity_type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
    }

    const activity = await addLeadActivity({
        tenantId,
        leadId,
        activityType: request.activity_type,
        channel: request.channel,
        description: request.description,
    });

    await updateLead(leadId, tenantId, {
        lastContactedAt: new Date(),
    });

    return activity;
}

export async function listActivitiesService(
    tenantId: string,
    leadId: string
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    return listLeadActivities(tenantId, leadId);
}

export async function addNoteService(
    tenantId: string,
    leadId: string,
    request: AddNoteRequest
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    if (!request.note || !request.note.trim()) {
        throw new ValidationError('note is required');
    }

    return addLeadNote({
        tenantId,
        leadId,
        note: request.note.trim(),
    });
}

export async function listNotesService(
    tenantId: string,
    leadId: string
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    return listLeadNotes(tenantId, leadId);
}

export async function assignLeadService(
    tenantId: string,
    leadId: string,
    request: AssignLeadRequest
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    if (!request.assigned_to) {
        throw new ValidationError('assigned_to is required');
    }

    await updateLead(leadId, tenantId, {
        assignedAgentId: request.assigned_to,
    });

    return assignLead({
        tenantId,
        leadId,
        assignedTo: request.assigned_to,
        assignedBy: tenantId,
    });
}

export async function getStatusHistoryService(
    tenantId: string,
    leadId: string
) {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    return getLeadStatusHistory(tenantId, leadId);
}