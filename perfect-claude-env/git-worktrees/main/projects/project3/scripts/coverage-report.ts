#!/usr/bin/env ts-node

import { CoverageMonitor } from '@/lib/monitoring/coverageMonitor'
import chalk from 'chalk'
import Table from 'cli-table3'
import fs from 'fs/promises'
import path from 'path'

async function generateCoverageReport() {
  const monitor = new CoverageMonitor({
    thresholds: {
      lines: 95,
      functions: 90,
      branches: 90,
      statements: 95,
    },
    outputDir: './coverage',
  })

  try {
    console.log(chalk.blue.bold('\n📊 Crypto Vision - Test Coverage Report\n'))

    // Check overall coverage
    const result = await monitor.checkCoverage()
    
    // Create summary table
    const summaryTable = new Table({
      head: ['Metric', 'Coverage', 'Threshold', 'Status'],
      colWidths: [15, 15, 15, 10],
    })

    const metrics = ['lines', 'functions', 'branches', 'statements'] as const
    
    metrics.forEach(metric => {
      const coverage = result.details[metric]
      const threshold = monitor.thresholds[metric]
      const passed = coverage >= threshold
      
      summaryTable.push([
        metric.charAt(0).toUpperCase() + metric.slice(1),
        `${coverage.toFixed(2)}%`,
        `${threshold}%`,
        passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
      ])
    })

    console.log(summaryTable.toString())

    // Show violations if any
    if (result.violations.length > 0) {
      console.log(chalk.red.bold('\n⚠️  Coverage Violations:\n'))
      
      result.violations.forEach(violation => {
        console.log(
          chalk.red(`  - ${violation.type}: ${violation.actual}% (required: ${violation.required}%)`)
        )
      })
    }

    // Get uncovered files
    const uncoveredFiles = await monitor.getUncoveredFiles(90)
    
    if (uncoveredFiles.length > 0) {
      console.log(chalk.yellow.bold('\n📁 Files Needing Attention:\n'))
      
      const filesTable = new Table({
        head: ['File', 'Coverage', 'Missing'],
        colWidths: [50, 15, 15],
      })

      uncoveredFiles.slice(0, 10).forEach(file => {
        filesTable.push([
          file.file.replace(process.cwd(), '.'),
          `${file.coverage.toFixed(2)}%`,
          chalk.red(`-${file.missing.toFixed(2)}%`),
        ])
      })

      console.log(filesTable.toString())
    }

    // Show coverage trend
    const trend = await monitor.getCoverageTrend()
    
    if (trend.length > 1) {
      console.log(chalk.blue.bold('\n📈 Coverage Trend (Last 5 Runs):\n'))
      
      const trendTable = new Table({
        head: ['Run', 'Lines', 'Change'],
        colWidths: [25, 15, 15],
      })

      trend.slice(-5).forEach((entry) => {
        const change = entry.improvement || 0
        const changeStr = change > 0 
          ? chalk.green(`+${change.toFixed(2)}%`)
          : change < 0 
          ? chalk.red(`${change.toFixed(2)}%`)
          : '0.00%'

        trendTable.push([
          new Date(entry.timestamp).toLocaleString(),
          `${entry.lines.toFixed(2)}%`,
          changeStr,
        ])
      })

      console.log(trendTable.toString())
    }

    // Final status
    console.log('\n' + chalk.bold(
      result.passed 
        ? chalk.green('✅ All coverage requirements met!')
        : chalk.red('❌ Coverage requirements not met. Please add more tests.')
    ) + '\n')

    // Generate badge
    await generateCoverageBadge(result.details.lines)

    process.exit(result.passed ? 0 : 1)
  } catch (error) {
    console.error(chalk.red('Error generating coverage report:'), error)
    process.exit(1)
  }
}

async function generateCoverageBadge(coverage: number) {
  const color = coverage >= 95 ? 'green' : coverage >= 80 ? 'yellow' : 'red'
  const badge = `https://img.shields.io/badge/coverage-${coverage.toFixed(1)}%25-${color}`
  
  const readme = `# Crypto Vision

![Coverage](${badge})

Production-ready AI-powered crypto prediction platform.
`

  await fs.writeFile(path.join(process.cwd(), 'coverage-badge.md'), readme)
  console.log(chalk.gray(`Coverage badge generated: ${badge}`))
}

// Run the report
generateCoverageReport()