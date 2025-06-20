import { 
  FileTransformation, 
  FileTransformationStats, 
  ComponentTransformation, 
  ImportChange, 
  PropChange,
  AppliedRule 
} from "../file-transformation-types";

/**
 * Analyzes the impact of transformations on files
 * Calculates statistics, tracks changes, and provides insights
 */
export class FileImpactAnalyzer {

  /**
   * Calculates comprehensive statistics for a file transformation
   */
  static calculateFileStats(
    originalCode: string,
    transformedCode: string,
    componentTransformations: ComponentTransformation[],
    importChanges: ImportChange[],
    appliedRules: AppliedRule[]
  ): FileTransformationStats {
    
    const stats: FileTransformationStats = {
      totalComponents: 0,
      componentsChanged: 0,
      totalPropsModified: 0,
      propsAdded: 0,
      propsRemoved: 0,
      propsRenamed: 0,
      importsAdded: 0,
      importsRemoved: 0,
      importsModified: 0,
      rulesApplied: appliedRules.length,
      linesChanged: 0,
      charactersChanged: 0
    };

    // Count components
    stats.totalComponents = componentTransformations.length;
    stats.componentsChanged = componentTransformations.filter(
      comp => comp.propChanges.length > 0 || comp.replacement
    ).length;

    // Count prop changes
    componentTransformations.forEach(comp => {
      comp.propChanges.forEach(propChange => {
        stats.totalPropsModified++;
        
        switch (propChange.type) {
          case 'add':
            stats.propsAdded++;
            break;
          case 'remove':
            stats.propsRemoved++;
            break;
          case 'rename':
            stats.propsRenamed++;
            break;
          case 'modify':
            // Count as both remove and add for modified props
            stats.propsAdded++;
            stats.propsRemoved++;
            break;
        }
      });
    });

    // Count import changes
    importChanges.forEach(importChange => {
      switch (importChange.type) {
        case 'add':
          stats.importsAdded++;
          break;
        case 'remove':
          stats.importsRemoved++;
          break;
        case 'modify':
          stats.importsModified++;
          break;
      }
    });

    // Calculate line and character changes
    const originalLines = originalCode.split('\n');
    const transformedLines = transformedCode.split('\n');
    
    stats.linesChanged = Math.abs(transformedLines.length - originalLines.length);
    stats.charactersChanged = Math.abs(transformedCode.length - originalCode.length);

    return stats;
  }

  /**
   * Analyzes the complexity and risk of a file transformation
   */
  static analyzeTransformationComplexity(fileTransformation: FileTransformation): {
    complexity: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
    score: number;
  } {
    const { stats, componentTransformations, importChanges, errors } = fileTransformation;
    
    let score = 0;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Score based on number of changes
    score += stats.componentsChanged * 2;
    score += stats.totalPropsModified;
    score += (stats.importsAdded + stats.importsRemoved + stats.importsModified) * 3;
    score += stats.linesChanged * 0.1;

    // Risk factors
    if (stats.componentsChanged > 5) {
      riskFactors.push("High number of component changes");
      recommendations.push("Review each component change carefully");
    }

    if (stats.totalPropsModified > 10) {
      riskFactors.push("High number of prop modifications");
      recommendations.push("Test component functionality thoroughly");
    }

    if (stats.importsAdded + stats.importsRemoved > 3) {
      riskFactors.push("Significant import restructuring");
      recommendations.push("Verify all imports resolve correctly");
    }

    // Check for component replacements
    const hasReplacements = componentTransformations.some(comp => comp.replacement);
    if (hasReplacements) {
      score += 10;
      riskFactors.push("Components are being replaced");
      recommendations.push("Ensure replacement components have equivalent functionality");
    }

    // Check for complex prop changes
    const hasComplexPropChanges = componentTransformations.some(comp =>
      comp.propChanges.some(prop => prop.type === 'modify' || prop.type === 'rename')
    );
    if (hasComplexPropChanges) {
      score += 5;
      riskFactors.push("Complex prop transformations detected");
      recommendations.push("Review prop value mappings carefully");
    }

    // Errors increase risk significantly
    if (errors.length > 0) {
      score += errors.length * 5;
      riskFactors.push(`${errors.length} errors detected`);
      recommendations.push("Resolve all errors before proceeding");
    }

    // Large file changes are riskier
    if (stats.linesChanged > 50) {
      score += 10;
      riskFactors.push("Large number of line changes");
      recommendations.push("Consider breaking into smaller migrations");
    }

    // Determine complexity level
    let complexity: 'low' | 'medium' | 'high';
    if (score < 10) {
      complexity = 'low';
    } else if (score < 25) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }

    // Add general recommendations
    if (complexity === 'high') {
      recommendations.push("Consider creating a backup before applying changes");
      recommendations.push("Test thoroughly in a development environment first");
    }

    if (stats.rulesApplied > 5) {
      recommendations.push("Multiple rules applied - verify they don't conflict");
    }

    return {
      complexity,
      riskFactors,
      recommendations,
      score
    };
  }

  /**
   * Compares two file transformations to identify patterns
   */
  static compareTransformations(
    fileA: FileTransformation,
    fileB: FileTransformation
  ): {
    similarities: string[];
    differences: string[];
    commonPatterns: string[];
  } {
    const similarities: string[] = [];
    const differences: string[] = [];
    const commonPatterns: string[] = [];

    // Compare components
    const componentsA = new Set(fileA.componentTransformations.map(c => c.componentName));
    const componentsB = new Set(fileB.componentTransformations.map(c => c.componentName));
    
    const commonComponents = [...componentsA].filter(c => componentsB.has(c));
    if (commonComponents.length > 0) {
      similarities.push(`Both files modify: ${commonComponents.join(', ')}`);
      commonPatterns.push(`Component migration: ${commonComponents.join(', ')}`);
    }

    // Compare packages
    const packagesA = new Set(fileA.componentTransformations.map(c => c.packageName));
    const packagesB = new Set(fileB.componentTransformations.map(c => c.packageName));
    
    const commonPackages = [...packagesA].filter(p => packagesB.has(p));
    if (commonPackages.length > 0) {
      similarities.push(`Both files use packages: ${commonPackages.join(', ')}`);
    }

    // Compare applied rules
    const rulesA = new Set(fileA.appliedRules.map(r => r.ruleType));
    const rulesB = new Set(fileB.appliedRules.map(r => r.ruleType));
    
    const commonRules = [...rulesA].filter(r => rulesB.has(r));
    if (commonRules.length > 0) {
      similarities.push(`Common rule types: ${commonRules.join(', ')}`);
      commonPatterns.push(`Rule pattern: ${commonRules.join(', ')}`);
    }

    // Compare stats
    const statsA = fileA.stats;
    const statsB = fileB.stats;
    
    if (Math.abs(statsA.componentsChanged - statsB.componentsChanged) <= 1) {
      similarities.push("Similar number of components changed");
    } else {
      differences.push(`Different component change counts: ${statsA.componentsChanged} vs ${statsB.componentsChanged}`);
    }

    if (Math.abs(statsA.totalPropsModified - statsB.totalPropsModified) > 5) {
      differences.push(`Different prop modification counts: ${statsA.totalPropsModified} vs ${statsB.totalPropsModified}`);
    }

    return {
      similarities,
      differences,
      commonPatterns
    };
  }

  /**
   * Groups file transformations by patterns
   */
  static groupTransformationsByPattern(
    fileTransformations: FileTransformation[]
  ): {
    byPackage: Record<string, FileTransformation[]>;
    byComponent: Record<string, FileTransformation[]>;
    byRuleType: Record<string, FileTransformation[]>;
    byComplexity: Record<'low' | 'medium' | 'high', FileTransformation[]>;
  } {
    const byPackage: Record<string, FileTransformation[]> = {};
    const byComponent: Record<string, FileTransformation[]> = {};
    const byRuleType: Record<string, FileTransformation[]> = {};
    const byComplexity: Record<'low' | 'medium' | 'high', FileTransformation[]> = {
      low: [],
      medium: [],
      high: []
    };

    fileTransformations.forEach(fileTransform => {
      // Group by package
      fileTransform.componentTransformations.forEach(comp => {
        if (!byPackage[comp.packageName]) {
          byPackage[comp.packageName] = [];
        }
        if (!byPackage[comp.packageName].includes(fileTransform)) {
          byPackage[comp.packageName].push(fileTransform);
        }

        // Group by component
        if (!byComponent[comp.componentName]) {
          byComponent[comp.componentName] = [];
        }
        if (!byComponent[comp.componentName].includes(fileTransform)) {
          byComponent[comp.componentName].push(fileTransform);
        }
      });

      // Group by rule type
      fileTransform.appliedRules.forEach(rule => {
        if (!byRuleType[rule.ruleType]) {
          byRuleType[rule.ruleType] = [];
        }
        if (!byRuleType[rule.ruleType].includes(fileTransform)) {
          byRuleType[rule.ruleType].push(fileTransform);
        }
      });

      // Group by complexity
      const complexity = this.analyzeTransformationComplexity(fileTransform).complexity;
      byComplexity[complexity].push(fileTransform);
    });

    return {
      byPackage,
      byComponent,
      byRuleType,
      byComplexity
    };
  }

  /**
   * Generates an impact report for multiple file transformations
   */
  static generateImpactReport(fileTransformations: FileTransformation[]): {
    summary: {
      totalFiles: number;
      totalChanges: number;
      highRiskFiles: number;
      averageProcessingTime: number;
    };
    topChangedFiles: Array<{
      filePath: string;
      changeCount: number;
      complexity: 'low' | 'medium' | 'high';
    }>;
    packageImpact: Record<string, {
      filesAffected: number;
      componentsChanged: number;
      totalChanges: number;
    }>;
    ruleEffectiveness: Record<string, {
      filesAppliedTo: number;
      totalApplications: number;
      averageChangesPerApplication: number;
    }>;
  } {
    const summary = {
      totalFiles: fileTransformations.length,
      totalChanges: 0,
      highRiskFiles: 0,
      averageProcessingTime: 0
    };

    const topChangedFiles: Array<{
      filePath: string;
      changeCount: number;
      complexity: 'low' | 'medium' | 'high';
    }> = [];

    const packageImpact: Record<string, {
      filesAffected: number;
      componentsChanged: number;
      totalChanges: number;
    }> = {};

    const ruleEffectiveness: Record<string, {
      filesAppliedTo: number;
      totalApplications: number;
      averageChangesPerApplication: number;
    }> = {};

    let totalProcessingTime = 0;

    fileTransformations.forEach(fileTransform => {
      const { stats, componentTransformations, appliedRules } = fileTransform;
      
      // Calculate total changes for this file
      const fileChangeCount = stats.totalPropsModified + 
                             stats.importsAdded + 
                             stats.importsRemoved + 
                             stats.importsModified;
      
      summary.totalChanges += fileChangeCount;
      totalProcessingTime += fileTransform.processingTime;

      // Check if high risk
      const complexity = this.analyzeTransformationComplexity(fileTransform).complexity;
      if (complexity === 'high') {
        summary.highRiskFiles++;
      }

      // Add to top changed files
      topChangedFiles.push({
        filePath: fileTransform.filePath,
        changeCount: fileChangeCount,
        complexity
      });

      // Track package impact
      componentTransformations.forEach(comp => {
        if (!packageImpact[comp.packageName]) {
          packageImpact[comp.packageName] = {
            filesAffected: 0,
            componentsChanged: 0,
            totalChanges: 0
          };
        }
        
        packageImpact[comp.packageName].filesAffected++;
        packageImpact[comp.packageName].componentsChanged++;
        packageImpact[comp.packageName].totalChanges += comp.propChanges.length;
      });

      // Track rule effectiveness
      appliedRules.forEach(rule => {
        if (!ruleEffectiveness[rule.ruleType]) {
          ruleEffectiveness[rule.ruleType] = {
            filesAppliedTo: 0,
            totalApplications: 0,
            averageChangesPerApplication: 0
          };
        }
        
        ruleEffectiveness[rule.ruleType].filesAppliedTo++;
        ruleEffectiveness[rule.ruleType].totalApplications++;
        ruleEffectiveness[rule.ruleType].averageChangesPerApplication += rule.appliedChanges.length;
      });
    });

    // Calculate averages
    summary.averageProcessingTime = totalProcessingTime / fileTransformations.length;

    // Sort top changed files
    topChangedFiles.sort((a, b) => b.changeCount - a.changeCount);

    // Calculate average changes per application for rules
    Object.keys(ruleEffectiveness).forEach(ruleType => {
      const rule = ruleEffectiveness[ruleType];
      rule.averageChangesPerApplication = rule.averageChangesPerApplication / rule.totalApplications;
    });

    return {
      summary,
      topChangedFiles: topChangedFiles.slice(0, 10), // Top 10
      packageImpact,
      ruleEffectiveness
    };
  }
}