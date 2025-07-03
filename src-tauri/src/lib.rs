use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct SophosTokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SophosCredentials {
    client_id: String,
    client_secret: String,
    tenant_id: String,
    region: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SophosEndpoint {
    id: String,
    hostname: Option<String>,
    os: Option<serde_json::Value>,
    #[serde(rename = "type")]
    endpoint_type: Option<String>,
    online: Option<bool>,
    health: Option<serde_json::Value>,
    group: Option<serde_json::Value>,
    #[serde(rename = "ipAddresses")]
    ip_addresses: Option<Vec<String>>,
    #[serde(rename = "ipv4Addresses")]
    ipv4_addresses: Option<Vec<String>>,
    #[serde(rename = "ipv6Addresses")]  
    ipv6_addresses: Option<Vec<String>>,
    #[serde(rename = "lastSeen")]
    last_seen: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SophosEndpointsResponse {
    items: Option<Vec<SophosEndpoint>>,
    pages: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CachedData {
    endpoints: Vec<SophosEndpoint>,
    timestamp: u64,
    tenant_id: String,
}

const CACHE_FILE: &str = "sophos_cache.json";
const SECRETS_FILE: &str = "sophos_secrets.json";
const CACHE_DURATION_HOURS: u64 = 1; // Cache for 1 hour

fn get_app_data_dir() -> std::path::PathBuf {
    // Create app data directory in user's data directory
    let mut path = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("sophos-dashboard");
    std::fs::create_dir_all(&path).ok();
    path
}

fn get_cache_path() -> std::path::PathBuf {
    let mut path = get_app_data_dir();
    path.push(CACHE_FILE);
    path
}

fn get_secrets_path() -> std::path::PathBuf {
    let mut path = get_app_data_dir();
    path.push(SECRETS_FILE);
    path
}

fn load_credentials() -> Option<SophosCredentials> {
    let secrets_path = get_secrets_path();
    
    if !secrets_path.exists() {
        println!("🔐 No secrets file found at: {}", secrets_path.display());
        return None;
    }

    match fs::read_to_string(&secrets_path) {
        Ok(content) => {
            match serde_json::from_str::<SophosCredentials>(&content) {
                Ok(credentials) => {
                    println!("✅ Successfully loaded credentials from secrets file");
                    Some(credentials)
                }
                Err(e) => {
                    println!("❌ Failed to parse secrets file: {}", e);
                    None
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to read secrets file: {}", e);
            None
        }
    }
}

#[tauri::command]
async fn load_sophos_credentials() -> Result<SophosCredentials, String> {
    match load_credentials() {
        Some(credentials) => Ok(credentials),
        None => {
            let secrets_path = get_secrets_path();
            Err(format!(
                "No Sophos credentials found. Please create a secrets file at: {}\n\nExample format:\n{{\n  \"client_id\": \"your-client-id\",\n  \"client_secret\": \"your-client-secret\",\n  \"tenant_id\": \"your-tenant-id\",\n  \"region\": \"us01\"\n}}",
                secrets_path.display()
            ))
        }
    }
}

#[tauri::command]
async fn save_sophos_credentials(credentials: SophosCredentials) -> Result<String, String> {
    let secrets_path = get_secrets_path();
    
    match serde_json::to_string_pretty(&credentials) {
        Ok(json_content) => {
            match fs::write(&secrets_path, json_content) {
                Ok(_) => {
                    println!("🔐 Credentials saved successfully to: {}", secrets_path.display());
                    Ok(format!("Credentials saved successfully to: {}", secrets_path.display()))
                }
                Err(e) => Err(format!("Failed to save credentials: {}", e))
            }
        }
        Err(e) => Err(format!("Failed to serialize credentials: {}", e))
    }
}

#[tauri::command]
async fn get_secrets_file_path() -> String {
    get_secrets_path().to_string_lossy().to_string()
}

fn is_cache_valid(timestamp: u64) -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let cache_age_hours = (now - timestamp) / 3600;
    cache_age_hours < CACHE_DURATION_HOURS
}

fn load_cached_data(tenant_id: &str) -> Option<Vec<SophosEndpoint>> {
    let cache_path = get_cache_path();
    
    if !cache_path.exists() {
        println!("📂 No cache file found");
        return None;
    }

    match fs::read_to_string(&cache_path) {
        Ok(content) => {
            match serde_json::from_str::<CachedData>(&content) {
                Ok(cached_data) => {
                    if cached_data.tenant_id != tenant_id {
                        println!("🔄 Cache tenant mismatch, ignoring cache");
                        return None;
                    }
                    
                    if is_cache_valid(cached_data.timestamp) {
                        println!("✅ Using cached data ({} endpoints, {} hours old)", 
                                cached_data.endpoints.len(),
                                (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() - cached_data.timestamp) / 3600);
                        Some(cached_data.endpoints)
                    } else {
                        println!("⏰ Cache expired, will fetch fresh data");
                        None
                    }
                }
                Err(e) => {
                    println!("❌ Failed to parse cache: {}", e);
                    None
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to read cache: {}", e);
            None
        }
    }
}

fn save_cached_data(endpoints: &[SophosEndpoint], tenant_id: &str) {
    let cache_path = get_cache_path();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let cached_data = CachedData {
        endpoints: endpoints.to_vec(),
        timestamp,
        tenant_id: tenant_id.to_string(),
    };

    match serde_json::to_string_pretty(&cached_data) {
        Ok(json_content) => {
            match fs::write(&cache_path, json_content) {
                Ok(_) => println!("💾 Data cached successfully ({} endpoints)", endpoints.len()),
                Err(e) => println!("❌ Failed to save cache: {}", e),
            }
        }
        Err(e) => println!("❌ Failed to serialize cache: {}", e),
    }
}

#[tauri::command]
async fn clear_cache() -> Result<String, String> {
    let cache_path = get_cache_path();
    
    if cache_path.exists() {
        match fs::remove_file(&cache_path) {
            Ok(_) => {
                println!("🗑️  Cache cleared successfully");
                Ok("Cache cleared successfully".to_string())
            }
            Err(e) => Err(format!("Failed to clear cache: {}", e))
        }
    } else {
        Ok("No cache file to clear".to_string())
    }
}

#[tauri::command]
async fn get_sophos_access_token() -> Result<String, String> {
    let credentials = load_credentials().ok_or("No Sophos credentials found. Please configure credentials first.")?;
    
    let client = reqwest::Client::new();
    
    let mut params = HashMap::new();
    params.insert("grant_type", "client_credentials");
    params.insert("client_id", &credentials.client_id);
    params.insert("client_secret", &credentials.client_secret);
    params.insert("scope", "token");

    let response = client
        .post("https://id.sophos.com/api/v2/oauth2/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Authentication failed: {}", response.status()));
    }

    let token_response: SophosTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(token_response.access_token)
}

#[tauri::command]
async fn fetch_sophos_endpoints(
    access_token: String,
) -> Result<Vec<SophosEndpoint>, String> {
    let credentials = load_credentials().ok_or("No Sophos credentials found. Please configure credentials first.")?;
    
    // Check cache first
    if let Some(cached_endpoints) = load_cached_data(&credentials.tenant_id) {
        return Ok(cached_endpoints);
    }

    let client = reqwest::Client::new();
    let base_url = format!("https://api-{}.central.sophos.com/endpoint/v1/endpoints", credentials.region);
    
    let mut all_endpoints = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();
    let mut page_token: Option<String> = None;
    let mut page_count = 0;
    let page_size = 100; // Maximum page size for better performance

    println!("📡 Fetching endpoint inventory with pagination...");
    println!("   Page size: {}", page_size);

    loop {
        page_count += 1;
        
        // Build URL with pagination parameters
        let mut url = format!("{}?pageSize={}", base_url, page_size);
        if let Some(ref token) = page_token {
            url.push_str(&format!("&pageFromKey={}", token));
        }

        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", &access_token))
            .header("X-Tenant-ID", &credentials.tenant_id)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| format!("Request failed on page {}: {}", page_count, e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API request failed on page {} ({}): {}", page_count, status, error_text));
        }

        let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
        
        // Debug: Log a sample of the first page response
        if page_count == 1 {
            if response_text.len() > 1000 {
                println!("Sample Sophos API response (page 1): {}", &response_text[..1000]);
            } else {
                println!("Full Sophos API response (page 1): {}", response_text);
            }
        }
        
        let endpoints_response: SophosEndpointsResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response on page {}: {}", page_count, e))?;

        let page_endpoints = endpoints_response.items.unwrap_or_default();
        
        if page_endpoints.is_empty() {
            println!("   ⚠️  Page {} returned no endpoints, stopping pagination", page_count);
            break;
        }

        let page_endpoint_count = page_endpoints.len();
        let mut unique_count = 0;
        
        // Add only unique endpoints (deduplicate by ID)
        for endpoint in page_endpoints {
            if seen_ids.insert(endpoint.id.clone()) {
                all_endpoints.push(endpoint);
                unique_count += 1;
            }
        }
        
        if unique_count != page_endpoint_count {
            println!("   ⚠️  Found {} duplicate endpoints on page {}", 
                    page_endpoint_count - unique_count, page_count);
        }
        
        println!("   ✅ Page {}: Retrieved {} unique endpoints of {} total (Running total: {})", 
                page_count, unique_count, page_endpoint_count, all_endpoints.len());

        // Check if there are more pages by looking for nextKey in pages object
        let has_more = if let Some(pages) = &endpoints_response.pages {
            pages.get("nextKey").is_some()
        } else {
            false
        };

        if has_more {
            // Extract the next page token
            if let Some(pages) = &endpoints_response.pages {
                if let Some(next_key) = pages.get("nextKey") {
                    if let Some(next_token) = next_key.as_str() {
                        page_token = Some(next_token.to_string());
                    } else {
                        println!("   ⚠️  nextKey found but not a string, stopping pagination");
                        break;
                    }
                } else {
                    break;
                }
            } else {
                break;
            }
        } else {
            println!("   ✅ No more pages available");
            break;
        }

        // Small delay to avoid rate limiting
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
    
    println!("📊 Pagination complete: {} total endpoints retrieved across {} pages", 
             all_endpoints.len(), page_count);
    
    // Save to cache for future use
    save_cached_data(&all_endpoints, &credentials.tenant_id);
    
    // Debug: Log sample endpoint structure from first endpoint
    if let Some(first_endpoint) = all_endpoints.first() {
        println!("Sample endpoint structure: {:#?}", first_endpoint);
    }
    
    Ok(all_endpoints)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![get_sophos_access_token, fetch_sophos_endpoints, clear_cache, load_sophos_credentials, save_sophos_credentials, get_secrets_file_path])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
