"use client"

import { useIsSignedIn, useCurrentUser, useEvmAddress, useIsInitialized } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"

export default function DebugCDPPage() {
  const isSignedIn = useIsSignedIn()
  const currentUser = useCurrentUser()
  const evmAddress = useEvmAddress()
  const isInitialized = useIsInitialized()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">CDP Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CDP Hook States</h2>
          <div className="space-y-4">
            <div>
              <strong>isInitialized:</strong> {String(isInitialized)}
            </div>
            <div>
              <strong>isSignedIn:</strong> {String(isSignedIn)}
            </div>
            <div>
              <strong>currentUser:</strong> {JSON.stringify(currentUser, null, 2)}
            </div>
            <div>
              <strong>evmAddress:</strong> {JSON.stringify(evmAddress, null, 2)}
            </div>
            <div>
              <strong>evmAddress type:</strong> {typeof evmAddress}
            </div>
            <div>
              <strong>evmAddress.address:</strong> {evmAddress?.address || 'N/A'}
            </div>
            <div>
              <strong>evmAddress.toString():</strong> {evmAddress?.toString?.() || 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Extracted Values</h2>
          <div className="space-y-4">
            <div>
              <strong>Extracted isSignedIn:</strong> {String(isSignedIn?.isSignedIn ?? false)}
            </div>
            <div>
              <strong>Extracted Address:</strong> {evmAddress?.evmAddress || 'N/A'}
            </div>
            <div>
              <strong>Extracted Email:</strong> {currentUser?.currentUser?.authenticationMethods?.email?.email || 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CDP Auth Button</h2>
          <AuthButton />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div>
              <strong>CDP_PROJECT_ID:</strong> {process.env.NEXT_PUBLIC_CDP_PROJECT_ID ? 'Set' : 'Not Set'}
            </div>
            <div>
              <strong>CDP_PROJECT_ID Value:</strong> {process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}