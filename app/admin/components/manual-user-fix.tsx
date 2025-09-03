"use client"

import React, { useState } from 'react'
import { useAuth } from '@/app/auth/auth-context'

export function ManualUserFix() {
  const { fixOrphanedUser } = useAuth()
  const [walletAddress, setWalletAddress] = useState('')
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address')
      return
    }

    try {
      setIsFixing(true)
      setError(null)
      setResult(null)
      
      console.log('🔧 Fixing user from admin panel:', walletAddress)
      const success = await fixOrphanedUser(walletAddress.trim())
      
      setResult(success)
      console.log('✅ Fix completed:', success)
      
    } catch (err) {
      console.error('❌ Fix failed:', err)
      setError(err instanceof Error ? err.message : 'Fix failed')
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Manual User Fix
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Fix a specific orphaned CDP user by wallet address. Use this if you know a specific user is having issues.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Address
          </label>
          <input
            type="text"
            id="walletAddress"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isFixing}
          />
        </div>

        <button
          onClick={handleFix}
          disabled={isFixing || !walletAddress.trim()}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isFixing || !walletAddress.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isFixing ? 'Fixing User...' : 'Fix User'}
        </button>

        {result !== null && (
          <div className={`p-4 border rounded-md ${
            result 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <h4 className={`text-sm font-medium mb-2 ${
              result ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {result ? 'Fix Successful' : 'Fix Not Needed'}
            </h4>
            <p className={`text-sm ${
              result ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {result 
                ? 'User profile has been created successfully. The user should now be able to access the app.'
                : 'No fix was needed. The user profile may already exist or the wallet address was not found.'
              }
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Fix Failed</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Known orphaned user:</strong> 0xf912f3A46374e3b1f4C0072169aFf3262e926Fd1</p>
          <p><strong>Email:</strong> adandeche@gmail.com</p>
        </div>
      </div>
    </div>
  )
}