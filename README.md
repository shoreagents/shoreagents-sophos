# Sophos Central Dashboard

A modern, responsive dashboard built with Next.js and Tailwind CSS to visualize and manage Sophos Central endpoint data. This Tauri-based desktop application provides a comprehensive view of your organization's endpoint security status.

## Features

- 📊 **Real-time Dashboard**: Overview of all endpoints with key metrics
- 🖥️ **Endpoint Inventory**: Detailed table view with filtering and search
- 📈 **Statistics**: OS distribution, endpoint types, groups, and health status
- 🔍 **Advanced Filtering**: Filter by status (online/offline) and health conditions
- 🎨 **Modern UI**: Built with Tailwind CSS for a clean, responsive design
- 🖥️ **Desktop App**: Runs as a native desktop application using Tauri
- 🔄 **Live Data**: Integrates with Sophos Central API for real-time information

## Dashboard Components

### Overview Cards
- **Total Endpoints**: Complete count of managed devices
- **Online Status**: Number of currently online vs offline endpoints
- **Health Warnings**: Count of endpoints with health issues

### Statistics Panels
- **Operating Systems**: Breakdown by Windows, macOS, Linux versions
- **Endpoint Types**: Computers, servers, and other device types
- **Groups**: Distribution across organizational groups

### Endpoint Table
- Hostname, OS version, type, status, health, group, and IP address
- Real-time search across all fields
- Filter by online status and health conditions
- Sortable columns for easy organization

## Prerequisites

- Node.js 18 or later
- Rust (for Tauri development)
- Sophos Central API credentials (optional - uses mock data by default)

## Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd shoreagents-sophos
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Sophos API (Optional):**
```bash
cp env.example .env.local
```
Edit `.env.local` with your Sophos Central API credentials:
```env
SOPHOS_CLIENT_ID=your_client_id_here
SOPHOS_CLIENT_SECRET=your_client_secret_here
SOPHOS_TENANT_ID=your_tenant_id_here
```

## Usage

### Development Mode

Start the development server:
```bash
npm run tauri
```

This will:
- Start the Next.js development server on `http://localhost:3000`
- Launch the Tauri desktop application
- Enable hot reload for development

### Web Development Only

To run just the web interface:
```bash
npm run dev
```

### Building for Production

Build the desktop application:
```bash
npm run tauri:build
```

## API Integration

### Mock Data Mode (Default)
When Sophos API credentials are not configured, the dashboard uses mock data to demonstrate functionality.

### Live Data Mode
Configure your Sophos Central API credentials in `.env.local` to fetch real endpoint data:

1. **Obtain API Credentials:**
   - Log into Sophos Central
   - Go to System Settings > API Credentials
   - Create a new API credential with appropriate permissions

2. **Configure Environment Variables:**
   - Copy `env.example` to `.env.local`
   - Fill in your actual credentials

3. **API Endpoint:**
   The dashboard fetches data from `/api/sophos/endpoints` which:
   - Authenticates with Sophos Central using OAuth2
   - Retrieves endpoint inventory data
   - Falls back to mock data if API calls fail

## Project Structure

```
src/
├── app/
│   ├── api/sophos/endpoints/    # API route for Sophos data
│   │   └── route.ts
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main dashboard component
├── src-tauri/                   # Tauri configuration
│   ├── src/                     # Rust backend code
│   └── tauri.conf.json          # Tauri configuration
└── public/                      # Static assets
```

## Technologies Used

- **Frontend Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Heroicons for icons
- **Desktop Framework**: Tauri 2.0
- **Language**: TypeScript
- **API Integration**: Sophos Central REST API

## Data Model

The dashboard handles endpoint data with the following structure:

```typescript
interface Endpoint {
  id: string;
  hostname: string;
  os: {
    name: string;
    version?: string;
  };
  type: string;          // 'computer', 'server', etc.
  online: boolean;
  health: {
    overall: string;     // 'good', 'warning', 'critical'
  };
  group: {
    name: string;
  };
  ipAddresses: string[];
  lastSeen?: string;
}
```

## Security Considerations

- API credentials are stored in environment variables
- No sensitive data is logged to console
- CORS policies are respected for API calls
- Mock data is used when credentials are not available

## Troubleshooting

### Common Issues

1. **Tauri won't start:**
   - Ensure Rust is installed: `rustup --version`
   - Try rebuilding: `npm run tauri:build`

2. **API authentication fails:**
   - Verify credentials in `.env.local`
   - Check Sophos Central API permissions
   - Review console logs for error details

3. **Build errors:**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Ensure all dependencies are installed

### Mock Data
If you encounter API issues, you can force mock data mode by adding `?mock=true` to the API endpoint or setting `USE_MOCK_DATA=true` in your environment.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Sophos Central API documentation
- Create an issue in this repository
