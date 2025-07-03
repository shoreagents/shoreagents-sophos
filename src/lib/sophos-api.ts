// Sophos Central API Integration
// This file contains utilities for connecting to Sophos Central API via Tauri commands

import { invoke } from '@tauri-apps/api/core';

interface SophosCredentials {
  client_id: string;
  client_secret: string;
  tenant_id: string;
  region: string;
}

interface SophosTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SophosEndpoint {
  id: string;
  hostname: string;
  os: {
    name: string;
    version?: string;
  };
  type: string;
  online: boolean;
  health: {
    overall: string;
  };
  group: {
    name: string;
  };
  ipAddresses: string[];
  lastSeen?: string;
}

/**
 * Load Sophos credentials from secure storage
 */
export async function loadSophosCredentials(): Promise<SophosCredentials | null> {
  try {
    const credentials = await invoke<SophosCredentials>('load_sophos_credentials');
    return credentials;
  } catch (error) {
    console.error('Error loading Sophos credentials:', error);
    return null;
  }
}

/**
 * Save Sophos credentials to secure storage
 */
export async function saveSophosCredentials(credentials: SophosCredentials): Promise<boolean> {
  try {
    await invoke<string>('save_sophos_credentials', { credentials });
    return true;
  } catch (error) {
    console.error('Error saving Sophos credentials:', error);
    return false;
  }
}

/**
 * Get the path to the secrets file
 */
export async function getSecretsFilePath(): Promise<string> {
  try {
    return await invoke<string>('get_secrets_file_path');
  } catch (error) {
    console.error('Error getting secrets file path:', error);
    return '';
  }
}

/**
 * Get access token from Sophos Central API via Tauri command
 */
export async function getSophosAccessToken(): Promise<string | null> {
  try {
    const accessToken = await invoke<string>('get_sophos_access_token');
    return accessToken;
  } catch (error) {
    console.error('Error getting Sophos access token:', error);
    return null;
  }
}

/**
 * Fetch endpoints from Sophos Central API via Tauri command
 */
export async function fetchSophosEndpoints(accessToken: string): Promise<SophosEndpoint[]> {
  try {
    console.log('Fetching endpoints from Sophos API');
    
    const rawEndpoints = await invoke<any[]>('fetch_sophos_endpoints', {
      accessToken,
    });
    
    // Debug the first raw endpoint to understand structure
    if (rawEndpoints.length > 0) {
      const firstItem = rawEndpoints[0];
      console.log('🔍 First endpoint raw structure:', firstItem);
      console.log('🔍 Available keys:', Object.keys(firstItem));
      
      // Look for any IP-related fields
      const ipFields = Object.keys(firstItem).filter(key => 
        key.toLowerCase().includes('ip') || 
        key.toLowerCase().includes('address') ||
        key.toLowerCase().includes('network')
      );
      console.log('🔍 IP-related fields found:', ipFields);
      
             ipFields.forEach(field => {
         console.log(`🔍 Field '${field}':`, firstItem[field]);
       });
       
       // Test IP extraction logic on first item
       console.log('🔍 Testing IP extraction on first item...');
       let testIpAddresses: string[] = [];
       
       if (firstItem.ipAddresses && Array.isArray(firstItem.ipAddresses) && firstItem.ipAddresses.length > 0) {
         testIpAddresses = firstItem.ipAddresses;
         console.log('🔍 Found IPs in ipAddresses:', testIpAddresses);
       }
       else if (firstItem.ip_addresses && Array.isArray(firstItem.ip_addresses) && firstItem.ip_addresses.length > 0) {
         testIpAddresses = firstItem.ip_addresses;
         console.log('🔍 Found IPs in ip_addresses:', testIpAddresses);
       }
       else {
         const ipv4 = firstItem.ipv4Addresses && Array.isArray(firstItem.ipv4Addresses) ? firstItem.ipv4Addresses : [];
         const ipv6 = firstItem.ipv6Addresses && Array.isArray(firstItem.ipv6Addresses) ? firstItem.ipv6Addresses : [];
         const ipv4Snake = firstItem.ipv4_addresses && Array.isArray(firstItem.ipv4_addresses) ? firstItem.ipv4_addresses : [];
         const ipv6Snake = firstItem.ipv6_addresses && Array.isArray(firstItem.ipv6_addresses) ? firstItem.ipv6_addresses : [];
         testIpAddresses = [...ipv4, ...ipv6, ...ipv4Snake, ...ipv6Snake];
         console.log('🔍 Combined IPs from v4/v6 fields:', {
           ipv4,
           ipv6,
           ipv4Snake,
           ipv6Snake,
           final: testIpAddresses
         });
       }
    }

    // Transform the data to match our interface
    const endpoints = rawEndpoints.map((item: any) => {
      // Try to get IP addresses from various possible fields
      // Based on the API response, the field is "ipv4Addresses" (camelCase)
      let ipAddresses: string[] = [];
      
      // First try the main ipAddresses field (if it exists)
      if (item.ipAddresses && Array.isArray(item.ipAddresses) && item.ipAddresses.length > 0) {
        ipAddresses = item.ipAddresses;
      }
      // Try snake_case version (from Rust serialization)
      else if (item.ip_addresses && Array.isArray(item.ip_addresses) && item.ip_addresses.length > 0) {
        ipAddresses = item.ip_addresses;
      }
      // Otherwise, combine IPv4 and IPv6 addresses (camelCase from original API)
      else {
        const ipv4 = item.ipv4Addresses && Array.isArray(item.ipv4Addresses) ? item.ipv4Addresses : [];
        const ipv6 = item.ipv6Addresses && Array.isArray(item.ipv6Addresses) ? item.ipv6Addresses : [];
        // Also try snake_case versions
        const ipv4Snake = item.ipv4_addresses && Array.isArray(item.ipv4_addresses) ? item.ipv4_addresses : [];
        const ipv6Snake = item.ipv6_addresses && Array.isArray(item.ipv6_addresses) ? item.ipv6_addresses : [];
        ipAddresses = [...ipv4, ...ipv6, ...ipv4Snake, ...ipv6Snake];
      }
      
      return {
        id: item.id,
        hostname: item.hostname || 'Unknown',
        os: {
          name: item.os?.name || 'Unknown OS',
          version: item.os?.version
        },
        type: item.endpoint_type || 'computer',
        online: item.online || false,
        health: {
          overall: item.health?.overall || 'unknown'
        },
        group: {
          name: item.group?.name || 'No Group'
        },
        ipAddresses: ipAddresses,
        lastSeen: item.last_seen
      };
    });
    
    return endpoints;
  } catch (error) {
    console.error('Error fetching Sophos endpoints:', error);
    throw error;
  }
}

/**
 * Clear the cached endpoint data
 */
export async function clearSophosCache(): Promise<boolean> {
  try {
    await invoke<string>('clear_cache');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

/**
 * Main function to get all endpoint data from Sophos Central
 * Uses secure credential storage and falls back to mock data if no credentials are found
 */
export async function getSophosEndpointData(): Promise<{
  success: boolean;
  data: SophosEndpoint[];
  source: 'api' | 'mock';
  error?: string;
}> {
  // Mock data for demonstration
  const mockEndpoints: SophosEndpoint[] = [
    {
      id: '1',
      hostname: 'DESKTOP-ABC123',
      os: { name: 'Windows 11', version: '22H2' },
      type: 'computer',
      online: true,
      health: { overall: 'good' },
      group: { name: 'IT Department' },
      ipAddresses: ['192.168.1.100'],
      lastSeen: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      hostname: 'LAPTOP-XYZ789',
      os: { name: 'Windows 10', version: '21H2' },
      type: 'computer',
      online: false,
      health: { overall: 'warning' },
      group: { name: 'Sales Team' },
      ipAddresses: ['192.168.1.101'],
      lastSeen: '2024-01-14T16:45:00Z'
    },
    {
      id: '3',
      hostname: 'MACBOOK-PRO-001',
      os: { name: 'macOS', version: '14.2' },
      type: 'computer',
      online: true,
      health: { overall: 'good' },
      group: { name: 'Design Team' },
      ipAddresses: ['192.168.1.102'],
      lastSeen: '2024-01-15T11:00:00Z'
    },
    {
      id: '4',
      hostname: 'SERVER-PROD-01',
      os: { name: 'Windows Server 2022' },
      type: 'server',
      online: true,
      health: { overall: 'critical' },
      group: { name: 'Production Servers' },
      ipAddresses: ['192.168.1.50'],
      lastSeen: '2024-01-15T11:15:00Z'
    },
    {
      id: '5',
      hostname: 'UBUNTU-DEV-01',
      os: { name: 'Ubuntu', version: '22.04' },
      type: 'server',
      online: true,
      health: { overall: 'good' },
      group: { name: 'Development' },
      ipAddresses: ['192.168.1.51'],
      lastSeen: '2024-01-15T11:20:00Z'
    },
    {
      id: '6',
      hostname: 'WORKSTATION-DESIGN',
      os: { name: 'Windows 11', version: '23H2' },
      type: 'computer',
      online: true,
      health: { overall: 'good' },
      group: { name: 'Design Team' },
      ipAddresses: ['192.168.1.103'],
      lastSeen: '2024-01-15T11:25:00Z'
    },
    {
      id: '7',
      hostname: 'LAPTOP-SALES-01',
      os: { name: 'Windows 10', version: '22H2' },
      type: 'computer',
      online: false,
      health: { overall: 'warning' },
      group: { name: 'Sales Team' },
      ipAddresses: ['192.168.1.104'],
      lastSeen: '2024-01-13T14:20:00Z'
    },
    {
      id: '8',
      hostname: 'SERVER-DB-01',
      os: { name: 'Windows Server 2019' },
      type: 'server',
      online: true,
      health: { overall: 'good' },
      group: { name: 'Production Servers' },
      ipAddresses: ['192.168.1.52'],
      lastSeen: '2024-01-15T11:30:00Z'
    },
    {
      id: '9',
      hostname: 'LAPTOP-HR-01',
      os: { name: 'Windows 11', version: '23H2' },
      type: 'computer',
      online: true,
      health: { overall: 'good' },
      group: { name: 'HR Department' },
      ipAddresses: ['192.168.1.105'],
      lastSeen: '2024-01-15T11:35:00Z'
    },
    {
      id: '10',
      hostname: 'IPHONE-SALES-02',
      os: { name: 'iOS', version: '17.2' },
      type: 'mobile',
      online: true,
      health: { overall: 'good' },
      group: { name: 'Sales Team' },
      ipAddresses: ['192.168.1.106'],
      lastSeen: '2024-01-15T11:40:00Z'
    }
  ];

  // Check if we should force mock data
  const forceMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
  if (forceMockData) {
    console.log('Using mock data (forced by USE_MOCK_DATA=true)');
    return {
      success: true,
      data: mockEndpoints,
      source: 'mock'
    };
  }

  try {
    console.log('Attempting to fetch data from Sophos Central API...');
    
    // Check if credentials are available
    const credentials = await loadSophosCredentials();
    if (!credentials) {
      console.log('No Sophos API credentials found, using mock data');
      return {
        success: true,
        data: mockEndpoints,
        source: 'mock'
      };
    }

    // Get access token
    const accessToken = await getSophosAccessToken();
    if (!accessToken) {
      throw new Error('Failed to obtain access token from Sophos Central');
    }

    console.log('Successfully authenticated with Sophos Central');

    // Fetch real data
    const endpoints = await fetchSophosEndpoints(accessToken);
    
    console.log(`Successfully fetched ${endpoints.length} endpoints from Sophos Central`);
    
    return {
      success: true,
      data: endpoints,
      source: 'api'
    };
  } catch (error) {
    console.error('Failed to fetch from Sophos API, falling back to mock data:', error);
    
    // Return mock data as fallback
    return {
      success: false,
      data: mockEndpoints,
      source: 'mock',
      error: error instanceof Error ? error.message : 'Unknown error occurred while fetching from Sophos API'
    };
  }
}

export type { SophosCredentials, SophosEndpoint }; 