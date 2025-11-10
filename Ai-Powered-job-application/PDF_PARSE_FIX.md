# PDF-Parse Error Fix

## Issue
The server was crashing with error:
```
Error: ENOENT: no such file or directory, open 'D:\project\ai-powered-job\Ai-Powered-job-application\server\test\data\05-versions-space.pdf'
```

## Root Cause
The `pdf-parse` npm package has a debug mode that runs test code when the module is loaded directly (when `module.parent` is falsy). This test code tries to access a test PDF file that doesn't exist in our project.

## Solution
Implemented **lazy loading** for `pdf-parse`:
- `pdf-parse` is no longer loaded at the top level
- It's only loaded when `parsePDF()` method is actually called
- This prevents the test code from running during module initialization

## Changes Made

### File: `server/services/resumeParser.js`

**Before:**
```javascript
const pdfParse = require('pdf-parse'); // Loaded immediately
```

**After:**
```javascript
// Lazy load pdf-parse to avoid test file access issues
let pdfParse = null;

async parsePDF(filePathOrBuffer, mimeType) {
  // Lazy load pdf-parse only when needed
  if (!pdfParse) {
    pdfParse = require('pdf-parse');
  }
  // ... rest of the code
}
```

## Benefits
1. ✅ Prevents test code from running on module load
2. ✅ Only loads pdf-parse when actually needed
3. ✅ Faster server startup time
4. ✅ No more ENOENT errors

## Testing
- ✅ Module loads successfully
- ✅ pdf-parse loads only when parsePDF is called
- ✅ No test file access errors

## Status
✅ **FIXED** - The error should no longer occur when the server starts.

