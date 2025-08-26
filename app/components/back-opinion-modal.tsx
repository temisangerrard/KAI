"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { X, Sparkles, Heart, Trophy, HelpCircle, Users } from "lucide-react"
import { TokenRewardAnimation } from "./token-reward-animation"
import { TransactionService } from "@/lib/services/transaction-service"
import { useAuth } from "@/app/auth/auth-context"

interface BackOpinionModalProps {
  prediction: any
  userTokens: number
  onClose: () => void
  isAnnotated?: boolean
  onPredictionComplete?: (tokensUsed: number) => void
}

export function BackOpinionModal({ 
  prediction, 
  userTokens, 
  onClose, 
  isAnnotated = false,
  onPredictionComplete 
}: BackOpinionModalProps) {
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [selectedOptionId, setSelectedOptionId] = useState<string>("")
  const [tokenAmount, setTokenAmount] = useState([100])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user, updateUser } = useAuth()

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  const handleBackOpinion = async () => {
    if (!user || !selectedOption || !selectedOptionId || isProcessing) return
    
    setIsProcessing(true)
    
    try {
      // Record the prediction transaction
      await TransactionService.backOpinion(
        user.id,
        tokenAmount[0],
        prediction.id,
        selectedOptionId,
        prediction.title
      )
      
      // Update user's token balance
      const newBalance = user.tokenBalance - tokenAmount[0]
      updateUser({ tokenBalance: newBalance })
      
      // Notify parent component if callback provided
      if (onPredictionComplete) {
        onPredictionComplete(tokenAmount[0])
      }
      
      setShowSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Failed to process prediction:', error)
      // In a real app, you'd show an error message to the user
    } finally {
      setIsProcessing(false)
    }
  }

  const potentialReward = Math.round(tokenAmount[0] * 1.8) // Calculated potential tokens to earn

  // Annotation component for first-time users
  const Annotation = ({ text, position = "right" }: { text: string; position?: "top" | "right" | "bottom" | "left" }) => {
    if (!isAnnotated) return null;
    
    return (
      <div className={`
        absolute z-10 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg shadow-md border border-blue-200
        max-w-xs text-sm text-gray-700 flex items-start gap-2
        ${position === "top" ? "-top-16 left-0" : ""}
        ${position === "right" ? "top-0 -right-64" : ""}
        ${position === "bottom" ? "-bottom-16 left-0" : ""}
        ${position === "left" ? "top-0 -left-64" : ""}
      `}>
        <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <span>{text}</span>
      </div>
    );
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 animate-scale-up">
          <CardContent className="p-6 text-center">
            <TokenRewardAnimation 
              amount={tokenAmount[0]} 
              type="prediction" 
              message="Opinion Supported!" 
              size="lg"
            />
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Opinion Supported! ✨</h3>
            <p className="text-sm text-gray-600 mb-4">
              You've supported <span className="font-semibold text-green-600">{selectedOption}</span> with {tokenAmount[0]}{" "}
              tokens
            </p>
            
            <div className="bg-white/80 rounded-lg p-4 mb-2 animate-scale-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-amber-500" />
                <p className="text-lg font-bold text-amber-600">Potential Reward</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{potentialReward} tokens</p>
              <p className="text-xs text-gray-500 mt-1">If your opinion is correct</p>
            </div>
            
            {/* Confetti animation */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}px`,
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  backgroundColor: ['#ec4899', '#a855f7', '#2dd4bf', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)],
                  borderRadius: '50%',
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`
                }}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-end justify-center p-4 z-50 overflow-hidden">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col modal-content">
        <Card className="bg-white rounded-t-3xl flex-1 overflow-hidden relative">
          {isAnnotated && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-800 px-4 py-2 rounded-t-lg font-medium text-sm">
            Sample Market - Learn how predictions work
          </div>
        )}
        
        <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white rounded-t-3xl relative">
          {isAnnotated && (
            <Annotation 
              text="This is where you can see the market title and category. Markets are predictions about trending topics and events."
              position="top"
            />
          )}
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Support Your Opinion</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-white/20 text-white">{prediction.category}</Badge>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 fill-current" />
              <span className="text-sm">{prediction.vibeScore} vibe score</span>
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6">
          <h3 className="font-semibold text-gray-800 mb-2">{prediction.title}</h3>
          <p className="text-sm text-gray-600 mb-6">{prediction.description}</p>

          <div className="mb-6 relative">
            {isAnnotated && (
              <Annotation 
                text="Choose which option you believe will happen. Each option shows the current support percentage."
                position="left"
              />
            )}
            <h4 className="font-medium text-gray-800 mb-3">Choose your side:</h4>
            <div className="space-y-3">
              {prediction.options.map((option: any, index: number) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedOption(option.name)
                    setSelectedOptionId(option.id)
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedOption === option.name
                      ? "border-primary-400 bg-kai-50"
                      : "border-gray-200 hover:border-kai-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{option.name}</p>
                      <p className="text-sm text-gray-500">{option.percentage}% support</p>
                    </div>
                    <div className="text-right">
                      <div className={`w-4 h-4 rounded-full ${option.color}`} />
                      <p className="text-xs text-gray-500 mt-1">{option.tokens.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedOption && (
            <div className="mb-6">
              {/* Clear Token Amount Display */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 text-lg">Token Amount</h4>
                  <div className="flex items-center gap-1 text-kai-500">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">{userTokens.toLocaleString()} available</span>
                  </div>
                </div>

                {/* Large Token Display */}
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-1">{tokenAmount[0]}</div>
                  <div className="text-sm text-gray-600">tokens to support {selectedOption}</div>
                </div>

                <Slider
                  value={tokenAmount}
                  onValueChange={setTokenAmount}
                  max={Math.min(userTokens, 1000)}
                  min={10}
                  step={10}
                  className="mb-4"
                />

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[50, 100, 250, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setTokenAmount([Math.min(amount, userTokens)])}
                      className={`text-xs ${tokenAmount[0] === amount ? 'bg-blue-100 border-blue-300' : ''}`}
                      disabled={amount > userTokens}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Clear Reward Calculation */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-800 text-lg">If You're Right</h4>
                </div>
                
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-green-600 mb-1">+{potentialReward}</div>
                  <div className="text-sm text-gray-600">tokens you could win</div>
                </div>

                <div className="bg-white/60 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Your stake:</span>
                    <span className="font-medium">{tokenAmount[0]} tokens</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Potential return:</span>
                    <span className="font-medium text-green-600">+{potentialReward - tokenAmount[0]} tokens</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1 mt-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total if correct:</span>
                      <span className="text-green-600">{potentialReward} tokens</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-800">Market Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Participants:</span>
                    <div className="font-medium">{prediction.participants.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ends in:</span>
                    <div className="font-medium">{prediction.timeLeft}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total staked:</span>
                    <div className="font-medium">{prediction.totalBacked.toLocaleString()} tokens</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Your choice:</span>
                    <div className="font-medium text-primary-600">{selectedOption}</div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleBackOpinion}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full py-4 font-semibold text-lg"
              >
                {isProcessing ? (
                  "Processing..."
                ) : (
                  `Stake ${tokenAmount[0]} tokens on ${selectedOption} ✨`
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            By supporting your opinion, you agree to our community guidelines. Remember, this is about sharing what you
            believe in! 💪
          </p>
          </CardContent>
        </div>
        </Card>
      </div>
    </div>
  )
}