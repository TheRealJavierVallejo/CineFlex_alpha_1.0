/**
 * VALIDATION REPORT
 * Structures validation results with detailed feedback
 * Used to communicate issues to users and developers
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  elementId?: string;
  elementIndex?: number;
  field?: string;
  suggestedFix?: string;
}

export interface ValidationReport {
  valid: boolean;
  confidence: number; // 0.0 to 1.0
  totalElements: number;
  validElements: number;
  issues: ValidationIssue[];
  context: string;
  timestamp: number;
}

export class ValidationReportBuilder {
  private issues: ValidationIssue[] = [];
  private totalElements = 0;
  private validElements = 0;
  private context = 'Unknown';

  constructor(context?: string) {
    if (context) this.context = context;
  }

  setTotalElements(count: number): this {
    this.totalElements = count;
    return this;
  }

  setValidElements(count: number): this {
    this.validElements = count;
    return this;
  }

  addError(
    message: string,
    elementId?: string,
    elementIndex?: number,
    field?: string,
    suggestedFix?: string
  ): this {
    this.issues.push({
      severity: 'error',
      message,
      elementId,
      elementIndex,
      field,
      suggestedFix,
    });
    return this;
  }

  addWarning(
    message: string,
    elementId?: string,
    elementIndex?: number,
    field?: string,
    suggestedFix?: string
  ): this {
    this.issues.push({
      severity: 'warning',
      message,
      elementId,
      elementIndex,
      field,
      suggestedFix,
    });
    return this;
  }

  addInfo(
    message: string,
    elementId?: string,
    elementIndex?: number
  ): this {
    this.issues.push({
      severity: 'info',
      message,
      elementId,
      elementIndex,
    });
    return this;
  }

  build(): ValidationReport {
    const errors = this.issues.filter(i => i.severity === 'error').length;
    const warnings = this.issues.filter(i => i.severity === 'warning').length;
    
    // Calculate confidence score
    let confidence = 1.0;
    
    if (this.totalElements > 0) {
      // Base confidence on valid elements
      const validRatio = this.validElements / this.totalElements;
      confidence = validRatio;
      
      // Penalize for errors (more severe than warnings)
      const errorPenalty = (errors / this.totalElements) * 0.5;
      const warningPenalty = (warnings / this.totalElements) * 0.2;
      
      confidence = Math.max(0, confidence - errorPenalty - warningPenalty);
    }

    return {
      valid: errors === 0,
      confidence: Math.round(confidence * 100) / 100,
      totalElements: this.totalElements,
      validElements: this.validElements,
      issues: this.issues,
      context: this.context,
      timestamp: Date.now(),
    };
  }

  /**
   * Helper to get summary text
   */
  static getSummary(report: ValidationReport): string {
    const errors = report.issues.filter(i => i.severity === 'error').length;
    const warnings = report.issues.filter(i => i.severity === 'warning').length;
    
    if (report.valid && warnings === 0) {
      return `✓ Valid (${report.confidence * 100}% confidence)`;
    }
    
    const parts: string[] = [];
    if (errors > 0) parts.push(`${errors} error${errors !== 1 ? 's' : ''}`);
    if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`);
    
    return `${parts.join(', ')} (${Math.round(report.confidence * 100)}% confidence)`;
  }

  /**
   * Helper to format report for console logging
   */
  static formatForConsole(report: ValidationReport): string {
    const lines: string[] = [];
    
    lines.push(`\n${'='.repeat(60)}`);
    lines.push(`VALIDATION REPORT: ${report.context}`);
    lines.push(`${'='.repeat(60)}`);
    lines.push(`Status: ${report.valid ? '✓ VALID' : '✗ INVALID'}`);
    lines.push(`Confidence: ${Math.round(report.confidence * 100)}%`);
    lines.push(`Elements: ${report.validElements}/${report.totalElements} valid`);
    lines.push(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    
    if (report.issues.length > 0) {
      lines.push(`\nIssues (${report.issues.length}):`);lines.push('-'.repeat(60));
      
      const errors = report.issues.filter(i => i.severity === 'error');
      const warnings = report.issues.filter(i => i.severity === 'warning');
      const infos = report.issues.filter(i => i.severity === 'info');
      
      if (errors.length > 0) {
        lines.push(`\n❌ ERRORS (${errors.length}):`);
        errors.forEach(issue => {
          const location = issue.elementIndex !== undefined 
            ? `[Element ${issue.elementIndex}]` 
            : issue.elementId 
            ? `[${issue.elementId}]` 
            : '';
          lines.push(`   ${location} ${issue.message}`);
          if (issue.suggestedFix) {
            lines.push(`      → Suggested fix: ${issue.suggestedFix}`);
          }
        });
      }
      
      if (warnings.length > 0) {
        lines.push(`\n⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach(issue => {
          const location = issue.elementIndex !== undefined 
            ? `[Element ${issue.elementIndex}]` 
            : issue.elementId 
            ? `[${issue.elementId}]` 
            : '';
          lines.push(`   ${location} ${issue.message}`);
          if (issue.suggestedFix) {
            lines.push(`      → Suggested fix: ${issue.suggestedFix}`);
          }
        });
      }
      
      if (infos.length > 0) {
        lines.push(`\nℹ️  INFO (${infos.length}):`);
        infos.forEach(issue => {
          lines.push(`   ${issue.message}`);
        });
      }
    } else {
      lines.push(`\n✓ No issues found`);
    }
    
    lines.push(`${'='.repeat(60)}\n`);
    
    return lines.join('\n');
  }
}
