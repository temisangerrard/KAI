"use client"

import React, { useState } from 'react'
import { useAuth } from '@/app/auth/auth-context'

export function UserRecoveryPanel() {
  const { recoverOrphanedUsers } = useAuth()
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<{ recovered: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecovery = async () => {
    try {
      setIsRecovering(true)
      setError(null)
      setRecoveryResult(null)
      
      console.log('🔧 Starting user recovery from admin panel...')
      const result = await recoverOrphanedUsers()
      
      setRecoveryResult(result)
      console.log('✅ Recovery completed:', result)
      
    } catch (err) {
      console.error('❌ Recovery failed:', err)
      setError(err instanceof Error ? err.message : 'Recovery failed')
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        CDP User Recovery
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        This tool helps recover CDP users who have wallet mappings but no user profiles. 
        This can happen if user creation failed during the signup process.
      </p>

      <div className="space-y-4">
        <button
          onClick={handleRecovery}
          disabled={isRecovering}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isRecovering
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRecovering ? 'Recovering Users...' : 'Recover Orphaned Users'}
        </button>

        {recoveryResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="text-sm font-medium text-green-800 mb-2">Recovery Complete</h4>
            <div className="text-sm text-green-700">
              <p>✅ Users recovered: {recoveryResult.recovered}</p>
              <p>❌ Recovery failures: {recoveryResult.failed}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Recovery Failed</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Note:</strong> This process is safe to run multiple times. It only creates missing user profiles and won't affect existing users.</p>
        </div>
      </div>
    </div>
  )
}