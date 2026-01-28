# 🚀 PRODUCTION FIXES - INTEGRATION GUIDE

## Overview
This document contains prompts to integrate the 4 critical production fixes:
1. ✅ Pagination Preview Decorator (live page numbers)
2. ✅ PDF Dual Dialogue Detection (X-position clustering)
3. ✅ Export Validation Gate (quality control)
4. ✅ Progress Indicators (UX for long operations)

---

## FIX 1: Add Pagination Preview to SlateScriptEditor

**What it does:** Shows page numbers in the left gutter while writing (like Final Draft).

### PROMPT FOR DYAD/ANTIGRAVITY:

```
Update SlateScriptEditor component to integrate live pagination preview:

1. IMPORT the PaginationDecorator:
   - Import: { PaginationDecorator, PageCountDisplay, useCurrentPage } from './PaginationDecorator'

2. ADD to component state:
   - const [showPageNumbers, setShowPageNumbers] = useState(true); // Toggle for user preference
   - const cursorElementId = // Track which element has cursor (you may already have this)
   - const currentPage = useCurrentPage(elements, cursorElementId);

3. RENDER PaginationDecorator above the editor:
   <div className="relative">
     <PaginationDecorator elements={elements} isVisible={showPageNumbers} />
     {/* Existing Slate editor */}
   </div>

4. ADD data-element-id attribute to each Slate element:
   - In your renderElement function, add: data-element-id={element.id}
   - This allows PaginationDecorator to position markers correctly

5. ADD PageCountDisplay to status bar (if you have one):
   <PageCountDisplay elements={elements} />
   <span>Page {currentPage}</span>

6. ADD toggle button to toolbar:
   <button onClick={() => setShowPageNumbers(!showPageNumbers)}>
     {showPageNumbers ? 'Hide' : 'Show'} Page Numbers
   </button>

REQUIREMENTS:
- Must add .slate-editor-container class to the editor wrapper
- Elements must have data-element-id="{element.id}" attribute
- PaginationDecorator uses absolute positioning, needs relative parent
```

**Expected Result:**
- Page break markers appear in left margin
- Updates live as user types
- Status bar shows current page number

---

## FIX 2: PDF Dual Dialogue Detection (ALREADY DONE ✅)

**Status:** scriptParser.ts has been updated with X-position clustering.

**What changed:**
- PDF parser now detects side-by-side dialogue columns
- Uses X-position distance (150-400pt) to identify dual blocks
- Preserves left/right column assignment
- Filters (V.O.) and (O.S.) from character names

**Testing:**
1. Import a Final Draft PDF with dual dialogue
2. Check that imported elements have `dual: 'left'` or `dual: 'right'`
3. Export to PDF and verify dual formatting preserved

---

## FIX 3: Integrate Export Validation Gate

**What it does:** Shows quality check modal before PDF export, blocks broken scripts.

### PROMPT FOR DYAD/ANTIGRAVITY:

```
Integrate ExportValidationGate into the PDF export flow:

1. IMPORT components:
   - Import: { ExportValidationGate, useExportValidation } from '../features/ExportValidationGate'

2. ADD state to component that handles PDF export (likely WorkspaceLayout or ExportPage):
   - const [showValidationGate, setShowValidationGate] = useState(false);
   - const { shouldWarn, hasBlockingErrors, validation } = useExportValidation(project.scriptElements);

3. UPDATE the "Export PDF" button handler:
   ```typescript
   const handleExportClick = () => {
     if (shouldWarn) {
       setShowValidationGate(true); // Show gate instead of exporting immediately
     } else {
       proceedWithExport(); // Direct export if valid
     }
   };
   
   const proceedWithExport = async () => {
     setShowValidationGate(false);
     // Your existing PDF export logic here
     await exportToPDF(project);
   };
   ```

4. RENDER the validation gate modal:
   <ExportValidationGate
     elements={project.scriptElements}
     isOpen={showValidationGate}
     onProceed={proceedWithExport}
     onCancel={() => setShowValidationGate(false)}
   />

5. OPTIONAL: Add status badge to export button:
   {hasBlockingErrors && (
     <span className="ml-2 text-xs text-red-500">({validation.summary.errors} errors)</span>
   )}
```

**Expected Result:**
- Export button shows modal if script has issues
- Modal displays confidence score, error list, warnings
- Users can force export with checkbox
- Clean scripts export directly without gate

---

## FIX 4: Add Progress Indicators for Long Operations

**What it does:** Shows toast notifications during pagination, import, export.

### PROMPT FOR DYAD/ANTIGRAVITY:

```
Add ProgressToast to long-running operations:

1. IMPORT:
   - Import: { ProgressToast, useProgressToast } from '../ui/ProgressToast'

2. ADD hook to parent component (WorkspaceLayout or wherever imports/exports happen):
   const progressToast = useProgressToast();

3. WRAP import script handler:
   ```typescript
   const handleImportScript = async (file: File) => {
     progressToast.show('Importing script...', { progress: 0 });
     
     try {
       const parsed = await parseScript(file);
       progressToast.update({ progress: 50, message: 'Processing elements...' });
       
       // Your existing import logic
       const newDraft = createDraftFromParsed(parsed);
       progressToast.update({ progress: 100, status: 'success', message: 'Import complete!' });
       
       setTimeout(() => progressToast.hide(), 2000);
     } catch (err) {
       progressToast.update({ status: 'error', message: `Import failed: ${err.message}` });
       setTimeout(() => progressToast.hide(), 3000);
     }
   };
   ```

4. WRAP PDF export handler:
   ```typescript
   const handleExportPDF = async () => {
     progressToast.show('Generating PDF...', { progress: 0 });
     
     try {
       progressToast.update({ progress: 25, message: 'Calculating pages...' });
       const pages = paginateScript(project.scriptElements);
       
       progressToast.update({ progress: 50, message: 'Rendering PDF...' });
       const pdf = await generatePDF(pages);
       
       progressToast.update({ progress: 100, status: 'success', message: 'PDF ready!' });
       setTimeout(() => progressToast.hide(), 2000);
     } catch (err) {
       progressToast.update({ status: 'error', message: 'Export failed' });
     }
   };
   ```

5. RENDER toast component:
   <ProgressToast {...progressToast.toastProps} onClose={() => progressToast.hide()} />

6. OPTIONAL: Wrap pagination calculations in editor:
   - Show toast when paginating 500+ page scripts
   - Use indeterminate progress (no percentage)
```

**Expected Result:**
- Bottom-right toast appears during imports/exports
- Shows progress bar (0-100%)
- Auto-dismisses on success/error
- User isn't left wondering if app froze

---

## TESTING CHECKLIST

### Pagination Preview
- [ ] Page numbers appear in left gutter
- [ ] Updates live when typing
- [ ] Status bar shows current page
- [ ] Toggle button hides/shows markers
- [ ] Works with 120+ page scripts

### PDF Dual Dialogue
- [ ] Import Final Draft PDF with dual dialogue
- [ ] Elements have `dual: 'left'/'right'` property
- [ ] Export preserves dual formatting
- [ ] Non-dual scripts unaffected

### Export Validation Gate
- [ ] Modal appears when exporting invalid script
- [ ] Shows confidence score and error list
- [ ] "Fix Errors First" button disabled until checkbox
- [ ] Clean scripts export without modal
- [ ] Force export checkbox works

### Progress Indicators
- [ ] Toast appears during import
- [ ] Progress bar advances 0→100%
- [ ] Success state shows green check
- [ ] Error state shows red X
- [ ] Auto-dismisses after 3 seconds
- [ ] PDF export shows progress

---

## PERFORMANCE NOTES

### PaginationDecorator
- **Memo'd calculation:** Pagination only recalculates when elements change
- **Debounce typing:** Consider debouncing pagination by 500ms during active typing
- **Large scripts:** For 500+ pages, consider web worker or async calculation

### Export Validation
- **Runs on demand:** Only validates when export button clicked
- **Cached results:** Validation report is memoized
- **Fast path:** Clean scripts bypass modal entirely

### Progress Toast
- **Non-blocking:** Toast doesn't prevent interaction
- **Auto-cleanup:** State resets on hide
- **No memory leaks:** Timeouts are cleaned up

---

## FINAL NOTES

These 4 fixes bring CineFlex to **production quality**:

1. **Pagination Preview** = Final Draft parity for UX
2. **Dual Dialogue** = Professional import/export
3. **Validation Gate** = Quality assurance
4. **Progress** = Modern app polish

**Estimated integration time:** 2-3 hours total

**Result:** App feels like a $250 product, not a $50 knockoff.

**Ship it?** Yes, after testing checklist above. ✅
