"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  X, 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Wallet,
  Apple,
  CircleDollarSign
} from "lucide-react"
import { designTokens } from "@/lib/design-tokens"
import { TokenRewardAnimation } from "../components/token-reward-animation"

// Define package options
const packageOptions = [
  { amount: "£10", tokens: "1,000", popular: false },
  { amount: "£25", tokens: "2,500", popular: true },
  { amount: "£50", tokens: "5,000", popular: false },
]

// Define payment methods
const paymentMethods = [
  { id: "credit-card", name: "Credit Card", icon: CreditCard },
  { id: "paypal", name: "PayPal", icon: CircleDollarSign },
  { id: "apple-pay", name: "Apple Pay", icon: Apple },
  { id: "google-pay", name: "Google Pay", icon: Wallet },
]

interface TokenPurchaseModalProps {
  onClose: () => void
  onPurchaseComplete: (amount: number, paymentMethod?: string) => void
}

export function TokenPurchaseModal({ onClose, onPurchaseComplete }: TokenPurchaseModalProps) {
  const [step, setStep] = useState<'package' | 'payment' | 'processing' | 'success' | 'error'>('package')
  const [selectedPackage, setSelectedPackage] = useState<number | null>(1) // Default to the middle (popular) option
  const [customAmount, setCustomAmount] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("credit-card")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    name: ""
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Calculate tokens based on amount (£1 = 100 tokens)
  const calculateTokens = (amount: number): number => {
    return amount * 100
  }

  // Get selected package amount
  const getSelectedAmount = (): number => {
    if (selectedPackage !== null) {
      return parseInt(packageOptions[selectedPackage].amount.replace("£", ""))
    }
    return customAmount ? parseInt(customAmount) : 0
  }

  // Get selected package tokens
  const getSelectedTokens = (): number => {
    const amount = getSelectedAmount()
    return calculateTokens(amount)
  }

  // Handle package selection
  const handlePackageSelect = (index: number) => {
    setSelectedPackage(index)
    setCustomAmount("")
  }

  // Handle custom amount change
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPackage(null)
    setCustomAmount(e.target.value)
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = (id: string) => {
    setSelectedPaymentMethod(id)
  }

  // Handle continue to payment
  const handleContinueToPayment = () => {
    if (getSelectedAmount() > 0) {
      setStep('payment')
    }
  }

  // Handle purchase submission
  const handlePurchaseSubmit = () => {
    setIsProcessing(true)
    setStep('processing')
    
    // Get the payment method name
    const paymentMethod = paymentMethods.find(method => method.id === selectedPaymentMethod)?.name || "Credit Card";
    
    // Simulate payment processing
    setTimeout(() => {
      // 90% chance of success
      const success = Math.random() < 0.9
      
      if (success) {
        setStep('success')
        // Wait 2 seconds before closing modal and updating balance
        setTimeout(() => {
          onPurchaseComplete(getSelectedTokens(), paymentMethod)
          onClose()
        }, 2000)
      } else {
        setStep('error')
      }
    }, 2000)
  }

  // Handle retry after error
  const handleRetry = () => {
    setStep('payment')
  }

  // Render package selection step
  const renderPackageSelection = () => (
    <>
      <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Buy Tokens</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm opacity-90 mt-1">Choose a package or enter a custom amount</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {packageOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handlePackageSelect(index)}
                className={`relative p-4 border-2 rounded-xl transition-all ${
                  selectedPackage === index
                    ? "border-primary-400 bg-kai-50"
                    : "border-gray-200 hover:border-kai-200"
                }`}
              >
                {option.popular && (
                  <span className="absolute -top-2 -right-2 bg-kai-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <p className="font-semibold text-gray-800">{option.amount}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3 text-kai-500" />
                  <p className="text-xs text-gray-500">{option.tokens} tokens</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount (£)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={handleCustomAmountChange}
              className="rounded-xl"
              min="1"
            />
            {customAmount && (
              <p className="text-xs text-gray-500 mt-1">
                You'll receive {calculateTokens(parseInt(customAmount)).toLocaleString()} tokens
              </p>
            )}
          </div>

          <div className="bg-kai-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-kai-500" />
              <span className="text-sm font-medium text-gray-800">Token Benefits</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Support opinions on trending topics</li>
              <li>• Create your own prediction markets</li>
              <li>• Earn rewards when your opinions are right</li>
            </ul>
          </div>

          <Button 
            onClick={handleContinueToPayment}
            disabled={getSelectedAmount() <= 0}
            className="w-full bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full py-3"
          >
            Continue to Payment
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By purchasing tokens, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </CardContent>
    </>
  )

  // Render payment method selection step
  const renderPaymentSelection = () => (
    <>
      <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('package')}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm opacity-90 mt-1">
          Purchasing {getSelectedTokens().toLocaleString()} tokens for £{getSelectedAmount()}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Select Payment Method</label>
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handlePaymentMethodSelect(method.id)}
                className={`w-full p-3 flex items-center gap-3 border-2 rounded-xl transition-all ${
                  selectedPaymentMethod === method.id
                    ? "border-primary-400 bg-kai-50"
                    : "border-gray-200 hover:border-kai-200"
                }`}
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <method.icon className="w-5 h-5 text-gray-600" />
                </div>
                <span className="font-medium text-gray-800">{method.name}</span>
              </button>
            ))}
          </div>

          {selectedPaymentMethod === "credit-card" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <Input 
                  type="text" 
                  placeholder="1234 5678 9012 3456" 
                  className="rounded-xl"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails({...cardDetails, cardNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <Input 
                    type="text" 
                    placeholder="MM/YY" 
                    className="rounded-xl"
                    value={cardDetails.expiryDate}
                    onChange={(e) => setCardDetails({...cardDetails, expiryDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <Input 
                    type="text" 
                    placeholder="123" 
                    className="rounded-xl"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                <Input 
                  type="text" 
                  placeholder="John Doe" 
                  className="rounded-xl"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-800">Payment Summary</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{getSelectedTokens().toLocaleString()} tokens</span>
              <span>£{getSelectedAmount()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing fee</span>
              <span>£0.00</span>
            </div>
            <div className="border-t border-blue-100 my-2"></div>
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Total</span>
              <span>£{getSelectedAmount()}</span>
            </div>
          </div>

          <Button 
            onClick={handlePurchaseSubmit}
            className="w-full bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full py-3"
          >
            Complete Purchase
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <CreditCard className="w-3 h-3" />
            <span>Secure payment processing</span>
          </div>
        </div>
      </CardContent>
    </>
  )

  // Render processing step
  const renderProcessing = () => (
    <>
      <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Processing Payment</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            disabled={true}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 border-4 border-t-kai-500 border-kai-200 rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Your Payment</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we process your payment for {getSelectedTokens().toLocaleString()} tokens.
          </p>
          <p className="text-xs text-gray-500">This will only take a moment...</p>
        </div>
      </CardContent>
    </>
  )

  // Render success step
  const renderSuccess = () => (
    <>
      <CardHeader className="bg-gradient-to-r from-green-400 to-emerald-400 text-white rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Purchase Complete!</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center py-6">
          <div className="mb-4">
            <TokenRewardAnimation 
              amount={getSelectedTokens()} 
              type="purchase" 
              message="Purchase Complete!" 
              size="lg"
            />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2 animate-bounce-small">Tokens Added to Your Wallet!</h3>
          <p className="text-sm text-gray-600 mb-6">
            You've successfully purchased {getSelectedTokens().toLocaleString()} tokens.
          </p>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 animate-scale-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-600">+{getSelectedTokens().toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">
              Your tokens are ready to use! Back opinions, create markets, and earn rewards.
            </p>
          </div>
          
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white rounded-full py-3 animate-scale-up"
            style={{ animationDelay: '0.4s' }}
          >
            Start Using My Tokens
          </Button>
        </div>
      </CardContent>
    </>
  )

  // Render error step
  const renderError = () => (
    <>
      <CardHeader className="bg-gradient-to-r from-red-400 to-orange-400 text-white rounded-t-3xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Payment Failed</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Failed</h3>
          <p className="text-sm text-gray-600 mb-6">
            We couldn't process your payment. Please check your payment details and try again.
          </p>
          
          <div className="bg-red-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-800">Possible reasons:</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Insufficient funds</li>
              <li>• Incorrect card details</li>
              <li>• Card declined by bank</li>
              <li>• Network connection issue</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleRetry}
              className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full py-3"
            >
              Try Again
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  )

  return (
    <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-end justify-center p-4 z-50 overflow-hidden">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col modal-content">
        <Card className="bg-white rounded-t-3xl flex-1 overflow-y-auto">
          {step === 'package' && renderPackageSelection()}
          {step === 'payment' && renderPaymentSelection()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
          {step === 'error' && renderError()}
        </Card>
      </div>
    </div>
  )
}