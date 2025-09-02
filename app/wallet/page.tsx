'use client'

import {
  useEvmAddress,
  useSendEvmTransaction,
  useCurrentUser,
  useSendUserOperation
} from '@coinbase/cdp-hooks'
import { Button } from '@/components/ui/button'
import { Copy, CheckCircle, Wallet, ArrowUpRight, ArrowDownLeft, Shield, RefreshCw, AlertCircle, Coins } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { cn } from '@/lib/utils'
import { Navigation } from '../components/navigation'
import { TopNavigation } from '../components/top-navigation'
import { SendTransactionModal, SendFormData } from './components/send-transaction-modal'
import { ReceiveModal } from './components/receive-modal'

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
  const [useSmartAccount, setUseSmartAccount] = useState(true)
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<any[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [ethPrice, setEthPrice] = useState<number>(0)
  const [totalUsdValue, setTotalUsdValue] = useState<number>(0)

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

  // Fetch ETH price from CoinGecko
  const fetchEthPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const data = await response.json()
      const price = data.ethereum?.usd || 0
      setEthPrice(price)
      return price
    } catch (error) {
      console.error('Failed to fetch ETH price:', error)
      return 0
    }
  }

  // Calculate total USD value
  const calculateTotalUsdValue = (balances: any[], ethPriceValue: number) => {
    let total = 0

    balances.forEach(token => {
      const balance = parseFloat(token.balance)
      if (token.isNative) {
        // ETH
        total += balance * ethPriceValue
      } else if (token.symbol === 'USDC') {
        // USDC is 1:1 with USD
        total += balance
      } else if (token.symbol === 'WETH') {
        // WETH same price as ETH
        total += balance * ethPriceValue
      }
    })

    setTotalUsdValue(total)
    return total
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendTransaction = async (formData: SendFormData) => {
    if (!formData.to || !formData.amount || !address) return

    try {
      setError(null)
      setTransactionStatus('sending')

      if (formData.asset === 'ETH') {
        // Send ETH
        if (useSmartAccount && currentUser?.evmSmartAccounts?.[0]) {
          await sendUserOperation({
            evmSmartAccount: currentUser.evmSmartAccounts[0],
            network: 'base',
            calls: [{
              to: formData.to as `0x${string}`,
              value: BigInt(Math.floor(parseFloat(formData.amount) * 1e18)),
              data: "0x"
            }]
          })
        } else {
          await sendEvmTransaction({
            evmAccount: address,
            network: 'base',
            transaction: {
              to: formData.to as `0x${string}`,
              value: BigInt(Math.floor(parseFloat(formData.amount) * 1e18)),
              gas: 21000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              chainId: 8453,
              type: "eip1559"
            }
          })
        }
      } else {
        // Send ERC-20 token
        const token = commonTokens.find(t => t.symbol === formData.asset)
        if (!token) throw new Error('Token not supported')

        const amount = BigInt(Math.floor(parseFloat(formData.amount) * Math.pow(10, token.decimals)))

        // ERC-20 transfer function call data
        const transferData = `0xa9059cbb${formData.to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}` as `0x${string}`

        if (useSmartAccount && currentUser?.evmSmartAccounts?.[0]) {
          await sendUserOperation({
            evmSmartAccount: currentUser.evmSmartAccounts[0],
            network: 'base',
            calls: [{
              to: token.address,
              value: 0n,
              data: transferData
            }]
          })
        } else {
          await sendEvmTransaction({
            evmAccount: address,
            network: 'base',
            transaction: {
              to: token.address,
              value: 0n,
              data: transferData,
              gas: 65000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              chainId: 8453,
              type: "eip1559"
            }
          })
        }
      }

      setTransactionStatus('success')
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

      // Fetch current ETH price
      const currentEthPrice = await fetchEthPrice()

      // Add ETH balance (from CDP hook)
      if (balanceData) {
        const ethBalance = formatBalance(balanceData)
        const ethValue = parseFloat(ethBalance) * currentEthPrice

        balances.push({
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethBalance,
          formatted: `${ethBalance} ETH`,
          usdValue: ethValue,
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
            let usdValue = 0
            if (token.symbol === 'USDC') {
              usdValue = numericBalance // USDC is 1:1 with USD
            } else if (token.symbol === 'WETH') {
              usdValue = numericBalance * currentEthPrice // WETH same as ETH
            }

            balances.push({
              symbol: token.symbol,
              name: token.name,
              balance: numericBalance.toFixed(token.decimals === 6 ? 2 : 4),
              formatted: `${numericBalance.toFixed(token.decimals === 6 ? 2 : 4)} ${token.symbol}`,
              usdValue: usdValue,
              isNative: false
            })
          }
        } catch (err) {
          console.log(`Failed to fetch ${token.symbol} balance:`, err)
        }
      }

      setTokenBalances(balances)
      calculateTotalUsdValue(balances, currentEthPrice)
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

  // Fetch ETH price on component mount
  useEffect(() => {
    fetchEthPrice()
  }, [])

  return (
    <div className="min-h-screen">
      <TopNavigation />
      <div className="bg-gradient-to-br from-secondary-50 via-background to-primary-50 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto lg:max-w-4xl">
            {/* Responsive Wallet Layout */}
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              {/* Mobile: Full width header, Desktop: Left column header */}
              <div className="lg:col-span-2">
                {/* Wallet Header - Responsive */}
                <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 mb-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-white font-medium text-lg">Wallet</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        fetchEthBalance()
                        fetchAllBalances()
                        fetchEthPrice()
                      }}
                      disabled={balanceLoading || loadingTokens}
                      className="text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4",
                        (balanceLoading || loadingTokens) && "animate-spin"
                      )} />
                    </Button>
                  </div>

                  {/* Account Info - Responsive layout */}
                  <div className="lg:flex lg:items-center lg:justify-between">
                    <div className="text-center lg:text-left mb-6 lg:mb-0">
                      <div className="text-white/80 text-sm mb-1">Account 1</div>
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <span className="text-white/60 text-xs font-mono">
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(address || '')}
                          className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-6 w-6 p-0"
                        >
                          {copied ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Total Balance */}
                      <div className="text-center lg:text-left">
                        <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
                          {balanceLoading || loadingTokens ? (
                            <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse mx-auto lg:mx-0"></div>
                          ) : (
                            `$${totalUsdValue.toFixed(2)}`
                          )}
                        </div>
                        <div className="text-white/80 text-sm mb-2">
                          {!balanceLoading && !loadingTokens && (
                            `${tokenBalances.find(t => t.isNative)?.balance || '0.00'} ETH`
                          )}
                        </div>
                        <div className="text-white/60 text-xs">
                          {currentUser?.evmSmartAccounts?.length && (
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Smart Account
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions - Responsive */}
                    <div className="flex justify-center lg:justify-end gap-4">
                      <button
                        onClick={() => setShowReceiveModal(true)}
                        className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                          <ArrowDownLeft className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium">Receive</span>
                      </button>

                      <button
                        onClick={() => setShowSendForm(true)}
                        className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                          <ArrowUpRight className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium">Send</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-800 text-sm font-medium">Transaction Failed</p>
                        <p className="text-red-600 text-xs mt-1">{error}</p>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {transactionStatus === 'success' && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-green-800 text-sm font-medium">Transaction Sent!</p>
                        <p className="text-green-600 text-xs mt-1">Your transaction has been submitted successfully</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assets Section - Responsive */}
                <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Assets</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Base Network</span>
                    </div>
                  </div>

                  {/* Token List - Responsive grid */}
                  <div className="space-y-2">
                    {balanceLoading || loadingTokens ? (
                      <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                        <div className="text-gray-600 font-medium">Loading assets...</div>
                        <div className="text-gray-500 text-sm mt-1">Fetching your portfolio</div>
                      </div>
                    ) : tokenBalances.length > 0 ? (
                      tokenBalances.map((token) => (
                        <div
                          key={token.symbol}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100 hover:border-primary-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm",
                              token.isNative
                                ? "bg-blue-100 text-blue-700"
                                : "bg-primary-100 text-primary-700"
                            )}>
                              {token.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{token.symbol}</div>
                              <div className="text-sm text-gray-500">{token.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{token.balance}</div>
                            <div className="text-sm text-gray-500">
                              ${token.usdValue ? token.usdValue.toFixed(2) : '0.00'}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <Coins className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <div className="text-gray-600 font-medium text-lg">No assets found</div>
                        <p className="text-sm text-gray-500 mt-2">Your tokens will appear here once you receive them</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Sidebar */}
              <div className="hidden lg:block">
                <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">Account Type</span>
                      <span className={cn(
                        "text-sm font-semibold px-2 py-1 rounded-lg",
                        currentUser?.evmSmartAccounts?.length
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}>
                        {currentUser?.evmSmartAccounts?.length ? 'Smart Wallet' : 'Standard'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">Network</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">Base</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">Gas Fees</span>
                      <span className={cn(
                        "text-sm font-semibold px-2 py-1 rounded-lg",
                        currentUser?.evmSmartAccounts?.length
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}>
                        {currentUser?.evmSmartAccounts?.length ? 'Free' : 'Standard'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowSendForm(true)}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Send Tokens
                      </Button>
                      <Button
                        onClick={() => setShowReceiveModal(true)}
                        variant="outline"
                        className="w-full border-primary-200 hover:bg-primary-50 text-primary-700 rounded-xl"
                      >
                        <ArrowDownLeft className="h-4 w-4 mr-2" />
                        Receive Tokens
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Send Transaction Modal */}
            <SendTransactionModal
              isOpen={showSendForm}
              onClose={() => {
                setShowSendForm(false)
                setTransactionStatus(null)
                setError(null)
              }}
              tokenBalances={tokenBalances}
              onSendTransaction={handleSendTransaction}
              transactionStatus={transactionStatus}
              error={error}
              useSmartAccount={useSmartAccount}
              onToggleSmartAccount={setUseSmartAccount}
              hasSmartAccount={!!currentUser?.evmSmartAccounts?.length}
            />

            {/* Modern Receive Modal */}
            <ReceiveModal
              isOpen={showReceiveModal}
              onClose={() => setShowReceiveModal(false)}
              address={address}
              onCopyAddress={copyToClipboard}
              copied={copied}
            />
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  )
}

export default function WalletPage() {
  return <WalletPageContent />
}