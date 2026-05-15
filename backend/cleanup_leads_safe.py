import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. leads.ts
replace_in_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\routes\v1\leads.ts", [
    ("    property_id: z.string().uuid().optional(),\n", ""),
    ("    project_id: z.string().uuid().optional(),\n", ""),
    ("    budget_min: z.number().positive().optional(),\n", ""),
    ("    budget_max: z.number().positive().optional(),\n", ""),
    ("    preferred_location: z.string().optional(),\n", ""),
    ("    property_type: z.string().optional(),\n", ""),
    ("    property_id: z.coerce.string().uuid().optional(),\n", ""),
    ("    project_id: z.coerce.string().uuid().optional(),\n", ""),
])

# 2. lead.service.ts
replace_in_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\services\lead.service.ts", [
    ("        propertyId: request.property_id,\n", ""),
    ("        projectId: request.project_id,\n", ""),
    ("        budgetMin: request.budget_min,\n", ""),
    ("        budgetMax: request.budget_max,\n", ""),
    ("        preferredLocation: request.preferred_location,\n", ""),
    ("        propertyType: request.property_type,\n", ""),
])

# 3. lead.repository.ts
replace_in_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\repositories\lead.repository.ts", [
    ("    property_id?: string | null;\n", ""),
    ("    project_id?: string | null;\n", ""),
    ("    budget_min?: number | null;\n", ""),
    ("    budget_max?: number | null;\n", ""),
    ("    preferred_location?: string | null;\n", ""),
    ("    property_type?: string | null;\n", ""),
    
    ("    propertyId?: string;\n", ""),
    ("    projectId?: string;\n", ""),
    ("    budgetMin?: number;\n", ""),
    ("    budgetMax?: number;\n", ""),
    ("    preferredLocation?: string;\n", ""),
    ("    propertyType?: string;\n", ""),
    
    # createLead params block
    ("""        [
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
        ]""", """        [
            id,
            params.tenantId,
            params.assignedAgentId ?? null,
            params.fullName,
            params.phone,
            params.email ?? null,
            params.source ?? 'website',
            params.status ?? 'new',
            params.priority ?? 'medium',
            params.followUpAt ?? null,
        ]"""),
        
    # createLead SQL
    ("""        `INSERT INTO leads (
            id, tenant_id, property_id, project_id, assigned_agent_id,
            full_name, phone, email, source, status, priority,
            budget_min, budget_max, preferred_location, property_type, follow_up_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,""", """        `INSERT INTO leads (
            id, tenant_id, assigned_agent_id,
            full_name, phone, email, source, status, priority, follow_up_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,"""),

    # listLeads condition
    ("""    if (filters.property_id) {
        conditions.push(`property_id = $${paramIndex++}`);
        params.push(filters.property_id);
    }
    if (filters.project_id) {
        conditions.push(`project_id = $${paramIndex++}`);
        params.push(filters.project_id);
    }
""", ""),

    # updateLead condition blocks
    ("""    if (updates.propertyId !== undefined) {
        setClauses.push(`property_id = $${paramIndex++}`);
        params.push(updates.propertyId);
    }
    if (updates.projectId !== undefined) {
        setClauses.push(`project_id = $${paramIndex++}`);
        params.push(updates.projectId);
    }
""", ""),
    ("""    if (updates.budgetMin !== undefined) {
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
""", ""),
])
print("Done")
