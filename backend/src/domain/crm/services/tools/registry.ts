import { z } from 'zod';

export type ToolDefinition = {
    name: string;
    description: string;
    schema: z.ZodTypeAny;
};

export const toolsRegistry: Record<string, ToolDefinition> = {
    check_availability: {
        name: 'check_availability',
        description: 'Check available appointment slots for a given date.',
        schema: z.object({
            date: z.string().describe('Date in YYYY-MM-DD format'),
            service_type: z.string().optional().describe('Type of service requested'),
        }),
    },
    book_appointment: {
        name: 'book_appointment',
        description: 'Book an appointment for the caller.',
        schema: z.object({
            date: z.string().describe('Date in YYYY-MM-DD format'),
            time: z.string().describe('Time in HH:MM format'),
            patient_name: z.string().describe('Full name of the patient'),
            phone: z.string().describe('Patient phone number'),
            service_type: z.string().optional().describe('Type of appointment'),
            notes: z.string().optional().describe('Any additional notes'),
        }),
    },
    get_business_info: {
        name: 'get_business_info',
        description: 'Get business information like hours, services, location, or fees.',
        schema: z.object({
            info_type: z.enum(['hours', 'services', 'location', 'fees']).describe('One of: hours, services, location, fees'),
        }),
    },
    capture_lead: {
        name: 'capture_lead',
        description: 'Capture a lead when caller is interested but not ready to book.',
        schema: z.object({
            name: z.string().describe('Caller full name'),
            phone: z.string().describe('Caller phone number'),
            interest: z.string().describe('What they are interested in'),
            notes: z.string().optional().describe('Additional context'),
        }),
    },
    transfer_to_human: {
        name: 'transfer_to_human',
        description: 'Transfer call to a human agent when requested.',
        schema: z.object({
            reason: z.string().describe('Why the caller wants to speak to a human'),
        }),
    },
};
