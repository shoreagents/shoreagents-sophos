// Sophos Configuration
// This file contains the Sophos API credentials
// In a production environment, these should come from environment variables

export const SOPHOS_CONFIG = {
  // Set to true to use real credentials, false to use mock data
  USE_REAL_API: true,
  
  // Sophos API Credentials
  CLIENT_ID: 'ab896b4f-0ff5-4fa9-9f8f-debce01cbcb5',
  CLIENT_SECRET: '680ab56f596036e8947561151e1284b617331a6a6880e6e3d9c80bd3de59b0a20b85aad1e201f510ce335a3222de04d4f543',
  TENANT_ID: '7b6f33dc-7e03-4d71-9729-689e43882c47',
  REGION: 'us01'
};

// Helper function to get credentials
export function getSophosConfig() {
  // First try environment variables (if they work in the future)
  const envConfig = {
    clientId: process.env.NEXT_PUBLIC_SOPHOS_CLIENT_ID,
    clientSecret: process.env.NEXT_PUBLIC_SOPHOS_CLIENT_SECRET,
    tenantId: process.env.NEXT_PUBLIC_SOPHOS_TENANT_ID,
    region: process.env.NEXT_PUBLIC_SOPHOS_REGION || 'us01'
  };

  // If environment variables are available, use them
  if (envConfig.clientId && envConfig.clientSecret && envConfig.tenantId) {
    console.log('Using environment variables for Sophos credentials');
    return {
      clientId: envConfig.clientId,
      clientSecret: envConfig.clientSecret,
      tenantId: envConfig.tenantId,
      region: envConfig.region
    };
  }

  // Otherwise, fall back to hardcoded config (only if enabled)
  if (SOPHOS_CONFIG.USE_REAL_API) {
    console.log('Using hardcoded Sophos credentials (environment variables not available)');
    return {
      clientId: SOPHOS_CONFIG.CLIENT_ID,
      clientSecret: SOPHOS_CONFIG.CLIENT_SECRET,
      tenantId: SOPHOS_CONFIG.TENANT_ID,
      region: SOPHOS_CONFIG.REGION
    };
  }

  // No credentials available
  console.log('No Sophos credentials configured');
  return null;
} 