import { query, queryOne } from '../../../../platform/index.js';

type ToolResult = {
    success: boolean;
    result?: any;
    error?: string;
};

function generateId(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${prefix}${Date.now()}${rand}`;
}

async function logToolCall(tenantId: string, sessionId: string, toolName: string, input: any, output: any, durationMs: number) {
    try {
        await query(
            `INSERT INTO session_tool_calls (session_id, tenant_id, tool_name, input_params, output_result, success, error_message, duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [sessionId, tenantId, toolName, JSON.stringify(input), JSON.stringify(output.result || null), output.success, output.error || null, durationMs]
        );
    } catch (e) {
        console.error('[Tools] Failed to log tool call:', e);
    }
}

async function doCheckAvailability(tenantId: string, input: any): Promise<ToolResult> {
    const { date } = input;
    const dayOfWeek = new Date(date).getDay();
    const config = await queryOne<any>(
        `SELECT start_time, end_time, slot_duration_minutes 
         FROM tenant_availability 
         WHERE tenant_id = $1 AND day_of_week = $2 AND is_active = true`,
        [tenantId, dayOfWeek]
    );

    if (!config) return { success: true, result: { date, available_slots: [] } };

    // For MVP, just return the start and end time block
    return {
        success: true,
        result: {
            date,
            available_slots: [`${config.start_time.slice(0, 5)} to ${config.end_time.slice(0, 5)} (Every ${config.slot_duration_minutes} mins)`],
        }
    };
}

async function doBookAppointment(tenantId: string, sessionId: string, input: any): Promise<ToolResult> {
    const { date, time, patient_name, phone, service_type, notes } = input;
    const bookingId = generateId('BK');

    await query(
        `INSERT INTO tenant_appointments 
         (tenant_id, session_id, appointment_date, appointment_time, patient_name, phone, service_type, notes, booking_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tenantId, sessionId, date, time, patient_name, phone, service_type, notes, bookingId]
    );

    return {
        success: true,
        result: { success: true, booking_id: bookingId, confirmation_message: `Booked for ${date} at ${time}. ID: ${bookingId}` }
    };
}

async function doGetBusinessInfo(tenantId: string, input: any): Promise<ToolResult> {
    const { info_type } = input;
    const t = await queryOne<any>(`SELECT business_info FROM tenants WHERE id = $1`, [tenantId]);
    if (!t?.business_info || !t.business_info[info_type]) {
        return { success: true, result: { info_type, content: "Information not available." } };
    }
    return { success: true, result: { info_type, content: t.business_info[info_type] } };
}

async function doCaptureLead(tenantId: string, sessionId: string, input: any): Promise<ToolResult> {
    const { name, phone, interest, notes } = input;
    const leadId = generateId('LD');

    await query(
        `INSERT INTO tenant_leads (tenant_id, session_id, name, phone, interest, notes, lead_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, sessionId, name, phone, interest, notes, leadId]
    );

    return { success: true, result: { success: true, lead_id: leadId } };
}

export async function executeToolForTenant(
    tenantId: string,
    sessionId: string,
    toolName: string,
    toolInput: any
): Promise<ToolResult> {
    const start = Date.now();
    let res: ToolResult;
    try {
        switch (toolName) {
            case 'check_availability': res = await doCheckAvailability(tenantId, toolInput); break;
            case 'book_appointment': res = await doBookAppointment(tenantId, sessionId, toolInput); break;
            case 'get_business_info': res = await doGetBusinessInfo(tenantId, toolInput); break;
            case 'capture_lead': res = await doCaptureLead(tenantId, sessionId, toolInput); break;
            case 'transfer_to_human':
                res = { success: true, result: { success: true, message: "Will transfer to human if possible." } };
                break;
            default: res = { success: false, error: 'Unknown tool' };
        }
    } catch (e: any) {
        res = { success: false, error: e.message || 'Tool execution failed' };
    }

    await logToolCall(tenantId, sessionId, toolName, toolInput, res, Date.now() - start);
    return res;
}
