import {
    query,
    queryOne,
    queryMany,
} from '../../../platform/index.js';
import { generateId } from '../../../shared/index.js';

export interface Lead {
    id: string;
    tenant_id: string;
    property_id: string | null;
    project_id: string | null;
    assigned_agent_id: string | null;
    full_name: string;
    phone: string;
    email: string | null;
    source: string;
    status: string;
    priority: string;
    budget_min: number | null;
    budget_max: number | null;
    preferred_location: string | null;
    property_type: string | null;
    follow_up_at: Date | null;
    last_contacted_at: Date | null;
    notes_summary: string | null;
    lead_score: number;
    created_at: Date;
    updated_at: Date;
}

export interface LeadActivity {
    id: string;
    tenant_id: string;
    lead_id: string;
    activity_type: string;
    channel: string | null;
    description: string | null;
    created_by: string | null;
    created_at: Date;
}

export interface LeadNote {
    id: string;
    tenant_id: string;
    lead_id: string;
    note: string;
    created_by: string | null;
    created_at: Date;
}

export interface LeadAssignment {
    id: string;
    tenant_id: string;
    lead_id: string;
    assigned_to: string;
    assigned_by: string;
    assigned_at: Date;
}

export interface LeadStatusHistory {
    id: string;
    tenant_id: string;
    lead_id: string;
    old_status: string | null;
    new_status: string;
    changed_by: string | null;
    changed_at: Date;
}

export interface LeadFilters {
    status?: string;
    source?: string;
    priority?: string;
    property_id?: string;
    project_id?: string;
    assigned_agent_id?: string;
    search?: string;
    follow_up_before?: Date;
    follow_up_after?: Date;
    limit?: number;
    offset?: number;
}

export interface PaginatedLeads {
    leads: Lead[];
    total: number;
    limit: number;
    offset: number;
}

export async function createLead(params: {
    tenantId: string;
    propertyId?: string | null;
    projectId?: string | null;
    assignedAgentId?: string | null;
    fullName: string;
    phone: string;
    email?: string | null;
    source?: string;
    status?: string;
    priority?: string;
    budgetMin?: number;
    budgetMax?: number;
    preferredLocation?: string;
    propertyType?: string;
    followUpAt?: Date;
}): Promise<Lead> {
    const id = generateId();

    const result = await queryOne<Lead>(
        `INSERT INTO leads (
            id, tenant_id, property_id, project_id, assigned_agent_id,
            full_name, phone, email, source, status, priority,
            budget_min, budget_max, preferred_location, property_type, follow_up_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
            id,
            params.tenantId,
            params.propertyId ?? null,
            params.projectId ?? null,
            params.assignedAgentId ?? null,
            params.fullName,
            params.phone,
            params.email ?? null,
            params.source ?? 'website',
            params.status ?? 'new',
            params.priority ?? 'medium',
            params.budgetMin ?? null,
            params.budgetMax ?? null,
            params.preferredLocation ?? null,
            params.propertyType ?? null,
            params.followUpAt ?? null,
        ]
    );

    return result!;
}

export async function getLeadById(
    leadId: string,
    tenantId: string
): Promise<Lead | null> {
    return queryOne<Lead>(
        `SELECT * FROM leads WHERE id = $1 AND tenant_id = $2`,
        [leadId, tenantId]
    );
}

export async function listLeads(
    tenantId: string,
    filters: LeadFilters = {}
): Promise<PaginatedLeads> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }
    if (filters.source) {
        conditions.push(`source = $${paramIndex++}`);
        params.push(filters.source);
    }
    if (filters.priority) {
        conditions.push(`priority = $${paramIndex++}`);
        params.push(filters.priority);
    }
    if (filters.property_id) {
        conditions.push(`property_id = $${paramIndex++}`);
        params.push(filters.property_id);
    }
    if (filters.project_id) {
        conditions.push(`project_id = $${paramIndex++}`);
        params.push(filters.project_id);
    }
    if (filters.assigned_agent_id) {
        conditions.push(`assigned_agent_id = $${paramIndex++}`);
        params.push(filters.assigned_agent_id);
    }
    if (filters.search) {
        conditions.push(`(full_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
    }
    if (filters.follow_up_before) {
        conditions.push(`follow_up_at <= $${paramIndex++}`);
        params.push(filters.follow_up_before);
    }
    if (filters.follow_up_after) {
        conditions.push(`follow_up_at >= $${paramIndex++}`);
        params.push(filters.follow_up_after);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM leads WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult?.count ?? '0', 10);

    params.push(limit, offset);
    const leads = await queryMany<Lead>(
        `SELECT * FROM leads WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
    );

    return { leads, total, limit, offset };
}

export async function updateLead(
    leadId: string,
    tenantId: string,
    updates: Partial<{
        propertyId: string;
        projectId: string;
        assignedAgentId: string;
        fullName: string;
        phone: string;
        email: string;
        source: string;
        status: string;
        priority: string;
        budgetMin: number;
        budgetMax: number;
        preferredLocation: string;
        propertyType: string;
        followUpAt: Date;
        lastContactedAt: Date;
        notesSummary: string;
        leadScore: number;
    }>
): Promise<Lead | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.propertyId !== undefined) {
        setClauses.push(`property_id = $${paramIndex++}`);
        params.push(updates.propertyId);
    }
    if (updates.projectId !== undefined) {
        setClauses.push(`project_id = $${paramIndex++}`);
        params.push(updates.projectId);
    }
    if (updates.assignedAgentId !== undefined) {
        setClauses.push(`assigned_agent_id = $${paramIndex++}`);
        params.push(updates.assignedAgentId);
    }
    if (updates.fullName !== undefined) {
        setClauses.push(`full_name = $${paramIndex++}`);
        params.push(updates.fullName);
    }
    if (updates.phone !== undefined) {
        setClauses.push(`phone = $${paramIndex++}`);
        params.push(updates.phone);
    }
    if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        params.push(updates.email);
    }
    if (updates.source !== undefined) {
        setClauses.push(`source = $${paramIndex++}`);
        params.push(updates.source);
    }
    if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(updates.status);
    }
    if (updates.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex++}`);
        params.push(updates.priority);
    }
    if (updates.budgetMin !== undefined) {
        setClauses.push(`budget_min = $${paramIndex++}`);
        params.push(updates.budgetMin);
    }
    if (updates.budgetMax !== undefined) {
        setClauses.push(`budget_max = $${paramIndex++}`);
        params.push(updates.budgetMax);
    }
    if (updates.preferredLocation !== undefined) {
        setClauses.push(`preferred_location = $${paramIndex++}`);
        params.push(updates.preferredLocation);
    }
    if (updates.propertyType !== undefined) {
        setClauses.push(`property_type = $${paramIndex++}`);
        params.push(updates.propertyType);
    }
    if (updates.followUpAt !== undefined) {
        setClauses.push(`follow_up_at = $${paramIndex++}`);
        params.push(updates.followUpAt);
    }
    if (updates.lastContactedAt !== undefined) {
        setClauses.push(`last_contacted_at = $${paramIndex++}`);
        params.push(updates.lastContactedAt);
    }
    if (updates.notesSummary !== undefined) {
        setClauses.push(`notes_summary = $${paramIndex++}`);
        params.push(updates.notesSummary);
    }
    if (updates.leadScore !== undefined) {
        setClauses.push(`lead_score = $${paramIndex++}`);
        params.push(updates.leadScore);
    }

    if (setClauses.length === 1) {
        return getLeadById(leadId, tenantId);
    }

    params.push(leadId, tenantId);

    return queryOne<Lead>(
        `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
        params
    );
}

export async function deleteLead(
    leadId: string,
    tenantId: string
): Promise<boolean> {
    const result = await query(
        `DELETE FROM leads WHERE id = $1 AND tenant_id = $2`,
        [leadId, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function addLeadActivity(params: {
    tenantId: string;
    leadId: string;
    activityType: string;
    channel?: string;
    description?: string;
    createdBy?: string;
}): Promise<LeadActivity> {
    const id = generateId();

    const result = await queryOne<LeadActivity>(
        `INSERT INTO lead_activities (
            id, tenant_id, lead_id, activity_type, channel, description, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            id,
            params.tenantId,
            params.leadId,
            params.activityType,
            params.channel ?? null,
            params.description ?? null,
            params.createdBy ?? null,
        ]
    );

    return result!;
}

export async function listLeadActivities(
    tenantId: string,
    leadId: string
): Promise<LeadActivity[]> {
    return queryMany<LeadActivity>(
        `SELECT * FROM lead_activities 
         WHERE tenant_id = $1 AND lead_id = $2 
         ORDER BY created_at DESC`,
        [tenantId, leadId]
    );
}

export async function addLeadNote(params: {
    tenantId: string;
    leadId: string;
    note: string;
    createdBy?: string;
}): Promise<LeadNote> {
    const id = generateId();

    const result = await queryOne<LeadNote>(
        `INSERT INTO lead_notes (id, tenant_id, lead_id, note, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, params.tenantId, params.leadId, params.note, params.createdBy ?? null]
    );

    return result!;
}

export async function listLeadNotes(
    tenantId: string,
    leadId: string
): Promise<LeadNote[]> {
    return queryMany<LeadNote>(
        `SELECT * FROM lead_notes 
         WHERE tenant_id = $1 AND lead_id = $2 
         ORDER BY created_at DESC`,
        [tenantId, leadId]
    );
}

export async function assignLead(params: {
    tenantId: string;
    leadId: string;
    assignedTo: string;
    assignedBy: string;
}): Promise<LeadAssignment> {
    const id = generateId();

    const result = await queryOne<LeadAssignment>(
        `INSERT INTO lead_assignments (id, tenant_id, lead_id, assigned_to, assigned_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, params.tenantId, params.leadId, params.assignedTo, params.assignedBy]
    );

    return result!;
}

export async function getLeadStatusHistory(
    tenantId: string,
    leadId: string
): Promise<LeadStatusHistory[]> {
    return queryMany<LeadStatusHistory>(
        `SELECT * FROM lead_status_history 
         WHERE tenant_id = $1 AND lead_id = $2 
         ORDER BY changed_at DESC`,
        [tenantId, leadId]
    );
}

export async function recordStatusChange(params: {
    tenantId: string;
    leadId: string;
    oldStatus: string | null;
    newStatus: string;
    changedBy?: string;
}): Promise<LeadStatusHistory> {
    const id = generateId();

    const result = await queryOne<LeadStatusHistory>(
        `INSERT INTO lead_status_history (id, tenant_id, lead_id, old_status, new_status, changed_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            id,
            params.tenantId,
            params.leadId,
            params.oldStatus,
            params.newStatus,
            params.changedBy ?? null,
        ]
    );

    return result!;
}