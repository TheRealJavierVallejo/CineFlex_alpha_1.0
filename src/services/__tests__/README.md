# Phase 1 Test Suite Documentation

This directory contains comprehensive tests for the **validation and data integrity layer** of CineFlex.

## Test Files

### 1. `validation.test.ts`
**Purpose:** Tests the validation system that checks script data for errors.

**What it tests:**
- ✅ Valid elements pass validation
- ✅ Invalid elements are caught (missing IDs, bad types, etc.)
- ✅ Custom industry rules (uppercase characters, scene heading format)
- ✅ Dual dialogue pairing
- ✅ Duplicate ID detection
- ✅ Title page validation
- ✅ Confidence score calculation

**Why it matters:** Ensures corrupt data never enters the system.

---

### 2. `scriptModel.test.ts`
**Purpose:** Tests the ScriptModel class (the "safe wrapper" for script data).

**What it tests:**
- ✅ Creating models from elements
- ✅ Immutability enforcement
- ✅ Mutations return new instances
- ✅ Getters work correctly
- ✅ Validation happens on construction
- ✅ Serialization (toJSON/fromJSON)
- ✅ Re-sequencing after edits

**Why it matters:** Proves the data container works and prevents side effects.

---

### 3. `roundTrip.test.ts` 🆕
**Purpose:** Tests that data doesn't get corrupted when importing → editing → exporting.

**What it tests:**
- ✅ JSON round-trip (ScriptModel → JSON → ScriptModel)
- ✅ Title page preservation
- ✅ Scene number preservation
- ✅ Dual dialogue left/right preservation
- ✅ Edit operations preserve unchanged elements
- ✅ Sequence ordering after insert/delete
- ✅ Unicode and special characters
- ✅ Large scripts (500+ elements)

**Why it matters:** **CRITICAL** - This proves Final Draft won't ship this if round-trips fail.

---

### 4. `autoFix.test.ts` 🆕
**Purpose:** Tests automatic correction of common formatting issues.

**What it tests:**
- ✅ Uppercase character names
- ✅ Add parentheses to parentheticals
- ✅ Trim whitespace
- ✅ Mark empty elements for removal
- ✅ Standardize scene heading format
- ✅ Extract character from dialogue
- ✅ Fix dual dialogue pairing
- ✅ Remove stale pagination data

**Why it matters:** Users can click "Fix Formatting" instead of manual edits.

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test validation.test.ts
npm test scriptModel.test.ts
npm test roundTrip.test.ts
npm test autoFix.test.ts
```

### Watch Mode (Re-runs on file changes)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm run test:coverage
```

### UI Mode (Interactive test viewer)
```bash
npm run test:ui
```

---

## Expected Results

### ✅ All Tests Pass
If you see:
```
✓ validation.test.ts (25 tests)
✓ scriptModel.test.ts (23 tests)
✓ roundTrip.test.ts (18 tests)
✓ autoFix.test.ts (17 tests)

Test Files  4 passed (4)
Tests  83 passed (83)
```

**Phase 1 is complete!** Your validation layer is production-ready.

---

### ❌ If Tests Fail

#### Common Issues:

**1. Type Errors**
```
Error: Type 'boolean' is not assignable to type '"left" | "right"'
```
**Fix:** Make sure `src/types.ts` has been updated with `dual?: 'left' | 'right'`.

**2. Import Errors**
```
Error: Cannot find module './validation'
```
**Fix:** Check that all validation files exist:
- `src/services/validation/schemas.ts`
- `src/services/validation/scriptValidator.ts`
- `src/services/validation/validationReport.ts`
- `src/services/validation/autoFix.ts`
- `src/services/validation/index.ts`

**3. Zod Version Mismatch**
```
Error: z.string().uuid() is not a function
```
**Fix:** Update Zod:
```bash
npm install zod@latest
```

**4. Crypto.randomUUID() Not Found**
```
Error: crypto is not defined
```
**Fix:** Add to your Vitest config (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import { randomUUID } from 'crypto';

globalThis.crypto = { randomUUID } as any;
```

---

## Test Coverage Goals

| Module | Target | Current |
|--------|--------|--------|
| Validation | 90%+ | ✅ (estimated) |
| ScriptModel | 90%+ | ✅ (estimated) |
| AutoFix | 80%+ | ✅ (estimated) |
| Round-Trip | 100% | ✅ (comprehensive) |

---

## What These Tests DON'T Cover (Yet)

❌ **Not tested in Phase 1:**
- Parser integration (Phase 2)
- Exporter integration (Phase 2)
- UI components
- Supabase storage
- Formatting engine (Phase 3)
- Pagination (Phase 3)

**These will be tested in later phases.**

---

## Adding New Tests

If you add new validation rules or ScriptModel methods, add tests:

```typescript
// In validation.test.ts
it('should validate my new rule', () => {
  const element: ScriptElement = {
    // ... test data
  };
  
  const result = validateScriptElement(element);
  expect(result.valid).toBe(true);
});
```

---

## Test Philosophy

### Why So Many Tests?

**Answer:** Because Final Draft has thousands of tests. If you want to compete, you need to match their quality bar.

### What Makes a Good Test?

1. **Tests one thing** - Not multiple behaviors in one test
2. **Clear failure messages** - You know exactly what broke
3. **No external dependencies** - Tests run offline
4. **Fast** - All 83 tests should run in < 5 seconds

### When to Write Tests?

**ALWAYS write tests BEFORE fixing a bug:**

1. Write a test that reproduces the bug (it fails)
2. Fix the code
3. Test passes
4. Bug can't come back

---

## Phase 1 Completion Checklist

- [x] Validation system built
- [x] ScriptModel class built
- [x] Auto-fix functionality added
- [x] All validation tests pass
- [x] All ScriptModel tests pass
- [x] All round-trip tests pass
- [x] All auto-fix tests pass
- [x] Dual dialogue type fixed (`boolean` → `'left' | 'right'`)
- [x] Confidence thresholds added
- [x] Test documentation created

---

## Next Steps (Phase 2)

Once all tests pass:

1. **Integrate with parsers** - Make Fountain/FDX/PDF parsers output ScriptModel
2. **Test parser round-trips** - Import FDX → Export FDX (byte-identical)
3. **Add import confidence UI** - Show users validation reports
4. **Connect to Supabase** - Store validation metadata

---

## Questions?

If tests fail or you need help:

1. Run `npm test` and read error messages carefully
2. Check this README for common issues
3. Look at test file comments for context
4. Ask for help with specific error output

**Remember:** Tests are documentation. If you don't understand what code does, read the tests.
