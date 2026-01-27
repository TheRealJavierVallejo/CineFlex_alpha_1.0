# 🧪 PHASE 2 TESTING GUIDE

## Quick Commands

### **Test Everything**
```bash
npm test
```
Runs all tests (Phase 1 + Phase 2 = 101 tests)

---

### **Test Only Phase 2**
```bash
npm test phase2Integration
```
Runs only the 28 Phase 2 integration tests

---

### **Test Only Phase 1**
```bash
npm test src/services/__tests__/validation
npm test src/services/__tests__/scriptModel
npm test src/services/__tests__/autoFix
npm test src/services/__tests__/roundTrip
```
Runs all 73 Phase 1 validation tests

---

### **Test Parsers Specifically**
```bash
npm test phase2Integration -- -t "Fountain"
npm test phase2Integration -- -t "FDX"
npm test phase2Integration -- -t "Auto-Fix"
```

---

### **Watch Mode (Auto-rerun on changes)**
```bash
npm test -- --watch
```

---

## 📊 Expected Results

### **✅ All Tests Passing:**
```
✓ src/services/__tests__/validation.test.ts (19 tests)
✓ src/services/__tests__/autoFix.test.ts (18 tests)
✓ src/services/__tests__/roundTrip.test.ts (12 tests)
✓ src/services/__tests__/scriptModel.test.ts (24 tests)
✓ src/services/__tests__/phase2Integration.test.ts (28 tests)

Test Files  5 passed (5)
     Tests  101 passed (101)
```

### **❌ If Tests Fail:**

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Clear cache:**
   ```bash
   npm test -- --clearCache
   npm test
   ```

---

## 🔍 Understanding Test Output

### **Phase 1 Tests (73 total)**
- `validation.test.ts` - Schema validation (19 tests)
- `autoFix.test.ts` - Auto-fix logic (18 tests)
- `roundTrip.test.ts` - Data fidelity (12 tests)
- `scriptModel.test.ts` - ScriptModel wrapper (24 tests)

### **Phase 2 Tests (28 total)**
- Fountain parser integration (5 tests)
- FDX parser integration (4 tests)
- Auto-fix integration (4 tests)
- Strict mode (2 tests)
- Validation report details (3 tests)
- Edge cases (4 tests)
- Console logging (1 test)
- ScriptModel methods (3 tests)

---

## 🐛 Debugging Failed Tests

### **See detailed error messages:**
```bash
npm test -- --reporter=verbose
```

### **Run a single test:**
```bash
npm test -- -t "should return ScriptModel from Fountain parser"
```

### **Run in UI mode:**
```bash
npm test -- --ui
```

---

## ✅ Phase 2 Completion Checklist

After running tests, verify:

- [ ] All 101 tests pass (73 Phase 1 + 28 Phase 2)
- [ ] No console errors in test output
- [ ] Validation reports show confidence scores
- [ ] Auto-fix reduces error counts
- [ ] Strict mode throws errors for invalid scripts
- [ ] ScriptModel is immutable

---

## 📚 Next Steps

**If all tests pass:** Phase 2 is complete! ✅

**Next:** Phase 3 - Add UI for validation reports and auto-fix button
