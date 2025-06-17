import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { CoverageMonitor } from '@/lib/monitoring/coverageMonitor'
import fs from 'fs/promises'
import path from 'path'

// Mock fs module
jest.mock('fs/promises')

describe('CoverageMonitor', () => {
  let monitor: CoverageMonitor
  const mockFs = fs as jest.Mocked<typeof fs>

  beforeEach(() => {
    jest.clearAllMocks()
    monitor = new CoverageMonitor({
      thresholds: {
        lines: 95,
        functions: 90,
        branches: 90,
        statements: 95,
      },
      outputDir: './coverage',
    })
  })

  describe('checkCoverage', () => {
    it('should pass when coverage meets all thresholds', async () => {
      const mockCoverageSummary = {
        total: {
          lines: { pct: 96.5 },
          functions: { pct: 92.3 },
          branches: { pct: 91.8 },
          statements: { pct: 95.7 },
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageSummary))

      const result = await monitor.checkCoverage()

      expect(result.passed).toBe(true)
      expect(result.details.lines).toBe(96.5)
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when coverage is below thresholds', async () => {
      const mockCoverageSummary = {
        total: {
          lines: { pct: 88.2 }, // Below 95%
          functions: { pct: 85.0 }, // Below 90%
          branches: { pct: 91.0 },
          statements: { pct: 90.0 }, // Below 95%
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageSummary))

      const result = await monitor.checkCoverage()

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(3)
      expect(result.violations).toContainEqual({
        type: 'lines',
        actual: 88.2,
        required: 95,
        diff: -6.8,
      })
    })

    it('should handle missing coverage file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'))

      await expect(monitor.checkCoverage()).rejects.toThrow(
        'Coverage report not found. Run tests first.'
      )
    })
  })

  describe('generateReport', () => {
    it('should generate formatted coverage report', async () => {
      const mockCoverageSummary = {
        total: {
          lines: { pct: 96.5, total: 1000, covered: 965 },
          functions: { pct: 92.3, total: 200, covered: 185 },
          branches: { pct: 91.8, total: 300, covered: 275 },
          statements: { pct: 95.7, total: 1200, covered: 1148 },
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageSummary))

      const report = await monitor.generateReport()

      expect(report).toContain('Coverage Report')
      expect(report).toContain('Lines: 96.5% (965/1000)')
      expect(report).toContain('✅') // Pass indicator
    })

    it('should include file-level coverage details', async () => {
      const mockCoverageDetail = {
        '/src/lib/services/priceService.ts': {
          lines: { pct: 98.2 },
          functions: { pct: 95.0 },
          branches: { pct: 92.5 },
          statements: { pct: 97.8 },
        },
        '/src/lib/services/predictionEngine.ts': {
          lines: { pct: 85.0 }, // Below threshold
          functions: { pct: 88.0 },
          branches: { pct: 82.0 },
          statements: { pct: 86.0 },
        },
      }

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify({ total: {} }))
        .mockResolvedValueOnce(JSON.stringify(mockCoverageDetail))

      const report = await monitor.generateReport()

      expect(report).toContain('priceService.ts')
      expect(report).toContain('98.2%')
      expect(report).toContain('⚠️ predictionEngine.ts') // Warning for low coverage
    })
  })

  describe('watchCoverage', () => {
    it('should emit events when coverage changes', (done) => {
      const mockWatcher = {
        on: jest.fn((event, callback) => {
          if (event === 'change') {
            setTimeout(() => callback('coverage-summary.json'), 100)
          }
          return mockWatcher
        }),
        close: jest.fn(),
      }

      jest.spyOn(monitor as any, 'createWatcher').mockReturnValue(mockWatcher)

      monitor.on('coverageUpdate', (result) => {
        expect(result).toHaveProperty('passed')
        expect(result).toHaveProperty('timestamp')
        done()
      })

      monitor.watchCoverage()
    })

    it('should stop watching on command', () => {
      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn(),
      }

      jest.spyOn(monitor as any, 'createWatcher').mockReturnValue(mockWatcher)

      monitor.watchCoverage()
      monitor.stopWatching()

      expect(mockWatcher.close).toHaveBeenCalled()
    })
  })

  describe('getCoverageTrend', () => {
    it('should return coverage history over time', async () => {
      const mockHistory = [
        { timestamp: '2024-01-01T10:00:00Z', lines: 92.0 },
        { timestamp: '2024-01-01T11:00:00Z', lines: 93.5 },
        { timestamp: '2024-01-01T12:00:00Z', lines: 95.2 },
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockHistory))

      const trend = await monitor.getCoverageTrend()

      expect(trend).toHaveLength(3)
      expect(trend[2].lines).toBe(95.2)
      expect(trend[2].improvement).toBe(3.2) // From 92.0 to 95.2
    })

    it('should handle empty history', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'))

      const trend = await monitor.getCoverageTrend()

      expect(trend).toEqual([])
    })
  })

  describe('enforceCoverage', () => {
    it('should throw error when coverage is insufficient', async () => {
      const mockCoverageSummary = {
        total: {
          lines: { pct: 85.0 },
          functions: { pct: 80.0 },
          branches: { pct: 75.0 },
          statements: { pct: 82.0 },
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageSummary))

      await expect(monitor.enforceCoverage()).rejects.toThrow(
        'Coverage requirements not met'
      )
    })

    it('should pass silently when coverage is sufficient', async () => {
      const mockCoverageSummary = {
        total: {
          lines: { pct: 96.0 },
          functions: { pct: 92.0 },
          branches: { pct: 91.0 },
          statements: { pct: 95.5 },
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageSummary))

      await expect(monitor.enforceCoverage()).resolves.not.toThrow()
    })
  })

  describe('getUncoveredFiles', () => {
    it('should identify files with low coverage', async () => {
      const mockCoverageData = {
        '/src/lib/services/priceService.ts': {
          lines: { pct: 98.0 },
        },
        '/src/lib/services/predictionEngine.ts': {
          lines: { pct: 75.0 }, // Low coverage
        },
        '/src/components/Chart.tsx': {
          lines: { pct: 60.0 }, // Low coverage
        },
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageData))

      const uncovered = await monitor.getUncoveredFiles(80)

      expect(uncovered).toHaveLength(2)
      expect(uncovered[0]).toHaveProperty('file', '/src/components/Chart.tsx')
      expect(uncovered[0]).toHaveProperty('coverage', 60.0)
    })
  })
})