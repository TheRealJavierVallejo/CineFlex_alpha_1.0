# 🤖 PHASE 3: AGENT INTEGRATION PROMPTS

**Copy these prompts to your Dyad/Antigravity agent to integrate validation UI.**

---

## 📝 PROMPT 1: Find Script Import Location

```
Find where scripts are imported/uploaded in the CineFlex codebase.

Look for:
1. Components that use `parseScript()` from `src/services/scriptParser.ts`
2. File upload handlers (input[type="file"] or similar)
3. Functions that handle .fountain, .fdx, or .pdf imports

List all locations where script parsing happens and show the relevant code.
```

**Expected Output:** Agent will show you `ProjectLibrary.tsx` or similar files where scripts are imported.

---

## 📝 PROMPT 2: Integrate ValidationReportCard

```
Integrate the Phase 3 validation UI into the script import flow.

Components to use:
- ValidationReportCard from `src/components/features/ValidationReportCard.tsx`
- useScriptValidation hook from `src/hooks/useScriptValidation.ts`

Instructions:

1. **In the script import component** (likely ProjectLibrary.tsx or ScriptPage.tsx):

   a. Import the validation components:
   ```typescript
   import { ValidationReportCard } from '../components/features/ValidationReportCard';
   import { useScriptValidation } from '../hooks/useScriptValidation';
   ```

   b. Add the validation hook at the top of the component:
   ```typescript
   const { validationReport, autoFixAvailable, isAutoFixing, runAutoFix, clearValidation } = useScriptValidation();
   ```

   c. Add state to track the current file:
   ```typescript
   const [currentFile, setCurrentFile] = useState<File | null>(null);
   ```

2. **Update the script import handler**:

   Find the function that calls `parseScript()` and modify it:

   ```typescript
   const handleScriptImport = async (file: File) => {
       setCurrentFile(file); // Save for auto-fix
       
       const result = await parseScript(file, { autoFix: false });
       
       // Existing code to set elements
       setElements(result.elements);
       
       // NEW: Update validation state
       setValidationReport(result.validationReport);
       setAutoFixAvailable(result.autoFixAvailable || false);
   };
   ```

3. **Add auto-fix handler**:

   ```typescript
   const handleAutoFix = async () => {
       if (!currentFile) return;
       
       const fixed = await runAutoFix(currentFile);
       if (fixed) {
           setElements(fixed.elements);
       }
   };
   ```

4. **Render ValidationReportCard**:

   Add this BELOW the file input and ABOVE the script editor:

   ```typescript
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
   ```

Do NOT modify:
- ValidationReportCard component itself
- useScriptValidation hook
- parseScript service

Only integrate these existing components into the import flow.
```

---

## 📝 PROMPT 3: Test Integration

```
Create a simple test page to verify Phase 3 validation UI works.

Create file: `src/pages/TestValidationUI.tsx`

```typescript
import React, { useState } from 'react';
import { ValidationReportCard } from '../components/features/ValidationReportCard';
import { useScriptValidation } from '../hooks/useScriptValidation';
import { parseScript } from '../services/scriptParser';
import { ScriptElement } from '../types';

export const TestValidationUI = () => {
    const [elements, setElements] = useState<ScriptElement[]>([]);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    
    const { validationReport, autoFixAvailable, isAutoFixing, runAutoFix, clearValidation } = useScriptValidation();
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setCurrentFile(file);
        
        try {
            const result = await parseScript(file, { autoFix: false });
            setElements(result.elements);
            
            // Trigger validation UI
            setValidationReport(result.validationReport);
            setAutoFixAvailable(result.autoFixAvailable || false);
        } catch (error) {
            console.error('Parse error:', error);
        }
    };
    
    const handleAutoFix = async () => {
        if (!currentFile) return;
        const fixed = await runAutoFix(currentFile);
        if (fixed) setElements(fixed.elements);
    };
    
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Phase 3: Validation UI Test</h1>
            
            <div>
                <label className="block mb-2 text-sm font-medium">Upload Script</label>
                <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".fountain,.fdx,.pdf,.txt"
                    className="block w-full text-sm border rounded p-2"
                />
            </div>
            
            {validationReport && (
                <ValidationReportCard
                    report={validationReport}
                    onAutoFix={handleAutoFix}
                    onDismiss={clearValidation}
                    autoFixAvailable={autoFixAvailable}
                    isLoading={isAutoFixing}
                />
            )}
            
            {elements.length > 0 && (
                <div className="border rounded p-4">
                    <h2 className="font-bold mb-2">Imported Elements: {elements.length}</h2>
                    <div className="text-xs space-y-1">
                        {elements.slice(0, 5).map(el => (
                            <div key={el.id}>
                                {el.type}: {el.content.substring(0, 50)}...
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
```

Add route to this page in your router and test with:
1. A clean .fountain script (expect green card)
2. A messy script with errors (expect red/yellow card)
3. Click auto-fix button (expect confidence to improve)
```

---

## 📝 PROMPT 4: Create Test Scripts

```
Create test script files to verify Phase 3 validation UI.

Create these files in project root:

1. `test-scripts/clean.fountain` (should show 100% confidence):
```
Title: Clean Script
Author: Test

INT. OFFICE - DAY

JOHN sits at his desk.

JOHN
This script is perfectly formatted.
```

2. `test-scripts/messy.fountain` (should show warnings):
```
INT. COFFEE SHOP - DAY

john
Lowercase character name.

(( bad parenthetical
More dialogue.
```

3. `test-scripts/errors.fountain` (should show errors):
```
INT. OFFICE - DAY

JOHN

(orphaned parenthetical)

CHARACTER_WITHOUT_DIALOGUE

RANDOM TEXT
```

These will let us test the validation UI shows correct status for each scenario.
```

---

## ✅ Verification Checklist

After running prompts, verify:

- [ ] ValidationReportCard component exists in `src/components/features/`
- [ ] useScriptValidation hook exists in `src/hooks/`
- [ ] Script import flow shows validation card after upload
- [ ] Confidence score displays (0-100%)
- [ ] Errors/warnings list with icons
- [ ] Auto-fix button appears when issues found
- [ ] Clicking auto-fix improves confidence
- [ ] Card can be dismissed with X button

---

## 🚀 Quick Start

**Run these prompts in order:**

1. **Prompt 1** → Find where scripts are imported
2. **Prompt 2** → Integrate validation UI
3. **Prompt 3** → Create test page
4. **Prompt 4** → Create test scripts
5. Test with test scripts and verify all features work

**Phase 3 complete when all test scenarios pass!** ✅
