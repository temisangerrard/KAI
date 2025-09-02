"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  X, 
  ArrowDownLeft, 
  Copy, 
  CheckCircle,
  QrCode,
  Share,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ReceiveModalProps {
  isOpen: boolean
  onClose: () => void
  address: string | null
  onCopyAddress: (address: string) => void
  copied: boolean
}

export function ReceiveModal({
  isOpen,
  onClose,
  address,
  onCopyAddress,
  copied
}: ReceiveModalProps) {
  const [showFullAddress, setShowFullAddress] = useState(false)

  if (!isOpen) return null

  const formatAddress = (addr: string) => {
    if (showFullAddress) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleShare = async () => {
    if (navigator.share && address) {
      try {
        await navigator.share({
          title: 'My Wallet Address',
          text: `Send tokens to my wallet: ${address}`,
          url: `https://basescan.org/address/${address}`
        })
      } catch (err) {
        console.log('Share failed:', err)
        // Fallback to copy
        onCopyAddress(address)
      }
    } else if (address) {
      onCopyAddress(address)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Receive Tokens</h2>
                <p className="text-sm text-gray-500">Share your wallet address</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Network Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Base Network Only</p>
                <p className="text-xs text-amber-600 mt-1">
                  Only send Base network assets to this address. Sending tokens from other networks may result in permanent loss.
                </p>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 mb-4">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-500">QR Code</div>
                  <div className="text-xs text-gray-400 mt-1">Coming Soon</div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                Scan this QR code to get your wallet address
              </p>
            </div>

            {/* Address Display */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Your Wallet Address
              </label>
              
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Base Network</span>
                  <button
                    onClick={() => setShowFullAddress(!showFullAddress)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {showFullAddress ? 'Hide' : 'Show Full'}
                  </button>
                </div>
                
                <div className="font-mono text-sm text-gray-900 break-all">
                  {address ? formatAddress(address) : 'Loading...'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => address && onCopyAddress(address)}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
                disabled={!address}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleShare}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
                disabled={!address}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                This address works for ETH, USDC, WETH and other Base network tokens
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}