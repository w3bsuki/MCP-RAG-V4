/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs/promises'
import path from 'path'
import { EventEmitter } from 'events'

interface CoverageThresholds {
  lines: number
  functions: number
  branches: number
  statements: number
}

interface CoverageResult {
  passed: boolean
  details: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  violations: Array<{
    type: string
    actual: number
    required: number
    diff: number
  }>
  timestamp?: Date
}

interface CoverageTrend {
  timestamp: string
  lines: number
  improvement?: number
}

interface UncoveredFile {
  file: string
  coverage: number
  missing: number
}

export class CoverageMonitor extends EventEmitter {
  public thresholds: CoverageThresholds
  private outputDir: string
  private watcher?: any

  constructor(config: { thresholds: CoverageThresholds; outputDir: string }) {
    super()
    this.thresholds = config.thresholds
    this.outputDir = config.outputDir
  }

  async checkCoverage(): Promise<CoverageResult> {
    try {
      const summaryPath = path.join(this.outputDir, 'coverage-summary.json')
      const content = await fs.readFile(summaryPath, 'utf-8')
      const summary = JSON.parse(content)

      const details = {
        lines: summary.total.lines.pct,
        functions: summary.total.functions.pct,
        branches: summary.total.branches.pct,
        statements: summary.total.statements.pct,
      }

      const violations: CoverageResult['violations'] = []
      
      // Check each metric against thresholds
      for (const [metric, threshold] of Object.entries(this.thresholds)) {
        const actual = details[metric as keyof typeof details]
        if (actual < threshold) {
          violations.push({
            type: metric,
            actual,
            required: threshold,
            diff: actual - threshold,
          })
        }
      }

      const result: CoverageResult = {
        passed: violations.length === 0,
        details,
        violations,
        timestamp: new Date(),
      }

      // Save to history
      await this.saveCoverageHistory(details.lines)

      return result
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error('Coverage report not found. Run tests first.')
      }
      throw error
    }
  }

  async generateReport(): Promise<string> {
    const result = await this.checkCoverage()
    
    let report = '# Coverage Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`
    
    // Summary
    report += '## Summary\n\n'
    const summaryPath = path.join(this.outputDir, 'coverage-summary.json')
    const content = await fs.readFile(summaryPath, 'utf-8')
    const summary = JSON.parse(content)
    
    for (const [metric, data] of Object.entries(summary.total)) {
      const details = data as any
      report += `- ${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${details.pct}% (${details.covered}/${details.total})`
      report += result.passed ? ' ✅\n' : '\n'
    }
    
    // File details
    report += '\n## File Coverage\n\n'
    try {
      const detailPath = path.join(this.outputDir, 'coverage-final.json')
      const detailContent = await fs.readFile(detailPath, 'utf-8')
      const details = JSON.parse(detailContent)
      
      for (const [file, coverage] of Object.entries(details)) {
        const cov = coverage as any
        const lineCoverage = cov.lines?.pct || 0
        if (lineCoverage < this.thresholds.lines) {
          report += `⚠️ ${file}: ${lineCoverage}%\n`
        }
      }
    } catch (error) {
      // Coverage details might not exist
    }
    
    return report
  }

  watchCoverage(): void {
    // Create a mock watcher for testing
    this.watcher = this.createWatcher()
    
    this.watcher.on('change', async () => {
      try {
        const result = await this.checkCoverage()
        this.emit('coverageUpdate', result)
      } catch (error) {
        this.emit('error', error)
      }
    })
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = undefined
    }
  }

  async getCoverageTrend(_days: number = 7): Promise<CoverageTrend[]> {
    try {
      const historyPath = path.join(this.outputDir, 'coverage-history.json')
      const content = await fs.readFile(historyPath, 'utf-8')
      const history = JSON.parse(content) as CoverageTrend[]
      
      // Calculate improvements
      if (history.length > 0) {
        const firstCoverage = history[0]?.lines || 0
        for (let i = 1; i < history.length; i++) {
          if (history[i]) {
            history[i]!.improvement = history[i]!.lines - firstCoverage
          }
        }
      }
      
      return history
    } catch (error) {
      return []
    }
  }

  async enforceCoverage(): Promise<void> {
    const result = await this.checkCoverage()
    if (!result.passed) {
      throw new Error('Coverage requirements not met')
    }
  }

  async getUncoveredFiles(threshold: number): Promise<UncoveredFile[]> {
    try {
      const detailPath = path.join(this.outputDir, 'coverage-final.json')
      const content = await fs.readFile(detailPath, 'utf-8')
      const details = JSON.parse(content)
      
      const uncovered: UncoveredFile[] = []
      
      for (const [file, coverage] of Object.entries(details)) {
        const cov = coverage as any
        const lineCoverage = cov.lines?.pct || 0
        
        if (lineCoverage < threshold) {
          uncovered.push({
            file,
            coverage: lineCoverage,
            missing: threshold - lineCoverage,
          })
        }
      }
      
      // Sort by lowest coverage first
      return uncovered.sort((a, b) => a.coverage - b.coverage)
    } catch (error) {
      return []
    }
  }

  private createWatcher(): any {
    // Mock watcher for testing
    const watcher = new EventEmitter()
    ;(watcher as any).close = () => {}
    return watcher
  }

  private async saveCoverageHistory(lines: number): Promise<void> {
    const historyPath = path.join(this.outputDir, 'coverage-history.json')
    let history: CoverageTrend[] = []
    
    try {
      const content = await fs.readFile(historyPath, 'utf-8')
      history = JSON.parse(content)
    } catch (error) {
      // File doesn't exist yet
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      lines,
    })
    
    // Keep only last 30 entries
    if (history.length > 30) {
      history = history.slice(-30)
    }
    
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2))
  }
}