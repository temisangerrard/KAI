"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DatabaseMigrationService, MigrationResult, MigrationProgress } from "@/lib/services/database-migration-service"
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  BarChart3
} from "lucide-react"

export default function DatabaseMigrationPage() {
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  const runMigration = async () => {
    setIsRunning(true)
    setMigrationResult(null)
    setMigrationProgress(null)
    
    try {
      const result = await DatabaseMigrationService.migrateDatabase((progress) => {
        setMigrationProgress(progress)
      })
      
      setMigrationResult(result)
    } catch (error) {
      console.error('Migration failed:', error)
      setMigrationResult({
        success: false,
        migratedMarkets: 0,
        migratedCommitments: 0,
        migratedBalances: 0,
        errors: [`Migration failed: ${error}`]
      })
    } finally {
      setIsRunning(false)
      setMigrationProgress(null)
    }
  }

  const validateMigration = async () => {
    try {
      const result = await DatabaseMigrationService.validateMigration()
      setValidationResult(result)
    } catch (error) {
      console.error('Validation failed:', error)
      setValidationResult({
        isValid: false,
        issues: [`Validation failed: ${error}`],
        summary: { markets: 0, commitments: 0, balances: 0 }
      })
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Migration</h1>
        <p className="text-gray-600">
          Migrate from the current database structure to the optimized structure for better 
          token commitment tracking and real-time odds calculation.
        </p>
      </div>

      {/* Migration Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-500" />
            Migration Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">1</div>
              <div className="text-sm text-gray-600">Migrate Markets</div>
              <div className="text-xs text-gray-500 mt-1">
                Convert market structure with embedded statistics
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">2</div>
              <div className="text-sm text-gray-600">Migrate Commitments</div>
              <div className="text-xs text-gray-500 mt-1">
                Update commitment structure for better tracking
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">3</div>
              <div className="text-sm text-gray-600">Update Statistics</div>
              <div className="text-xs text-gray-500 mt-1">
                Calculate real-time market statistics
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migration Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={runMigration} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isRunning ? 'Running Migration...' : 'Start Migration'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={validateMigration}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Validate Migration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress */}
      {migrationProgress && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin text-blue-500" />
              Migration Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{migrationProgress.stage}</span>
                  <span>{migrationProgress.percentage}%</span>
                </div>
                <Progress value={migrationProgress.percentage} className="h-2" />
              </div>
              <div className="text-sm text-gray-600">
                Processing {migrationProgress.current} of {migrationProgress.total} items
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {migrationResult.success ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              )}
              Migration Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {migrationResult.migratedMarkets}
                </div>
                <div className="text-sm text-gray-600">Markets Migrated</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {migrationResult.migratedCommitments}
                </div>
                <div className="text-sm text-gray-600">Commitments Migrated</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {migrationResult.migratedBalances}
                </div>
                <div className="text-sm text-gray-600">Balances Migrated</div>
              </div>
            </div>

            {migrationResult.errors.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Migration Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {migrationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {migrationResult.success && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Migration completed successfully! Your database has been optimized for 
                  better token commitment tracking and real-time odds calculation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {validationResult.summary.markets}
                </div>
                <div className="text-sm text-gray-600">Markets Found</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {validationResult.summary.commitments}
                </div>
                <div className="text-sm text-gray-600">Commitments Found</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {validationResult.summary.balances}
                </div>
                <div className="text-sm text-gray-600">Balances Found</div>
              </div>
            </div>

            {validationResult.issues.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Validation Issues:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.isValid && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Database validation passed! All migrated data is consistent and properly structured.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Benefits of the Optimized Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Performance Improvements</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Atomic market statistics updates
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Real-time odds calculation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Efficient token commitment tracking
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Data Accuracy</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Consistent market statistics
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Accurate participant counts
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Reliable balance tracking
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}