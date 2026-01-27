# 📚 PHASE 3: VALIDATION UI INTEGRATION GUIDE

## ✅ What We Built

**Phase 3 adds user-facing validation UI:**
1. `ValidationReportCard.tsx` - Shows validation status after import
2. `useScriptValidation.ts` - Hook for managing validation state + auto-fix

---

## 🛠️ Components

### **1. ValidationReportCard**

**Location:** `src/components/features/ValidationReportCard.tsx`

**What it does:**
- Shows confidence score (0-100%)
- Lists errors/warnings with severity icons
- Displays auto-fix button when issues are fixable
- Color-coded status (green = success, yellow = warnings, red = errors)

**Props:**
```typescript
interface ValidationReportCardProps {
    report: ValidationReport;          // From parseScript()
    onAutoFix?: () => void;           // Callback when user clicks auto-fix
    onDismiss?: () => void;           // Callback to hide card
    autoFixAvailable?: boolean;       // Show auto-fix button?
    isLoading?: boolean;              // Show loading state
}
```

---

### **2. useScriptValidation Hook**

**Location:** `src/hooks/useScriptValidation.ts`

**What it does:**
- Manages validation state
- Provides `runAutoFix()` function that re-parses with autoFix enabled
- Tracks auto-fix availability and loading state

**API:**
```typescript
const {
    validationReport,    // Current validation report
    autoFixAvailable,    // Can auto-fix be run?
    isAutoFixing,        // Is auto-fix in progress?
    runAutoFix,          // Function to run auto-fix
    clearValidation      // Clear validation state
} = useScriptValidation();
```

---

## 📦 Integration Steps

### **Step 1: Import Components**

In your script import page/component:

```typescript
import { ValidationReportCard } from '../components/features/ValidationReportCard';
import { useScriptValidation } from '../hooks/useScriptValidation';
import { parseScript } from '../services/scriptParser';
```

---

### **Step 2: Add Validation Hook**

```typescript
const MyScriptImportPage = () => {
    const [elements, setElements] = useState<ScriptElement[]>([]);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    
    // Add validation hook
    const { 
        validationReport, 
        autoFixAvailable, 
        isAutoFixing, 
        runAutoFix, 
        clearValidation 
    } = useScriptValidation();
    
    // ... rest of component
};
```

---

### **Step 3: Update Script Import Handler**

**BEFORE (Phase 2):**
```typescript
const handleFileImport = async (file: File) => {
    const result = await parseScript(file);
    setElements(result.elements);
    // Validation was ignored!
};
```

**AFTER (Phase 3):**
```typescript
const handleFileImport = async (file: File) => {
    // Save file reference for auto-fix later
    setCurrentFile(file);
    
    // Parse without auto-fix initially (let user see issues)
    const result = await parseScript(file, { autoFix: false });
    
    // Update script elements
    setElements(result.elements);
    
    // Update validation state (triggers ValidationReportCard to show)
    setValidationReport(result.validationReport);
    setAutoFixAvailable(result.autoFixAvailable || false);
    
    console.log('Script imported:', {
        confidence: result.validationReport.confidence,
        errors: result.validationReport.summary.errors,
        warnings: result.validationReport.summary.warnings
    });
};
```

---

### **Step 4: Add Auto-Fix Handler**

```typescript
const handleAutoFix = async () => {
    if (!currentFile) return;
    
    // Run auto-fix (re-parses script with autoFix: true)
    const fixed = await runAutoFix(currentFile);
    
    if (fixed) {
        // Update script with fixed elements
        setElements(fixed.elements);
        
        // Show success message
        console.log('Auto-fix complete! New confidence:', fixed.report.confidence);
        
        // Optional: Show toast notification
        // toast.success('Script cleaned up successfully!');
    }
};
```

---

### **Step 5: Render ValidationReportCard**

Add the card **below your import button or above the script editor**:

```typescript
return (
    <div className="script-import-page">
        {/* Your existing import UI */}
        <FileInput onFileSelect={handleFileImport} />
        
        {/* PHASE 3: Validation Report Card */}
        {validationReport && (
            <div className="my-6">
                <ValidationReportCard
                    report={validationReport}
                    onAutoFix={handleAutoFix}
                    onDismiss={clearValidation}
                    autoFixAvailable={autoFixAvailable}
                    isLoading={isAutoFixing}
                />
            </div>
        )}
        
        {/* Your existing script editor */}
        <ScriptEditor elements={elements} />
    </div>
);
```

---

## 🎯 Complete Example

```typescript
import React, { useState } from 'react';
import { ValidationReportCard } from '../components/features/ValidationReportCard';
import { useScriptValidation } from '../hooks/useScriptValidation';
import { parseScript } from '../services/scriptParser';
import { ScriptElement } from '../types';

export const ScriptImportPage = () => {
    // Script state
    const [elements, setElements] = useState<ScriptElement[]>([]);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    
    // Validation hook
    const { 
        validationReport, 
        autoFixAvailable, 
        isAutoFixing, 
        runAutoFix, 
        clearValidation 
    } = useScriptValidation();
    
    // Import handler
    const handleFileImport = async (file: File) => {
        setIsImporting(true);
        setCurrentFile(file);
        
        try {
            // Parse without auto-fix (show user what needs fixing)
            const result = await parseScript(file, { autoFix: false });
            
            // Update elements
            setElements(result.elements);
            
            // Update validation (from parseResult helper)
            updateValidationFromParse(
                result,
                (report) => setValidationReport(report),
                (available) => setAutoFixAvailable(available)
            );
            
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setIsImporting(false);
        }
    };
    
    // Auto-fix handler
    const handleAutoFix = async () => {
        if (!currentFile) return;
        
        const fixed = await runAutoFix(currentFile);
        
        if (fixed) {
            setElements(fixed.elements);
            // Optional: toast.success('Script fixed!');
        }
    };
    
    return (
        <div className="p-6 space-y-6">
            <h1>Import Script</h1>
            
            {/* File Input */}
            <input 
                type="file" 
                onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
                accept=".fountain,.fdx,.pdf,.txt"
                disabled={isImporting}
            />
            
            {/* 🌟 PHASE 3: Validation Report */}
            {validationReport && (
                <ValidationReportCard
                    report={validationReport}
                    onAutoFix={handleAutoFix}
                    onDismiss={clearValidation}
                    autoFixAvailable={autoFixAvailable}
                    isLoading={isAutoFixing}
                />
            )}
            
            {/* Script Preview */}
            {elements.length > 0 && (
                <div className="border rounded p-4">
                    <h2>Script Elements ({elements.length})</h2>
                    {/* Render elements */}
                </div>
            )}
        </div>
    );
};
```

---

## 🧪 Testing

### **Test Scenario 1: Clean Script**

1. Import a perfectly formatted .fountain file
2. **Expected:** Green card shows "100% confidence, Production Ready"
3. No auto-fix button (nothing to fix)

---

### **Test Scenario 2: Script with Warnings**

1. Import script with lowercase character names
2. **Expected:** Yellow card shows "95% confidence, 3 warnings"
3. Auto-fix button appears
4. Click auto-fix → Confidence jumps to 100%

---

### **Test Scenario 3: Script with Errors**

1. Import badly formatted script
2. **Expected:** Red card shows "70% confidence, 5 errors"
3. Auto-fix button available
4. Click auto-fix → Errors reduced to 0-1

---

## 🔧 Where to Add This

**Option A: Project Library (when importing new project)**
- Location: `src/components/features/ProjectLibrary.tsx`
- Show validation after user imports script for new project

**Option B: Script Editor (when importing/replacing script)**
- Location: `src/components/features/ScriptPage.tsx` or similar
- Show validation when user replaces current script

**Option C: Both**
- Show validation anywhere `parseScript()` is called

---

## ✅ Phase 3 Complete When:

- [ ] ValidationReportCard renders after script import
- [ ] Confidence score displays correctly (0-100%)
- [ ] Errors/warnings list shows with icons
- [ ] Auto-fix button appears when issues are fixable
- [ ] Clicking auto-fix re-parses and updates script
- [ ] Confidence score improves after auto-fix
- [ ] Card can be dismissed

---

## 🚀 Next Steps: Phase 4

Phase 4 will add **export validation** that runs before exporting to PDF/FDX.
