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
 * Confidence level thresholds (industry standard quality gates)
 */
export const CONFIDENCE_THRESHOLDS = {
  EXCELLENT: 1.0,    // Perfect - no issues
  GOOD: 0.9,         // Minor warnings only
  ACCEPTABLE: 0.7,   // Multiple warnings
  POOR: 0.5,         // Some errors or many warnings
  FAILED: 0.3        // Many errors
} as const;

export type ConfidenceLevel = 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'FAILED';

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
  if (confidence >= CONFIDENCE_THRESHOLDS.GOOD) return 'GOOD';
  if (confidence >= CONFIDENCE_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
  if (confidence >= CONFIDENCE_THRESHOLDS.POOR) return 'POOR';
  return 'FAILED';
}

/**
 * Get user-friendly description of confidence level
 */
export function getConfidenceDescription(level: ConfidenceLevel): string {
  switch (level) {
    case 'EXCELLENT':
      return 'Ready for production - no issues found';
    case 'GOOD':
      return 'Good quality - minor formatting suggestions';
    case 'ACCEPTABLE':
      return 'Acceptable - review warnings before proceeding';
    case 'POOR':
      return 'Needs work - multiple issues detected';
    case 'FAILED':
      return 'Import failed - too many errors to use safely';
  }
}

/**
 * Get color for confidence level (for UI)
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'EXCELLENT':
      return 'green';
    case 'GOOD':
      return 'blue';
    case 'ACCEPTABLE':
      return 'yellow';
    case 'POOR':
      return 'orange';
    case 'FAILED':
      return 'red';
  }
}

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
 * Format report for user display (simple summary)
 */
export function formatReportSummary(report: ValidationReport): string {
  const level = getConfidenceLevel(report.confidence);
  const percentage = (report.confidence * 100).toFixed(0);
  const description = getConfidenceDescription(level);
  
  if (report.summary.errors > 0) {
    return `Import quality: ${percentage}% - ${report.summary.errors} error(s), ${report.summary.warnings} warning(s). ${description}`;
  }
  if (report.summary.warnings > 0) {
    return `Import quality: ${percentage}% - ${report.summary.warnings} warning(s). ${description}`;
  }
  return `Import quality: ${percentage}% - ${description}`;
}

/**
 * Format report for console logging (development)
 */
export function formatReportForConsole(report: ValidationReport): string {
  const lines: string[] = [];
  
  lines.push('\n========================================')
  lines.push('VALIDATION REPORT');
  lines.push('========================================');
  lines.push(`Status: ${report.valid ? '✓ VALID' : '✗ INVALID'}`);
  
  const level = getConfidenceLevel(report.confidence);
  lines.push(`Confidence: ${(report.confidence * 100).toFixed(1)}% (${level})`);
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

/**
 * Group issues by severity for organized display
 */
export function groupIssuesBySeverity(report: ValidationReport): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
} {
  return {
    errors: report.issues.filter(i => i.severity === 'error'),
    warnings: report.issues.filter(i => i.severity === 'warning'),
    info: report.issues.filter(i => i.severity === 'info')
  };
}

/**
 * Check if report should block user action (too many errors)
 */
export function shouldBlockAction(report: ValidationReport): boolean {
  const level = getConfidenceLevel(report.confidence);
  return level === 'FAILED' || report.summary.errors > 10;
}

/**
 * Get recommended action based on report
 */
export function getRecommendedAction(report: ValidationReport): string {
  const level = getConfidenceLevel(report.confidence);
  
  switch (level) {
    case 'EXCELLENT':
      return 'You can proceed safely.';
    case 'GOOD':
      return 'Review warnings if you have time, but safe to proceed.';
    case 'ACCEPTABLE':
      return 'Review and fix warnings before exporting.';
    case 'POOR':
      return 'Fix errors before continuing. Use "Auto-Fix" if available.';
    case 'FAILED':
      return 'Too many errors to proceed. Try re-importing the file or check source file quality.';
  }
}