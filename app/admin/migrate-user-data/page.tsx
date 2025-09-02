"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { migrateUserDataToCDP, checkMigrationNeeded } from '@/lib/migration/user-data-migration'
import { migrateAdminRecord, checkAdminMigrationNeeded } from '@/lib/migration/admin-migration'

export default function MigrateUserDataPage() {
  const [email, setEmail] = useState('tagbajoh@gmail.com')
  const [walletAddress, setWalletAddress] = useState('0x656829b6800FE4e25CACC87744cC85c6c80D9e76')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null)
  const [adminMigrationNeeded, setAdminMigrationNeeded] = useState<boolean | null>(null)

  const checkMigration = async () => {
    if (!email || !walletAddress) return
    
    setLoading(true)
    try {
      const needed = await checkMigrationNeeded(email, walletAddress)
      const adminNeeded = await checkAdminMigrationNeeded(email, walletAddress)
      setMigrationNeeded(needed)
      setAdminMigrationNeeded(adminNeeded)
    } catch (error) {
      console.error('Error checking migration:', error)
      setResult({
        success: false,
        message: 'Error checking migration status'
      })
    } finally {
      setLoading(false)
    }
  }

  const performMigration = async () => {
    if (!email || !walletAddress) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const results = []
      
      // Migrate user data if needed
      if (migrationNeeded) {
        const migrationResult = await migrateUserDataToCDP(email, walletAddress, displayName)
        results.push({ type: 'User Data', ...migrationResult })
      }
      
      // Migrate admin record if needed
      if (adminMigrationNeeded) {
        const adminMigrationResult = await migrateAdminRecord(email, walletAddress)
        results.push({ type: 'Admin Record', ...adminMigrationResult })
      }
      
      setResult({
        success: results.every(r => r.success),
        message: results.map(r => `${r.type}: ${r.message}`).join('\n'),
        results: results
      })
      
      // Recheck migration status
      if (results.every(r => r.success)) {
        setMigrationNeeded(false)
        setAdminMigrationNeeded(false)
      }
    } catch (error) {
      console.error('Migration error:', error)
      setResult({
        success: false,
        message: 'Migration failed with error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Data Migration</h1>
          <p className="text-gray-600">
            Migrate existing Firebase Auth user data to CDP wallet-based authentication
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Migration Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="walletAddress">CDP Wallet Address</Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            
            <div>
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="User's display name"
              />
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={checkMigration}
                disabled={loading || !email || !walletAddress}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Check Migration Status
              </Button>
              
              <Button
                onClick={performMigration}
                disabled={loading || !email || !walletAddress || migrationNeeded === false}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Perform Migration
              </Button>
            </div>
          </div>
        </Card>

        {migrationNeeded !== null && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              {migrationNeeded ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <h3 className="text-lg font-semibold">Migration Status</h3>
            </div>
            
            <Alert className={migrationNeeded ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              <AlertDescription>
                {migrationNeeded 
                  ? "Migration is needed - existing user data found that needs to be linked to the wallet address."
                  : "No migration needed - either no existing data found or wallet address already has a profile."
                }
              </AlertDescription>
            </Alert>
          </Card>
        )}

        {result && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <h3 className="text-lg font-semibold">Migration Result</h3>
            </div>
            
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p>{result.message}</p>
                  
                  {result.migratedData && (
                    <div className="mt-4">
                      <p className="font-medium">Migrated Data:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {result.migratedData.userProfile && <li>User profile</li>}
                        {result.migratedData.predictions > 0 && <li>{result.migratedData.predictions} predictions</li>}
                        {result.migratedData.tokenTransactions > 0 && <li>{result.migratedData.tokenTransactions} token transactions</li>}
                        {result.migratedData.markets > 0 && <li>{result.migratedData.markets} created markets</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </Card>
        )}
      </div>
    </div>
  )
}