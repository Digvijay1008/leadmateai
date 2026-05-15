import re

def clean_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove property_id, project_id, budget_min, budget_max, preferred_location, property_type
    content = re.sub(r'\s*property_id\??:.*?;?', '', content)
    content = re.sub(r'\s*project_id\??:.*?;?', '', content)
    content = re.sub(r'\s*budget_min\??:.*?;?', '', content)
    content = re.sub(r'\s*budget_max\??:.*?;?', '', content)
    content = re.sub(r'\s*preferred_location\??:.*?;?', '', content)
    content = re.sub(r'\s*property_type\??:.*?;?', '', content)
    
    content = re.sub(r'\s*propertyId\??:.*?;?', '', content)
    content = re.sub(r'\s*projectId\??:.*?;?', '', content)
    content = re.sub(r'\s*budgetMin\??:.*?;?', '', content)
    content = re.sub(r'\s*budgetMax\??:.*?;?', '', content)
    content = re.sub(r'\s*preferredLocation\??:.*?;?', '', content)
    content = re.sub(r'\s*propertyType\??:.*?;?', '', content)
    
    content = re.sub(r'\s*params\.propertyId\s*\?\?\s*null,?', '', content)
    content = re.sub(r'\s*params\.projectId\s*\?\?\s*null,?', '', content)
    content = re.sub(r'\s*params\.budgetMin\s*\?\?\s*null,?', '', content)
    content = re.sub(r'\s*params\.budgetMax\s*\?\?\s*null,?', '', content)
    content = re.sub(r'\s*params\.preferredLocation\s*\?\?\s*null,?', '', content)
    content = re.sub(r'\s*params\.propertyType\s*\?\?\s*null,?', '', content)

    # 2. Fix empty ifs or update object syntax
    content = re.sub(r'\s*if\s*\([^\)]*property[^\)]*\)\s*\{[^\}]*\}', '', content)
    content = re.sub(r'\s*if\s*\([^\)]*project[^\)]*\)\s*\{[^\}]*\}', '', content)
    content = re.sub(r'\s*if\s*\([^\)]*budget[^\)]*\)\s*\{[^\}]*\}', '', content)

    # In update array pushes
    content = re.sub(r'\s*if\s*\([^\)]*(propertyId|projectId|budgetMin|budgetMax|preferredLocation|propertyType)[^\)]*\)\s*\{[^\}]*\}', '', content)
    
    # In schemas, remove comma after removed lines if it broke things (we removed lines completely)
    
    with open(filepath, 'w') as f:
        f.write(content)

clean_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\repositories\lead.repository.ts")
clean_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\services\lead.service.ts")
clean_file(r"c:\Users\Lenovo\OneDrive\Desktop\Leadmate\backend\src\domain\realestate\routes\v1\leads.ts")
