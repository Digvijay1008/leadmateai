import re
import os

files = [
    r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\repositories\lead.repository.ts",
    r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\services\lead.service.ts",
    r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\routes\v1\leads.ts"
]

patterns_to_remove = [
    r"\s*property_id:\s*z\.string\(\)\.uuid\(\)\.optional\(\),",
    r"\s*project_id:\s*z\.string\(\)\.uuid\(\)\.optional\(\),",
    r"\s*budget_min:\s*z\.number\(\)\.positive\(\)\.optional\(\),",
    r"\s*budget_max:\s*z\.number\(\)\.positive\(\)\.optional\(\),",
    r"\s*preferred_location:\s*z\.string\(\)\.optional\(\),",
    r"\s*property_type:\s*z\.string\(\)\.optional\(\),",
    r"\s*property_id:\s*z\.coerce\.string\(\)\.uuid\(\)\.optional\(\),",
    r"\s*project_id:\s*z\.coerce\.string\(\)\.uuid\(\)\.optional\(\),",

    r"\s*property_id:\s*string\s*\|\s*null;",
    r"\s*project_id:\s*string\s*\|\s*null;",
    r"\s*budget_min:\s*number\s*\|\s*null;",
    r"\s*budget_max:\s*number\s*\|\s*null;",
    r"\s*preferred_location:\s*string\s*\|\s*null;",
    r"\s*property_type:\s*string\s*\|\s*null;",

    r"\s*property_id\?:.*?;",
    r"\s*project_id\?:.*?;",
    r"\s*budget_min\?:.*?;",
    r"\s*budget_max\?:.*?;",
    r"\s*preferred_location\?:.*?;",
    r"\s*property_type\?:.*?;",

    r"\s*propertyId\?:.*?;",
    r"\s*projectId\?:.*?;",
    r"\s*budgetMin\?:.*?;",
    r"\s*budgetMax\?:.*?;",
    r"\s*preferredLocation\?:.*?;",
    r"\s*propertyType\?:.*?;",

    r"\s*property_id,",
    r"\s*project_id,",
    r"\s*budget_min,",
    r"\s*budget_max,",
    r"\s*preferred_location,",
    r"\s*property_type,",

    r"\s*params\.propertyId\s*\?\?\s*null,",
    r"\s*params\.projectId\s*\?\?\s*null,",
    r"\s*params\.budgetMin\s*\?\?\s*null,",
    r"\s*params\.budgetMax\s*\?\?\s*null,",
    r"\s*params\.preferredLocation\s*\?\?\s*null,",
    r"\s*params\.propertyType\s*\?\?\s*null,",

    r"\s*if\s*\(filters\.property_id\)\s*\{[^\}]+\}",
    r"\s*if\s*\(filters\.project_id\)\s*\{[^\}]+\}",

    r"\s*if\s*\(updates\.propertyId\s*!==\s*undefined\)\s*\{[^\}]+\}",
    r"\s*if\s*\(updates\.projectId\s*!==\s*undefined\)\s*\{[^\}]+\}",
    r"\s*if\s*\(updates\.budgetMin\s*!==\s*undefined\)\s*\{[^\}]+\}",
    r"\s*if\s*\(updates\.budgetMax\s*!==\s*undefined\)\s*\{[^\}]+\}",
    r"\s*if\s*\(updates\.preferredLocation\s*!==\s*undefined\)\s*\{[^\}]+\}",
    r"\s*if\s*\(updates\.propertyType\s*!==\s*undefined\)\s*\{[^\}]+\}",
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {file_path}")
