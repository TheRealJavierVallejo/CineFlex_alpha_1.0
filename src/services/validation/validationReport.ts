/**
 * VALIDATION REPORT
 * 
 * Structures for reporting validation results to users.
 * Provides detailed feedback about what's wrong with script data.
 */

import { ValidScriptElement } from './schemas';

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string; // Machine-readable code (e.g., 'INVALID_UUID', 'MISSING_CONTENT')
  message: string; // Human-readable message
  elementId?: string; // Which element has the issue
  elementSequence?: number; // Sequence number for easier location
  elementType?: string; // Type of element
  suggestion?: string; // How to fix it
  context?: Record<string, unknown>; // Additional data for debugging
}

/**
 * Overall validation result
 */
export interface ValidationReport {
  valid: boolean; // True if no errors (warnings are ok)
  confidence: number; // 0.0 to 1.0, based on severity and count of issues
  totalElements: number;
  validElements: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  timestamp: number; // When validation ran
}

/**
 * Validation status for UI display
 */
export type ValidationStatus = 'valid' | 'warnings' | 'errors' | 'unchecked';

/**
 * Helper to create a validation issue
 */
export function createIssue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  element?: ValidScriptElement,
  suggestion?: string
): ValidationIssue {
  return {
    severity,
    code,
    message,
    elementId: element?.id,
    elementSequence: element?.sequence,
    elementType: element?.type,
    suggestion,
    context: element ? { element } : undefined
  };
}

/**
 * Helper to create an empty report
 */
export function createEmptyReport(): ValidationReport {
  return {
    valid: true,
    confidence: 1.0,
    totalElements: 0,
    validElements: 0,
    issues: [],
    summary: {
      errors: 0,
      warnings: 0,
      info: 0
    },
    timestamp: Date.now()
  };
}

/**
 * Calculate confidence score based on issues
 * Errors hurt confidence more than warnings
 */
export function calculateConfidence(issues: ValidationIssue[], totalElements: number): number {
  if (issues.length === 0) return 1.0;
  if (totalElements === 0) return 0.0;
  
  // Weight different severities
  const weights = { error: 0.5, warning: 0.2, info: 0.05 };
  
  let penalty = 0;
  for (const issue of issues) {
    penalty += weights[issue.severity];
  }
  
  // Normalize by total elements (more elements = less impact per issue)
  const normalizedPenalty = penalty / Math.max(totalElements, 1);
  
  // Confidence is 1.0 minus penalty, clamped to [0, 1]
  return Math.max(0, Math.min(1, 1.0 - normalizedPenalty));
}

/**
 * Determine overall status from report
 */
export function getValidationStatus(report: ValidationReport): ValidationStatus {
  if (report.summary.errors > 0) return 'errors';
  if (report.summary.warnings > 0) return 'warnings';
  if (report.totalElements === 0) return 'unchecked';
  return 'valid';
}

/**
 * Format report for console logging (development)
 */
export function formatReportForConsole(report: ValidationReport): string {
  const lines: string[] = [];
  
  lines.push('\n========================================');
  lines.push('VALIDATION REPORT');
  lines.push('========================================');
  lines.push(`Status: ${report.valid ? '✓ VALID' : '✗ INVALID'}`);
  lines.push(`Confidence: ${(report.confidence * 100).toFixed(1)}%`);
  lines.push(`Elements: ${report.validElements}/${report.totalElements}`);
  lines.push(`Issues: ${report.issues.length} (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);
  
  if (report.issues.length > 0) {
    lines.push('\n--- Issues ---');
    for (const issue of report.issues) {
      const prefix = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`${prefix} [${issue.code}] ${issue.message}`);
      if (issue.elementSequence) {
        lines.push(`   Element #${issue.elementSequence} (${issue.elementType})`);
      }
      if (issue.suggestion) {
        lines.push(`   💡 ${issue.suggestion}`);
      }
    }
  }
  
  lines.push('========================================\n');
  
  return lines.join('\n');
}
