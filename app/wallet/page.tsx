'use client'

import {
  useIsSignedIn,
  useEvmAddress,
  useSendEvmTransaction,
  useCurrentUser,
  useSendUserOperation,
  useWaitForUserOperation
} from '@coinbase/cdp-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, CheckCircle, Wallet, ArrowUpRight, ArrowDownLeft, Shield, ExternalLink, RefreshCw } from 'lucide-react'
import React, { useState, useCallback } from 'react'
import { useAuth } from '@/app/auth/auth-context'
import { ContextualHelp } from '@/app/components/contextual-help'
import { NetworkStatusComponent } from './components/network-status'
import { useNetworkStatus } from '@/hooks/use-network-status'

export default function WalletPage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress: address } = useEvmAddress()
  const { user } = useAuth()
  const { currentUser } = useCurrentUser()
  const { sendEvmTransaction, data: transactionData } = useSendEvmTransaction()
  const { sendUserOperation, data: userOpData, status: userOpStatus } = useSendUserOperation()
  
  // Network change callback (defined early to avoid reference error)
  const handleNetworkChange = useCallback((network: any) => {
    console.log('Network changed:', network)
    // Refresh wallet data when network changes
    if (network) {
      // handleRefresh will be defined later, so we'll call the functions directly
      fetchRealBalance()
      fetchRealTransactions()
    }
  }, [])

  // Network status management
  const { 
    networkStatus, 
    isLoading: networkLoading,
    isTestnet,
    networkName 
  } = useNetworkStatus({
    onNetworkChange: handleNetworkChange
  })

  const [copied, setCopied] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [balances, setBalances] = useState([
    { formatted: '0.000000', symbol: 'ETH', name: 'Ethereum', address: 'native' },
    { formatted: '0.000000', symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
  ])
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    asset: 'ETH'
  })
  const [sendingTransaction, setSendingTransaction] = useState(false)
  const [useSmartAccount, setUseSmartAccount] = useState(true)

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

    setSendingTransaction(true)

    try {
      if (useSmartAccount && currentUser?.evmSmartAccounts?.[0]) {
        // Use Smart Account (User Operation) for gasless transactions
        const smartAccount = currentUser.evmSmartAccounts[0]
        
        const network = isTestnet ? "base-sepolia" : "base"
        
        if (sendForm.asset === 'ETH') {
          await sendUserOperation({
            evmSmartAccount: smartAccount,
            network: network as any,
            calls: [{
              to: sendForm.to,
              value: BigInt(Math.floor(parseFloat(sendForm.amount) * 1e18)), // Convert to wei as BigInt
              data: "0x"
            }]
          })
        } else if (sendForm.asset === 'USDC') {
          // USDC transfer via Smart Account
          const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
          const transferData = `0xa9059cbb${sendForm.to.slice(2).padStart(64, '0')}${(parseFloat(sendForm.amount) * 1e6).toString(16).padStart(64, '0')}`

          await sendUserOperation({
            evmSmartAccount: smartAccount,
            network: network as any,
            calls: [{
              to: usdcContractAddress,
              value: 0n,
              data: transferData
            }]
          })
        }
      } else {
        // Use regular EVM transaction (EOA)
        const network = isTestnet ? "base-sepolia" : "base"
        const chainId = isTestnet ? 84532 : 8453 // Base Sepolia : Base Mainnet
        
        if (sendForm.asset === 'ETH') {
          await sendEvmTransaction({
            evmAccount: address,
            network: network as any,
            transaction: {
              to: sendForm.to,
              value: BigInt(Math.floor(parseFloat(sendForm.amount) * 1e18)), // Convert to wei as BigInt
              gas: 21000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              chainId: chainId,
              type: "eip1559",
              nonce: 0
            }
          })
        } else if (sendForm.asset === 'USDC') {
          // USDC transfer via regular transaction
          const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
          const transferData = `0xa9059cbb${sendForm.to.slice(2).padStart(64, '0')}${(parseFloat(sendForm.amount) * 1e6).toString(16).padStart(64, '0')}`

          await sendEvmTransaction({
            evmAccount: address,
            network: network as any,
            transaction: {
              to: usdcContractAddress,
              value: 0n,
              data: transferData,
              gas: 100000n,
              maxFeePerGas: 30000000000n,
              maxPriorityFeePerGas: 1000000000n,
              chainId: chainId,
              type: "eip1559",
              nonce: 0
            }
          })
        }
      }

      // Reset form and close modal
      setSendForm({ to: '', amount: '', asset: 'ETH' })
      setShowSendForm(false)

      // Refresh balance and transactions after a delay to allow blockchain confirmation
      setTimeout(() => {
        handleRefresh()
      }, 3000)
    } catch (error) {
      console.error('Transaction failed:', error)
      alert('Transaction failed. Please check your balance and try again.')
    } finally {
      setSendingTransaction(false)
    }
  }

  const fetchRealBalance = useCallback(async () => {
    if (!address) return

    setBalanceLoading(true)

    try {
      // Fetch ETH balance
      const ethResponse = await fetch(`https://api.basescan.org/api?module=account&action=balance&address=${address}&tag=latest`)
      const ethData = await ethResponse.json()

      // Fetch USDC balance (ERC-20)
      const usdcResponse = await fetch(`https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&address=${address}&tag=latest`)
      const usdcData = await usdcResponse.json()

      const updatedBalances = [...balances]

      if (ethData.status === '1') {
        const balanceInWei = ethData.result
        const balanceInEth = (parseInt(balanceInWei) / 1e18).toFixed(6)
        updatedBalances[0] = { ...updatedBalances[0], formatted: balanceInEth }
      }

      if (usdcData.status === '1') {
        const balanceInWei = usdcData.result
        const balanceInUsdc = (parseInt(balanceInWei) / 1e6).toFixed(6) // USDC has 6 decimals
        updatedBalances[1] = { ...updatedBalances[1], formatted: balanceInUsdc }
      }

      setBalances(updatedBalances)
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    } finally {
      setBalanceLoading(false)
    }
  }, [address])

  const fetchRealTransactions = useCallback(async () => {
    if (!address) return

    setTransactionsLoading(true)

    try {
      // Fetch transaction history from Base network
      const response = await fetch(`https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=YourApiKeyToken`)
      const data = await response.json()

      if (data.status === '1' && data.result) {
        const formattedTxs = data.result.map((tx: any) => ({
          hash: tx.hash,
          type: tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
          value: (parseInt(tx.value) / 1e18).toFixed(6),
          asset: 'ETH',
          timestamp: parseInt(tx.timeStamp) * 1000,
          from: tx.from,
          to: tx.to,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice
        }))
        setTransactions(formattedTxs)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }, [address])

  const handleRefresh = useCallback(() => {
    fetchRealBalance()
    fetchRealTransactions()
  }, [fetchRealBalance, fetchRealTransactions])



  // Load initial data when component mounts
  React.useEffect(() => {
    if (isSignedIn && address) {
      fetchRealBalance()
      fetchRealTransactions()
    }
  }, [isSignedIn, address])

  if (!isSignedIn || !address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Wallet className="h-16 w-16 text-sage-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-sage-800 mb-2">Smart Wallet</h1>
            <p className="text-gray-600">Connect your wallet to view your dashboard</p>
          </div>

          <Card className="border-sage-200">
            <CardContent className="pt-6">
              <p className="text-gray-500 mb-4">
                Please sign in to access your smart wallet dashboard
              </p>
              <Button
                onClick={() => window.location.href = '/auth'}
                className="bg-sage-600 hover:bg-sage-700"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-sage-600" />
            <h1 className="text-3xl font-bold text-sage-800">Smart Wallet</h1>
          </div>
          <p className="text-gray-600">Manage your gasless Web3 account</p>
        </div>

        {/* Testnet Warning Banner */}
        {isTestnet && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 font-bold text-sm">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-amber-800 font-semibold">Testnet Environment</h3>
                <p className="text-amber-700 text-sm mt-1">
                  You are connected to {networkName}. All transactions use test tokens with no real value.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Address Card */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Smart Account Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-sage-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Wallet Address</p>
                      <p className="font-mono text-sm text-gray-900 break-all">
                        {address}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(address)}
                      className="ml-3 flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Gasless Transactions Enabled</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance Card */}
            <Card className="border-sage-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Wallet Balance</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={balanceLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    {balanceLoading ? (
                      <div className="text-center p-6 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                        <div className="animate-pulse text-sage-800">Loading balances...</div>
                      </div>
                    ) : (
                      balances.map((balance, index) => (
                        <div key={balance.symbol} className="p-4 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-sage-800">
                                {balance.formatted} {balance.symbol}
                              </p>
                              <p className="text-sm text-gray-600">{balance.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {balance.address === 'native' ? 'Native Token' : 'ERC-20'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

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
                  <CardTitle>Send Transaction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transaction Method Selection */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useSmartAccount"
                      checked={useSmartAccount}
                      onChange={(e) => setUseSmartAccount(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="useSmartAccount" className="text-sm">
                      Use Smart Account (Gasless)
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <Input
                      id="recipient"
                      placeholder="0x..."
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
                        className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="ETH">ETH</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                  </div>

                  {/* Transaction Status */}
                  {(transactionData?.status === 'pending' || userOpStatus === 'pending') && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">
                          {useSmartAccount ? 'User operation pending...' : 'Transaction pending...'}
                        </span>
                      </div>
                      {transactionData?.status === 'pending' && (
                        <p className="text-xs text-blue-600 mt-1">Hash: {transactionData.hash}</p>
                      )}
                    </div>
                  )}

                  {(transactionData?.status === 'success' || userOpStatus === 'success') && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">Transaction successful!</span>
                      </div>
                      {transactionData?.status === 'success' && transactionData.receipt && (
                        <p className="text-xs text-green-600 mt-1">
                          Block: {transactionData.receipt.blockNumber.toString()}
                        </p>
                      )}
                    </div>
                  )}

                  {(transactionData?.status === 'error' || userOpStatus === 'error') && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">Transaction failed</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendTransaction}
                      disabled={sendingTransaction || !sendForm.to || !sendForm.amount}
                      className="flex-1"
                    >
                      {sendingTransaction ? 'Sending...' : `Send ${useSmartAccount ? '(Gasless)' : 'Transaction'}`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSendForm(false)}
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
                  <CardTitle>Receive Funds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Share your wallet address to receive funds
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg break-all font-mono text-sm">
                      {address}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => copyToClipboard(address || '')}
                        className="flex-1"
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

            {/* User Operation Status */}
            {userOpData && (
              <Card className="border-sage-200">
                <CardHeader>
                  <CardTitle>User Operation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`text-sm font-semibold ${
                        userOpData.status === 'complete' ? 'text-green-600' :
                        userOpData.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {userOpData.status}
                      </span>
                    </div>
                    {userOpData.transactionHash && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Transaction</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => window.open(`https://basescan.org/tx/${userOpData.transactionHash}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            <Card className="border-sage-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={transactionsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-gray-500">Loading transactions...</div>
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((tx: any) => (
                      <div key={tx.hash || tx.timestamp} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'send' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {tx.type === 'send' ? 'Sent' : 'Received'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : 'Recent'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            {tx.type === 'send' ? '-' : '+'}{tx.value} {tx.asset || 'ETH'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Gas: {(parseInt(tx.gasUsed || '0') * parseInt(tx.gasPrice || '0') / 1e18).toFixed(6)} ETH</span>
                            {tx.hash && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">No transactions yet</p>
                    <p className="text-sm">Your transaction history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Network Status */}
            <NetworkStatusComponent 
              showDetails={true}
              onNetworkChange={handleNetworkChange}
            />

            {/* Account Status */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      {currentUser?.evmSmartAccounts?.length ? 'Smart Account' : 'EOA'}
                    </span>
                    {currentUser?.evmSmartAccounts?.length && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      networkStatus.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-semibold">
                      {networkLoading ? 'Detecting...' : (networkName || 'Unknown')}
                    </span>
                    {isTestnet && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        TESTNET
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gas Fees</span>
                  <span className={`text-sm font-semibold ${
                    currentUser?.evmSmartAccounts?.length ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {currentUser?.evmSmartAccounts?.length ? 'Sponsored' : 'User Pays'}
                  </span>
                </div>

                {currentUser?.evmSmartAccounts?.length && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Smart Account</span>
                    <span className="text-xs font-mono text-gray-500 truncate ml-2" title={currentUser.evmSmartAccounts[0]}>
                      {currentUser.evmSmartAccounts[0].slice(0, 6)}...{currentUser.evmSmartAccounts[0].slice(-4)}
                    </span>
                  </div>
                )}

                {user?.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    <span className="text-sm font-semibold truncate ml-2" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Account Features */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Smart Account Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Gasless transactions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Email-based recovery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Enhanced security</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Batch transactions</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (transactions && transactions.length > 0) {
                      const csvContent = transactions.map((tx: any) =>
                        `${tx.timestamp || 'N/A'},${tx.type || 'N/A'},${tx.value || '0'},${tx.asset || 'ETH'},${tx.hash || 'N/A'}`
                      ).join('\n')
                      const blob = new Blob([`Date,Type,Amount,Asset,Hash\n${csvContent}`], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'wallet-transactions.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    }
                  }}
                  disabled={!transactions || transactions.length === 0}
                >
                  Export Transaction History
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://wallet.coinbase.com/settings', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Wallet Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://help.coinbase.com/en/wallet/getting-started/recovery-phrase', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Recovery Information
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contextual Help */}
      <ContextualHelp context="wallet" />
    </div>
  )
}