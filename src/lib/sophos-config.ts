// Sophos Configuration
// This file contains configuration for the Sophos API integration
// Credentials are now stored securely in %APPDATA%/sophos-dashboard/sophos_secrets.json

export const SOPHOS_CONFIG = {
  // Set to true to use real API, false to use mock data
  USE_REAL_API: true,
  
  // Default region (can be overridden in secrets file)
  DEFAULT_REGION: 'us01'
};

// Helper function to get configuration info
export function getSophosConfigInfo() {
  return {
    useRealApi: SOPHOS_CONFIG.USE_REAL_API,
    defaultRegion: SOPHOS_CONFIG.DEFAULT_REGION,
    credentialsLocation: '%APPDATA%/sophos-dashboard/sophos_secrets.json',
    exampleSecretsFile: {
      client_id: 'your-sophos-client-id',
      client_secret: 'your-sophos-client-secret', 
      tenant_id: 'your-sophos-tenant-id',
      region: 'us01'
    }
  };
}

// Legacy function - kept for compatibility but no longer used
// Credentials are now loaded securely via Tauri commands
export function getSophosConfig() {
  console.warn('getSophosConfig() is deprecated. Credentials are now loaded securely from %APPDATA%/sophos-dashboard/sophos_secrets.json');
  return null;
} 