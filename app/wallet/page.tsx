'use client'

import {
  useEvmAddress,
  useSendEvmTransaction,
  useCurrentUser,
  useSendUserOperation
} from '@coinbase/cdp-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, CheckCircle, Wallet, ArrowUpRight, ArrowDownLeft, Shield, RefreshCw, AlertCircle, Coins } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'

function WalletPageContent() {
  const { evmAddress: address } = useEvmAddress()
  const { currentUser } = useCurrentUser()
  const { sendEvmTransaction } = useSendEvmTransaction()
  const { sendUserOperation } = useSendUserOperation()
  const [balanceData, setBalanceData] = useState<bigint | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Local state
  const [copied, setCopied] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    asset: 'ETH'
  })
  const [useSmartAccount, setUseSmartAccount] = useState(true)
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<any[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)

  // Create viem client for Base network
  const client = createPublicClient({
    chain: base,
    transport: http(),
  })

  // Common ERC-20 tokens on Base
  const commonTokens = [
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    {
      address: '0x4200000000000000000000000000000000000006' as `0x${string}`, // WETH on Base
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18
    }
  ]

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendTransaction = async () => {
    if (!sendForm.to || !sendForm.amount || !address) return

    try {
      setError(null)
      setTransactionStatus('sending')

      if (sendForm.asset === 'ETH') {
        // Send ETH
        if (useSmartAccount && currentUser?.evmSmartAccounts?.[0]) {
          await sendUserOperation({
            evmSmartAccount: currentUser.evmSmartAccounts[0],
            network: 'base',
            calls: [{
              to: sendForm.to,
              value: BigInt(Math.floor(parseFloat(sendForm.amount) * 1e18)),
              data: "0x"
            }]
          })
        } else {
          await sendEvmTransaction({
            evmAccount: address,
            network: 'base',
            transaction: {
              to: sendForm.to,
              value: BigInt(Math.floor(parseFloat(sendForm.amount) * 1e18)),
              gas: 21000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              type: "eip1559"
            }
          })
        }
      } else {
        // Send ERC-20 token
        const token = commonTokens.find(t => t.symbol === sendForm.asset)
        if (!token) throw new Error('Token not supported')

        const amount = BigInt(Math.floor(parseFloat(sendForm.amount) * Math.pow(10, token.decimals)))

        // ERC-20 transfer function call data
        const transferData = `0xa9059cbb${sendForm.to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`

        if (useSmartAccount && currentUser?.evmSmartAccounts?.[0]) {
          await sendUserOperation({
            evmSmartAccount: currentUser.evmSmartAccounts[0],
            network: 'base',
            calls: [{
              to: token.address,
              value: 0n,
              data: transferData as `0x${string}`
            }]
          })
        } else {
          await sendEvmTransaction({
            evmAccount: address,
            network: 'base',
            transaction: {
              to: token.address,
              value: 0n,
              data: transferData as `0x${string}`,
              gas: 65000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              type: "eip1559"
            }
          })
        }
      }

      setTransactionStatus('success')
      setSendForm({ to: '', amount: '', asset: 'ETH' })
      setShowSendForm(false)

      // Refresh all balances after transaction
      setTimeout(() => {
        fetchEthBalance()
        fetchAllBalances()
        setTransactionStatus(null)
      }, 3000)
    } catch (error: any) {
      console.error('Transaction failed:', error)
      setError(error?.message || 'Transaction failed')
      setTransactionStatus('failed')
    }
  }

  // Fetch ETH balance
  const fetchEthBalance = async () => {
    if (!address) return
    
    try {
      setBalanceLoading(true)
      const balance = await client.getBalance({
        address: address as `0x${string}`
      })
      setBalanceData(balance)
    } catch (err) {
      console.error('Failed to fetch ETH balance:', err)
    } finally {
      setBalanceLoading(false)
    }
  }

  // Format balance for display
  const formatBalance = (balance: any) => {
    if (!balance) return '0.00'
    const value = parseFloat(balance.toString())
    return (value / 1e18).toFixed(4)
  }

  // Fetch all token balances (ETH + ERC-20s)
  const fetchAllBalances = async () => {
    if (!address) return

    try {
      setLoadingTokens(true)
      const balances = []

      // Add ETH balance (from CDP hook)
      if (balanceData) {
        balances.push({
          symbol: 'ETH',
          name: 'Ethereum',
          balance: formatBalance(balanceData),
          formatted: `${formatBalance(balanceData)} ETH`,
          isNative: true
        })
      }

      // Fetch ERC-20 token balances
      for (const token of commonTokens) {
        try {
          const balance = await client.readContract({
            address: token.address,
            abi: [
              {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'account', type: 'address' }],
                outputs: [{ name: '', type: 'uint256' }],
              },
            ],
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          })

          const formattedBalance = formatUnits(balance as bigint, token.decimals)
          const numericBalance = parseFloat(formattedBalance)

          // Only show tokens with balance > 0
          if (numericBalance > 0) {
            balances.push({
              symbol: token.symbol,
              name: token.name,
              balance: numericBalance.toFixed(token.decimals === 6 ? 2 : 4),
              formatted: `${numericBalance.toFixed(token.decimals === 6 ? 2 : 4)} ${token.symbol}`,
              isNative: false
            })
          }
        } catch (err) {
          console.log(`Failed to fetch ${token.symbol} balance:`, err)
        }
      }

      setTokenBalances(balances)
    } catch (err) {
      console.error('Failed to fetch token balances:', err)
    } finally {
      setLoadingTokens(false)
    }
  }

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Fetch ETH balance when address changes
  useEffect(() => {
    if (address) {
      fetchEthBalance()
    }
  }, [address])

  // Fetch all balances when address or ETH balance changes
  useEffect(() => {
    if (address && !balanceLoading) {
      fetchAllBalances()
    }
  }, [address, balanceData, balanceLoading])



  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-sage-600" />
            <h1 className="text-3xl font-bold text-sage-800">Your Wallet</h1>
          </div>
          <p className="text-gray-600">Send, receive, and manage your tokens</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold">Transaction Failed</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {transactionStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-green-800 font-semibold">Transaction Sent!</h3>
                <p className="text-green-700 text-sm mt-1">Your transaction has been submitted successfully</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wallet Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Address Card */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Your Wallet Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-sage-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-mono text-sm text-gray-900 break-all">
                        {address}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(address || '')}
                      className="ml-3 flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {currentUser?.evmSmartAccounts?.length && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Gasless transactions enabled</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Balance Card */}
            <Card className="border-sage-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Balance</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchEthBalance()
                    fetchAllBalances()
                  }}
                  disabled={balanceLoading || loadingTokens}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${balanceLoading || loadingTokens ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {balanceLoading || loadingTokens ? (
                    <div className="text-center p-6 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-sage-600" />
                      <div className="text-sage-800">Loading balances...</div>
                    </div>
                  ) : tokenBalances.length > 0 ? (
                    <div className="space-y-3">
                      {tokenBalances.map((token, index) => (
                        <div key={token.symbol} className="p-4 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${token.isNative ? 'bg-blue-100' : 'bg-green-100'
                                }`}>
                                <Coins className={`h-5 w-5 ${token.isNative ? 'text-blue-600' : 'text-green-600'
                                  }`} />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-sage-800">
                                  {token.formatted}
                                </p>
                                <p className="text-sm text-gray-600">{token.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {token.isNative ? 'Native Token' : 'ERC-20'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                      <Coins className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <div className="text-gray-600">No tokens found</div>
                      <p className="text-sm text-gray-500 mt-1">Your tokens will appear here</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => setShowReceiveModal(true)}
                    >
                      <ArrowDownLeft className="h-4 w-4" />
                      Receive
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => setShowSendForm(true)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Send Transaction Form */}
            {showSendForm && (
              <Card className="border-sage-200">
                <CardHeader>
                  <CardTitle>Send ETH</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transaction Method Selection */}
                  {currentUser?.evmSmartAccounts?.length && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useSmartAccount"
                        checked={useSmartAccount}
                        onChange={(e) => setUseSmartAccount(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="useSmartAccount" className="text-sm">
                        Use gasless transaction (recommended)
                      </Label>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="recipient">Send to</Label>
                    <Input
                      id="recipient"
                      placeholder="Enter wallet address (0x...)"
                      value={sendForm.to}
                      onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        id="amount"
                        type="number"
                        step="0.001"
                        placeholder="0.00"
                        value={sendForm.amount}
                        onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="flex-1"
                      />
                      <select
                        value={sendForm.asset}
                        onChange={(e) => setSendForm(prev => ({ ...prev, asset: e.target.value }))}
                        className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[80px]"
                      >
                        {tokenBalances.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Transaction Status */}
                  {transactionStatus === 'sending' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">
                          Sending transaction...
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendTransaction}
                      disabled={transactionStatus === 'sending' || !sendForm.to || !sendForm.amount}
                      className="flex-1 bg-sage-600 hover:bg-sage-700"
                    >
                      {transactionStatus === 'sending' ? 'Sending...' : `Send ${useSmartAccount ? '(Gasless)' : ''}`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSendForm(false)
                        setSendForm({ to: '', amount: '', asset: 'ETH' })
                        setTransactionStatus(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receive Modal */}
            {showReceiveModal && (
              <Card className="border-sage-200">
                <CardHeader>
                  <CardTitle>Receive ETH</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Share this address to receive ETH and tokens
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg break-all font-mono text-sm">
                      {address}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => copyToClipboard(address || '')}
                        className="flex-1 bg-sage-600 hover:bg-sage-700"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
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
                        variant="outline"
                        onClick={() => setShowReceiveModal(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      {currentUser?.evmSmartAccounts?.length ? 'Smart Wallet' : 'Standard'}
                    </span>
                    {currentUser?.evmSmartAccounts?.length && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold">Base</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gas Fees</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      {currentUser?.evmSmartAccounts?.length ? 'Free' : 'Standard'}
                    </span>
                    {currentUser?.evmSmartAccounts?.length && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Help & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Need help with your wallet? Check out these resources:
                </p>

                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => window.open('https://help.coinbase.com/en/wallet', '_blank')}
                >
                  Help Center
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => window.open('https://help.coinbase.com/en/wallet/getting-started/recovery-phrase', '_blank')}
                >
                  Recovery Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WalletPage() {
  return <WalletPageContent />
}