# Sophos Central API Setup Guide

This guide walks you through connecting your dashboard to real Sophos Central data.

## Prerequisites

- Access to a Sophos Central tenant with administrator privileges
- API permissions enabled in your Sophos Central account

## Step 1: Get Sophos Central API Credentials

### 1.1 Access API Token Management
1. Log into your **Sophos Central** console
2. Navigate to **Settings** → **API Token Management**
3. Click **"Add API Token"**

### 1.2 Configure API Token
1. **Name**: Give it a descriptive name (e.g., "Dashboard Integration")
2. **Permissions**: Select the following permissions:
   - `Endpoint.Read` - Read endpoint data
   - `Directory.Read` - Read directory/group information (optional)
3. Click **"Add"**

### 1.3 Save Credentials
After creating the token, you'll get:
- **Client ID** (starts with a UUID format)
- **Client Secret** (long random string)
- **Tenant ID** (UUID format, also visible in your Sophos Central URL)

⚠️ **Important**: Save these immediately - the Client Secret is only shown once!

## Step 2: Configure Environment Variables

### 2.1 Copy Environment File
```bash
cp env.example .env.local
```

### 2.2 Edit `.env.local`
```env
# Your Sophos Central API credentials
SOPHOS_CLIENT_ID=12345678-1234-1234-1234-123456789abc
SOPHOS_CLIENT_SECRET=your_very_long_client_secret_string_here
SOPHOS_TENANT_ID=87654321-4321-4321-4321-abcdef123456

# Optional: Your Sophos region (check your Sophos Central URL)
# us01 = United States (default)
# eu01 = Europe
# ap01 = Asia Pacific
SOPHOS_REGION=us01

# Optional: Force mock data for testing
USE_MOCK_DATA=false
```

### 2.3 Determine Your Region
Check your Sophos Central URL to determine your region:
- `https://cloud.sophos.com/manage/...` → **us01**
- `https://eu.cloud.sophos.com/manage/...` → **eu01** 
- `https://ap.cloud.sophos.com/manage/...` → **ap01**

## Step 3: Test the Connection

### 3.1 Start the Application
```bash
npm run tauri
```

### 3.2 Check Data Source
In the dashboard header, you should see:
- 🔗 **Sophos API** (green badge) = Successfully connected to real data
- 📋 **Mock Data** (yellow badge) = Using sample data (check your credentials)

### 3.3 Console Logs
Open browser developer tools (F12) and check the console for messages:
- ✅ `"Successfully authenticated with Sophos Central"`
- ✅ `"Successfully fetched X endpoints from Sophos Central"`
- ❌ `"No Sophos API credentials found, using mock data"`
- ❌ `"Failed to fetch from Sophos API, falling back to mock data"`

## Step 4: Troubleshooting

### Common Issues

#### 4.1 "Authentication failed" Error
- **Cause**: Invalid Client ID or Client Secret
- **Solution**: Double-check your credentials in `.env.local`

#### 4.2 "Failed to fetch endpoints" Error  
- **Cause**: Wrong region or insufficient permissions
- **Solution**: 
  - Verify your region setting matches your Sophos Central URL
  - Ensure your API token has `Endpoint.Read` permission

#### 4.3 "No Sophos API credentials found"
- **Cause**: Environment variables not loaded
- **Solution**: 
  - Ensure `.env.local` exists in the project root
  - Restart the development server after creating/editing `.env.local`

#### 4.4 Empty Endpoint List
- **Cause**: No endpoints in your Sophos Central tenant, or they're filtered out
- **Solution**: 
  - Check if you have endpoints managed in Sophos Central
  - Verify the API token has access to all required groups

### Debug Mode
To force mock data for testing, set:
```env
USE_MOCK_DATA=true
```

## Step 5: Data Mapping

Your real Sophos data will automatically map to the dashboard. The API returns:

- **Hostname**: Device name
- **OS**: Operating system and version
- **Type**: computer, server, mobile
- **Online Status**: Current connection status
- **Health**: Overall endpoint health (good, warning, critical)
- **Group**: Sophos Central group assignment
- **IP Addresses**: Current IP addresses
- **Last Seen**: Last communication timestamp

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit `.env.local`** to version control
2. **Rotate API tokens** regularly (recommended: every 90 days)
3. **Use least-privilege principle** - only grant necessary permissions
4. **Monitor API usage** in Sophos Central for unusual activity

## API Rate Limits

Sophos Central API has rate limits:
- **Standard**: 10 requests per minute per token
- **Premium**: Higher limits available

The dashboard automatically handles rate limiting with proper error handling and fallback to mock data.

---

**Need Help?** 
- Check the [Sophos Central API Documentation](https://developer.sophos.com/)
- Verify your API token status in Sophos Central
- Check browser console for detailed error messages 