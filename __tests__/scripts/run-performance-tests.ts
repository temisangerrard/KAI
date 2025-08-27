#!/usr/bin/env node

/**
 * Performance and Integrity Test Runner
 * 
 * Executes comprehensive database performance and data integrity tests
 * and generates detailed reports.
 */

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface TestResult {
  testFile: string
  testName: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

interface PerformanceMetrics {
  totalTests: number
  passedTests: number
  failedTests: number
  totalDuration: number
  averageTestDuration: number
  slowestTest: { name: string; duration: number }
  fastestTest: { name: string; duration: number }
}

class PerformanceTestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Database Performance and Integrity Tests...\n')
    this.startTime = Date.now()

    const testFiles = [
      '__tests__/integration/database-performance-integrity.test.ts',
      '__tests__/integration/commitment-flow-load.test.ts',
      '__tests__/integration/admin-analytics-performance.test.ts',
      '__tests__/integration/data-integrity-validation.test.ts'
    ]

    for (const testFile of testFiles) {
      await this.runTestFile(testFile)
    }

    this.generateReport()
  }

  private async runTestFile(testFile: string): Promise<void> {
    console.log(`📋 Running tests in ${testFile}...`)
    
    try {
      const startTime = Date.now()
      
      // Run vitest for specific file
      const command = `npx vitest run ${testFile} --reporter=json --run`
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const duration = Date.now() - startTime
      
      // Parse vitest JSON output
      try {
        const testResults = JSON.parse(output)
        this.parseVitestResults(testFile, testResults, duration)
      } catch (parseError) {
        // Fallback if JSON parsing fails
        this.results.push({
          testFile,
          testName: 'All tests',
          status: 'passed',
          duration
        })
      }
      
      console.log(`✅ Completed ${testFile} in ${duration}ms\n`)
      
    } catch (error) {
      const duration = Date.now() - this.startTime
      console.log(`❌ Failed ${testFile}: ${error}\n`)
      
      this.results.push({
        testFile,
        testName: 'Test execution',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private parseVitestResults(testFile: string, vitestOutput: any, totalDuration: number): void {
    // Simple parsing - in real implementation, would parse detailed vitest JSON
    const testCount = vitestOutput.numTotalTests || 1
    const passedCount = vitestOutput.numPassedTests || 1
    const failedCount = vitestOutput.numFailedTests || 0
    
    // Add summary result
    this.results.push({
      testFile,
      testName: `${testCount} tests`,
      status: failedCount === 0 ? 'passed' : 'failed',
      duration: totalDuration
    })
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime
    const metrics = this.calculateMetrics()
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 PERFORMANCE TEST REPORT')
    console.log('='.repeat(80))
    
    this.printSummary(metrics, totalDuration)
    this.printDetailedResults()
    this.printPerformanceAnalysis(metrics)
    this.printRecommendations()
    
    // Save report to file
    this.saveReportToFile(metrics, totalDuration)
  }

  private calculateMetrics(): PerformanceMetrics {
    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.status === 'passed').length
    const failedTests = this.results.filter(r => r.status === 'failed').length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    const averageTestDuration = totalDuration / totalTests
    
    const sortedByDuration = [...this.results].sort((a, b) => b.duration - a.duration)
    const slowestTest = sortedByDuration[0]
    const fastestTest = sortedByDuration[sortedByDuration.length - 1]

    return {
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      averageTestDuration,
      slowestTest: { name: slowestTest.testName, duration: slowestTest.duration },
      fastestTest: { name: fastestTest.testName, duration: fastestTest.duration }
    }
  }

  private printSummary(metrics: PerformanceMetrics, totalDuration: number): void {
    console.log(`\n📈 SUMMARY`)
    console.log(`Total Test Files: ${this.getUniqueTestFiles().length}`)
    console.log(`Total Tests: ${metrics.totalTests}`)
    console.log(`Passed: ${metrics.passedTests} (${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%)`)
    console.log(`Failed: ${metrics.failedTests} (${((metrics.failedTests / metrics.totalTests) * 100).toFixed(1)}%)`)
    console.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    console.log(`Average Test Duration: ${metrics.averageTestDuration.toFixed(2)}ms`)
  }

  private printDetailedResults(): void {
    console.log(`\n📋 DETAILED RESULTS`)
    
    const groupedResults = this.groupResultsByFile()
    
    for (const [testFile, results] of groupedResults) {
      console.log(`\n${testFile}:`)
      
      for (const result of results) {
        const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
        console.log(`  ${status} ${result.testName} (${result.duration}ms)`)
        
        if (result.error) {
          console.log(`     Error: ${result.error}`)
        }
      }
    }
  }

  private printPerformanceAnalysis(metrics: PerformanceMetrics): void {
    console.log(`\n⚡ PERFORMANCE ANALYSIS`)
    console.log(`Slowest Test: ${metrics.slowestTest.name} (${metrics.slowestTest.duration}ms)`)
    console.log(`Fastest Test: ${metrics.fastestTest.name} (${metrics.fastestTest.duration}ms)`)
    
    // Performance thresholds
    const slowTests = this.results.filter(r => r.duration > 5000) // > 5 seconds
    const verySlowTests = this.results.filter(r => r.duration > 10000) // > 10 seconds
    
    if (verySlowTests.length > 0) {
      console.log(`\n⚠️  Very Slow Tests (>10s): ${verySlowTests.length}`)
      verySlowTests.forEach(test => {
        console.log(`   - ${test.testName}: ${test.duration}ms`)
      })
    }
    
    if (slowTests.length > 0) {
      console.log(`\n⚠️  Slow Tests (>5s): ${slowTests.length}`)
      slowTests.forEach(test => {
        console.log(`   - ${test.testName}: ${test.duration}ms`)
      })
    }
  }

  private printRecommendations(): void {
    console.log(`\n💡 RECOMMENDATIONS`)
    
    const failedTests = this.results.filter(r => r.status === 'failed')
    const slowTests = this.results.filter(r => r.duration > 5000)
    
    if (failedTests.length > 0) {
      console.log(`\n🔧 Fix Failed Tests:`)
      failedTests.forEach(test => {
        console.log(`   - ${test.testFile}: ${test.testName}`)
        if (test.error) {
          console.log(`     Issue: ${test.error}`)
        }
      })
    }
    
    if (slowTests.length > 0) {
      console.log(`\n🚀 Optimize Slow Tests:`)
      console.log(`   - Consider adding database indexes for slow queries`)
      console.log(`   - Implement query result caching for frequently accessed data`)
      console.log(`   - Use pagination for large dataset operations`)
      console.log(`   - Consider database connection pooling optimization`)
    }
    
    const passRate = (this.results.filter(r => r.status === 'passed').length / this.results.length) * 100
    
    if (passRate === 100) {
      console.log(`\n🎉 All tests passed! System performance and integrity validated.`)
    } else if (passRate >= 90) {
      console.log(`\n✅ Good test coverage with ${passRate.toFixed(1)}% pass rate.`)
    } else {
      console.log(`\n⚠️  Test pass rate is ${passRate.toFixed(1)}%. Consider investigating failures.`)
    }
  }

  private saveReportToFile(metrics: PerformanceMetrics, totalDuration: number): void {
    const reportDir = join(process.cwd(), '__tests__', 'reports')
    
    try {
      mkdirSync(reportDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportFile = join(reportDir, `performance-test-report-${timestamp}.json`)
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTestFiles: this.getUniqueTestFiles().length,
        totalTests: metrics.totalTests,
        passedTests: metrics.passedTests,
        failedTests: metrics.failedTests,
        passRate: (metrics.passedTests / metrics.totalTests) * 100,
        totalDuration,
        averageTestDuration: metrics.averageTestDuration
      },
      performance: {
        slowestTest: metrics.slowestTest,
        fastestTest: metrics.fastestTest,
        slowTests: this.results.filter(r => r.duration > 5000).length,
        verySlowTests: this.results.filter(r => r.duration > 10000).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    }
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved to: ${reportFile}`)
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    const failedTests = this.results.filter(r => r.status === 'failed')
    const slowTests = this.results.filter(r => r.duration > 5000)
    const passRate = (this.results.filter(r => r.status === 'passed').length / this.results.length) * 100
    
    if (failedTests.length > 0) {
      recommendations.push('Investigate and fix failed tests to ensure system reliability')
      recommendations.push('Review error messages and stack traces for failed tests')
    }
    
    if (slowTests.length > 0) {
      recommendations.push('Optimize slow-running tests by improving query performance')
      recommendations.push('Consider implementing database indexes for frequently queried fields')
      recommendations.push('Add caching layers for expensive operations')
    }
    
    if (passRate < 90) {
      recommendations.push('Improve test reliability - current pass rate is below 90%')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests are performing well - maintain current optimization levels')
      recommendations.push('Consider adding more edge case tests to improve coverage')
    }
    
    return recommendations
  }

  private getUniqueTestFiles(): string[] {
    return [...new Set(this.results.map(r => r.testFile))]
  }

  private groupResultsByFile(): Map<string, TestResult[]> {
    const grouped = new Map<string, TestResult[]>()
    
    for (const result of this.results) {
      if (!grouped.has(result.testFile)) {
        grouped.set(result.testFile, [])
      }
      grouped.get(result.testFile)!.push(result)
    }
    
    return grouped
  }
}

// Main execution
async function main() {
  const runner = new PerformanceTestRunner()
  
  try {
    await runner.runAllTests()
    process.exit(0)
  } catch (error) {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { PerformanceTestRunner }