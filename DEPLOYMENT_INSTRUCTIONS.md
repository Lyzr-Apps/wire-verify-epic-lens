# Wire Verification Command Center - Deployment Instructions

## Application Overview

The Wire Verification Command Center is a light-themed dashboard application for processing and verifying wire transfer documents using AI agents.

## Architecture

- **Light Theme Design**: Black header, white cards, gray backgrounds (bg-gray-50, border-gray-200)
- **Dashboard-First**: Shows list of previously processed wire packets
- **Modal Upload**: Upload dialog triggered by button (not full-screen landing page)
- **Empty State**: Shows friendly message when no verifications exist
- **Detail View**: Full verification results with validation rules, compliance checks, and recommendations

## Current Status

✅ **COMPLETED** - All components built and tested:
- Wire Verification Manager Agent (ID: `6980b3bf066158e77fdea70b`)
- Multi-Modal OCR & Extraction Agent (ID: `6980b377066158e77fdea689`)
- Validation & Verification Agent (ID: `6980b39ad36f070193f61fc5`)
- Complete UI with light theme
- Response schemas validated

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file contains:

```bash
VITE_LYZR_API_KEY=your_api_key_here
```

### 2. Clear Browser Cache

**IMPORTANT**: If you see errors like "UploadScreen is not defined", clear your browser cache:

**Chrome/Edge:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

**Firefox:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cache"
3. Click "Clear Now"
4. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 3. Build and Run

```bash
# Install dependencies (if not already done)
npm install

# Build the application
npm run build

# Run in development mode
npm run dev

# Or run production build
npm run preview
```

### 4. Access the Application

Open your browser to: `http://localhost:5173` (or the port shown in your terminal)

## User Flow

### First Time (Empty State)
1. See empty state with "No Verifications Yet" message
2. Click "Start Verification" button
3. Upload modal opens

### Upload Process
1. Drag and drop files or click "Browse Files"
2. Supported formats: PDF, PNG, JPG, TIFF
3. Click "Process Packet"
4. Watch processing steps: Extracting → Validating → Complete

### Results View
1. Dashboard shows list of processed packets
2. Click any packet to view full details
3. Detail view shows:
   - Overall status (PASS/FAIL/FLAG)
   - Validation rules with expand/collapse
   - Compliance checks
   - Extracted data table
   - Final decision with blocking issues/warnings
   - Clerk notes section
4. Click "Back to Dashboard" to return to list

## Response Structure

The agent returns a structured JSON response with:

```typescript
{
  status: "success",
  result: {
    workflow_status: "completed",
    extraction_results: {
      document_type: "wire_transfer_packet",
      extracted_data: [/* array of extracted documents */]
    },
    validation_results: {
      overall_validation_status: "PASS" | "FAIL" | "FLAG",
      validation_summary: { total_rules_checked, passed, failed, flagged },
      validation_rules: [/* array of validation rules */],
      compliance_checks: { /* signature, amount, account checks */ },
      recommendations: [/* array of recommendations */]
    },
    final_decision: {
      approved: boolean,
      requires_manual_review: boolean,
      blocking_issues: string[],
      warnings: string[]
    },
    processing_summary: {
      total_documents_processed: number,
      extraction_confidence: number,
      validation_pass_rate: number,
      critical_issues_count: number
    }
  },
  metadata: { /* agent metadata */ }
}
```

## Troubleshooting

### "UploadScreen is not defined" Error
- **Cause**: Browser cache from previous version
- **Fix**: Clear browser cache and hard refresh (see Step 2 above)

### "Invalid response structure from agent" Error
- **Cause**: Agent returned unexpected format
- **Fix**: Check console logs for actual response. The agent should return the structure shown above.
- **Verify**: Agent ID is correct: `6980b3bf066158e77fdea70b`

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Agent Not Responding
- Verify `VITE_LYZR_API_KEY` is set correctly
- Check network connectivity
- Review agent logs in browser DevTools Console

## Files Structure

```
/app/project/
├── src/
│   ├── pages/
│   │   └── Home.tsx          # Main application component
│   ├── utils/
│   │   └── aiAgent.ts        # Agent API wrapper
│   └── components/ui/        # Shadcn components
├── workflow.json             # Agent workflow configuration
├── response_schemas/         # Agent response schemas
│   └── test_results/         # Test responses from agents
└── TASK_COMPLETED           # Completion marker
```

## Design System

### Colors
- **Background**: `bg-gray-50` (light gray)
- **Cards**: `bg-white`, `border-gray-200`
- **Text**: `text-gray-900` (dark), `text-gray-600` (medium), `text-gray-500` (light)
- **Header**: `bg-black`, `text-white`
- **Primary Button**: `bg-black hover:bg-gray-800`
- **Success**: `emerald-600`
- **Error**: `red-600`
- **Warning**: `amber-600`

### Components
- Empty state with `FolderOpen` icon
- Modal-based upload dialog
- Processing screen overlay
- Collapsible validation rule cards
- Status badges with icons
- Error toast notifications

## Next Steps

After successful deployment, you can:
1. Upload test wire packets
2. Review validation results
3. Add clerk notes
4. Export or submit verified packets

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify all environment variables are set
3. Ensure API key is valid and has proper permissions
4. Review agent response structure in network tab
