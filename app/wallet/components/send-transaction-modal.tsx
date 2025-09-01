"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  X, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Coins,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SendTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  tokenBalances: any[]
  onSendTransaction: (form: SendFormData) => Promise<void>
  transactionStatus: string | null
  error: string | null
  useSmartAccount: boolean
  onToggleSmartAccount: (enabled: boolean) => void
  hasSmartAccount: boolean
}

export interface SendFormData {
  to: string
  amount: string
  asset: string
}

export function SendTransactionModal({
  isOpen,
  onClose,
  tokenBalances,
  onSendTransaction,
  transactionStatus,
  error,
  useSmartAccount,
  onToggleSmartAccount,
  hasSmartAccount
}: SendTransactionModalProps) {
  const [sendForm, setSendForm] = useState<SendFormData>({
    to: '',
    amount: '',
    asset: 'ETH'
  })
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [formErrors, setFormErrors] = useState<{
    to?: string
    amount?: string
  }>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSendForm({ to: '', amount: '', asset: 'ETH' })
      setFormErrors({})
      setShowAssetDropdown(false)
    }
  }, [isOpen])

  // Validate form
  const validateForm = () => {
    const errors: { to?: string; amount?: string } = {}
    
    if (!sendForm.to) {
      errors.to = "Recipient address is required"
    } else if (!sendForm.to.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.to = "Please enter a valid Ethereum address"
    }
    
    if (!sendForm.amount) {
      errors.amount = "Amount is required"
    } else if (isNaN(parseFloat(sendForm.amount)) || parseFloat(sendForm.amount) <= 0) {
      errors.amount = "Please enter a valid amount"
    } else {
      const selectedToken = tokenBalances.find(t => t.symbol === sendForm.asset)
      const availableBalance = selectedToken ? parseFloat(selectedToken.balance) : 0
      if (parseFloat(sendForm.amount) > availableBalance) {
        errors.amount = `Insufficient balance. Available: ${availableBalance} ${sendForm.asset}`
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      await onSendTransaction(sendForm)
    } catch (err) {
      console.error('Transaction failed:', err)
    }
  }

  const handleMaxAmount = () => {
    const selectedToken = tokenBalances.find(t => t.symbol === sendForm.asset)
    if (selectedToken) {
      setSendForm(prev => ({ ...prev, amount: selectedToken.balance }))
    }
  }

  const selectedToken = tokenBalances.find(t => t.symbol === sendForm.asset)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Send Tokens</h2>
                <p className="text-sm text-gray-500">Transfer tokens to another address</p>
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
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Asset
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                      selectedToken?.isNative 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-primary-100 text-primary-700"
                    )}>
                      {sendForm.asset.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{sendForm.asset}</div>
                      <div className="text-sm text-gray-500">
                        Balance: {selectedToken?.balance || '0.00'}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    showAssetDropdown && "rotate-180"
                  )} />
                </button>

                {/* Dropdown */}
                {showAssetDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {tokenBalances.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          setSendForm(prev => ({ ...prev, asset: token.symbol }))
                          setShowAssetDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                          token.isNative 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-primary-100 text-primary-700"
                        )}>
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900">{token.symbol}</div>
                          <div className="text-sm text-gray-500">{token.balance}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          ${token.usdValue ? token.usdValue.toFixed(2) : '0.00'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  className={cn(
                    "pr-16 text-lg font-medium rounded-xl border-gray-200 focus:border-primary-400 focus:ring-primary-300",
                    formErrors.amount && "border-red-300 focus:border-red-400 focus:ring-red-300"
                  )}
                />
                <button 
                  onClick={handleMaxAmount}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors"
                >
                  Max
                </button>
              </div>
              {formErrors.amount && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.amount}
                </p>
              )}
              {selectedToken && sendForm.amount && !formErrors.amount && (
                <p className="mt-1 text-sm text-gray-500">
                  ≈ ${(parseFloat(sendForm.amount) * (selectedToken.usdValue || 0) / parseFloat(selectedToken.balance)).toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Recipient Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <Input
                placeholder="0x... or ENS name"
                value={sendForm.to}
                onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                className={cn(
                  "font-mono text-sm rounded-xl border-gray-200 focus:border-primary-400 focus:ring-primary-300",
                  formErrors.to && "border-red-300 focus:border-red-400 focus:ring-red-300"
                )}
              />
              {formErrors.to && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.to}
                </p>
              )}
            </div>

            {/* Gasless Option */}
            {hasSmartAccount && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <input
                  type="checkbox"
                  id="useSmartAccount"
                  checked={useSmartAccount}
                  onChange={(e) => onToggleSmartAccount(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-white border-green-300 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="useSmartAccount" className="text-sm font-medium text-green-800 cursor-pointer flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Use gasless transaction
                  </label>
                  <p className="text-xs text-green-600 mt-1">
                    No gas fees required with your smart wallet
                  </p>
                </div>
              </div>
            )}

            {/* Transaction Status */}
            {transactionStatus === 'sending' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Sending transaction...</p>
                    <p className="text-xs text-blue-600 mt-1">Please wait while we process your transaction</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Transaction Failed</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {transactionStatus === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Transaction Sent!</p>
                    <p className="text-xs text-green-600 mt-1">Your transaction has been submitted successfully</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
                disabled={transactionStatus === 'sending'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={transactionStatus === 'sending' || !sendForm.to || !sendForm.amount}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
              >
                {transactionStatus === 'sending' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Send {sendForm.asset}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}