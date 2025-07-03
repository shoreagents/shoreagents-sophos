import requests
import json
from datetime import datetime
import time
import os

def get_access_token(client_id, client_secret):
    """Get access token from Sophos API."""
    token_url = "https://id.sophos.com/api/v2/oauth2/token"
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "token"
    }
    
    try:
        response = requests.post(token_url, headers=headers, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        return token_data.get("access_token")
    except Exception as e:
        print(f"❌ Error getting access token: {e}")
        return None

def get_endpoint_inventory(access_token, tenant_id, page_size=100):
    """Get all endpoints from Sophos Central."""
    base_url = "https://api-us01.central.sophos.com/endpoint/v1/endpoints"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Tenant-ID": tenant_id
    }
    
    params = {
        "pageSize": page_size
    }
    
    all_endpoints = []
    has_more = True
    page_count = 0
    
    print(f"📡 Fetching endpoint inventory...")
    print(f"   Page size: {page_size}")
    print(f"   No limits - retrieving all available endpoints")
    
    while has_more:
        try:
            page_count += 1
            response = requests.get(base_url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            endpoints = data.get("items", [])
            
            if not endpoints:
                has_more = False
                break
            
            all_endpoints.extend(endpoints)
            
            print(f"   ✅ Page {page_count}: Retrieved {len(endpoints)} endpoints (Total: {len(all_endpoints)})")
            
            # Check if there are more pages
            has_more = data.get("has_more", False)
            
            # Small delay to avoid rate limiting
            time.sleep(0.1)
            
        except Exception as e:
            print(f"❌ Error fetching endpoints: {e}")
            break
    
    return all_endpoints

def analyze_endpoints(endpoints):
    """Analyze endpoint inventory and provide statistics."""
    if not endpoints:
        print("❌ No endpoints to analyze")
        return
    
    print(f"\n📊 ENDPOINT INVENTORY ANALYSIS")
    print("=" * 60)
    print(f"Total Endpoints: {len(endpoints)}")
    
    # OS analysis
    os_counts = {}
    online_counts = {"online": 0, "offline": 0}
    type_counts = {}
    group_counts = {}
    health_counts = {}
    
    for endpoint in endpoints:
        # OS
        os_info = endpoint.get("os", {})
        os_name = os_info.get("name", "Unknown") if os_info else "Unknown"
        os_counts[os_name] = os_counts.get(os_name, 0) + 1
        
        # Online status
        online_status = "online" if endpoint.get("online", False) else "offline"
        online_counts[online_status] = online_counts.get(online_status, 0) + 1
        
        # Endpoint type
        endpoint_type = endpoint.get("type", "Unknown")
        type_counts[endpoint_type] = type_counts.get(endpoint_type, 0) + 1
        
        # Group
        group = endpoint.get("group", {}).get("name", "Unknown") if endpoint.get("group") else "Unknown"
        group_counts[group] = group_counts.get(group, 0) + 1
        
        # Health
        health = endpoint.get("health", {}).get("overall", "Unknown") if endpoint.get("health") else "Unknown"
        health_counts[health] = health_counts.get(health, 0) + 1
    
    # Display statistics
    print(f"\n🖥️  Operating Systems:")
    for os_name, count in sorted(os_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {os_name}: {count}")
    
    print(f"\n🌐 Online Status:")
    for status, count in sorted(online_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {status.capitalize()}: {count}")
    
    print(f"\n📱 Endpoint Types:")
    for endpoint_type, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {endpoint_type}: {count}")
    
    print(f"\n📂 Groups:")
    for group, count in sorted(group_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {group}: {count}")
    
    print(f"\n🏥 Health Status:")
    for health, count in sorted(health_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {health}: {count}")

def display_endpoints(endpoints, limit=20):
    """Display endpoints in a formatted table."""
    if not endpoints:
        print("❌ No endpoints to display")
        return
    
    print(f"\n📋 ENDPOINT INVENTORY (Top {limit})")
    print("=" * 140)
    print(f"{'Hostname':<25} {'OS':<15} {'Type':<10} {'Status':<8} {'Health':<10} {'Group':<20} {'IP':<15}")
    print("=" * 140)
    
    # Sort by hostname
    sorted_endpoints = sorted(endpoints, key=lambda x: x.get("hostname", ""))
    
    for endpoint in sorted_endpoints[:limit]:
        hostname = endpoint.get("hostname", "Unknown")
        os_info = endpoint.get("os", {})
        os_name = os_info.get("name", "Unknown") if os_info else "Unknown"
        endpoint_type = endpoint.get("type", "Unknown")
        online_status = "Online" if endpoint.get("online", False) else "Offline"
        health = endpoint.get("health", {}).get("overall", "Unknown") if endpoint.get("health") else "Unknown"
        group = endpoint.get("group", {}).get("name", "Unknown") if endpoint.get("group") else "Unknown"
        ip_addresses = endpoint.get("ipAddresses", [])
        ip = ip_addresses[0] if ip_addresses else "Unknown"
        
        # Truncate long strings
        hostname = hostname[:24] + "..." if len(hostname) > 24 else hostname
        os_name = os_name[:14] + "..." if len(os_name) > 14 else os_name
        group = group[:19] + "..." if len(group) > 19 else group
        ip = ip[:14] + "..." if len(ip) > 14 else ip
        
        print(f"{hostname:<25} {os_name:<15} {endpoint_type:<10} {online_status:<8} {health:<10} {group:<20} {ip:<15}")
    
    print("=" * 140)

def export_endpoints_to_json(endpoints, filename="sophos_endpoint_inventory.json"):
    """Export endpoints to JSON file in data folder."""
    try:
        # Ensure data folder exists
        os.makedirs("data", exist_ok=True)
        
        # Save to data folder
        filepath = os.path.join("data", filename)
        with open(filepath, 'w') as f:
            json.dump(endpoints, f, indent=2)
        print(f"✅ Endpoints exported to {filepath}")
    except Exception as e:
        print(f"❌ Error exporting endpoints: {e}")

def main():
    # Your credentials and tenant ID
    CLIENT_ID = "ab896b4f-0ff5-4fa9-9f8f-debce01cbcb5"
    CLIENT_SECRET = "680ab56f596036e8947561151e1284b617331a6a6880e6e3d9c80bd3de59b0a20b85aad1e201f510ce335a3222de04d4f543"
    TENANT_ID = "7b6f33dc-7e03-4d71-9729-689e43882c47"
    
    print("🔍 Sophos Central Endpoint Inventory")
    print("=" * 60)
    
    # Get access token
    access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)
    if not access_token:
        print("❌ Failed to get access token")
        return
    
    print("✅ Access token obtained successfully")
    
    # Get all endpoints
    print(f"\n📡 Fetching endpoint inventory...")
    all_endpoints = get_endpoint_inventory(access_token, TENANT_ID)
    
    if all_endpoints:
        # Analyze endpoints
        analyze_endpoints(all_endpoints)
        
        # Display endpoints
        display_endpoints(all_endpoints, limit=20)
        
        # Export endpoints
        export_endpoints_to_json(all_endpoints)
        
        print(f"\n🎉 Endpoint inventory retrieval completed!")
        print(f"   Total endpoints retrieved: {len(all_endpoints)}")
        print(f"   File created: data/sophos_endpoint_inventory.json")
    else:
        print("❌ No endpoints found")

if __name__ == "__main__":
    main() 