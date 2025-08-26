"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share2 } from "lucide-react"
import { Market } from "@/lib/types/database"

interface MarketCardProps {
  market: Market
  onBackOpinion: (market: Market) => void
}

// Helper function to calculate option percentages
const calculateOptionPercentages = (options: Market['options']) => {
  const totalTokens = options.reduce((sum, option) => sum + option.totalTokens, 0)
  if (totalTokens === 0) return options.map(option => ({ ...option, percentage: 0 }))
  
  return options.map(option => ({
    ...option,
    percentage: Math.round((option.totalTokens / totalTokens) * 100)
  }))
}

// Helper function to get time left
const getTimeLeft = (endsAt: any) => {
  const now = new Date()
  const endDate = endsAt.toDate ? endsAt.toDate() : new Date(endsAt)
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) return "Ended"
  if (diffDays === 1) return "1 day"
  return `${diffDays} days`
}

export function MarketCard({ market, onBackOpinion }: MarketCardProps) {
  const optionsWithPercentages = calculateOptionPercentages(market.options)
  const colors = ['bg-kai-600', 'bg-primary-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400']
  const timeLeft = getTimeLeft(market.endsAt)
  
  // Calculate a simple "vibe score" based on participation
  const vibeScore = Math.min(100, Math.round((market.totalParticipants / 10) + (market.totalTokensStaked / 1000)))

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-kai-100 text-kai-700 text-xs">
                {market.category.replace('-', ' ')}
              </Badge>
              {market.trending && (
                <Badge className="bg-gradient-to-r from-kai-600 to-primary-400 text-white text-xs">
                  Trending
                </Badge>
              )}
              {market.featured && (
                <Badge className="bg-gradient-to-r from-gold-500 to-amber-500 text-white text-xs">
                  Featured
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{market.title}</h3>
            <p className="text-sm text-gray-600">{market.description}</p>
          </div>
          <div className="text-right ml-4">
            <div className="flex items-center gap-1 text-kai-500">
              <Heart className="w-4 h-4 fill-current" />
              <span className="text-sm font-semibold">{vibeScore}</span>
            </div>
            <p className="text-xs text-gray-500">vibe score</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 mb-4">
          {optionsWithPercentages.map((option, index) => (
            <div key={option.id} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{option.text}</span>
                <span className="text-sm font-semibold text-gray-800">{option.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {option.totalTokens.toLocaleString()} tokens supporting
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
          <span>{market.totalParticipants} participants</span>
          <span>{timeLeft} left</span>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full"
            onClick={() => onBackOpinion(market)}
          >
            Support Your Opinion
          </Button>
          <Button variant="outline" size="icon" className="rounded-full border-kai-200">
            <Share2 className="w-4 h-4 text-kai-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}