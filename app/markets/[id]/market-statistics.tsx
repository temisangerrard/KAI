"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Market } from "@/lib/db/database"
import { Market as MarketUtilsType } from "@/lib/types/database"
import { calculateOdds } from "@/lib/utils/market-utils"
import { BarChart3 } from "lucide-react"

interface MarketStatisticsProps {
  market: Market
}

export function MarketStatistics({ market }: MarketStatisticsProps) {
  // Use the same data source as the working market detail view
  const totalTokens = market.totalTokens || 0
  const participantCount = market.participants || 0

  // Convert current Market interface to the one expected by market-utils (same as main component)
  const convertMarketForUtils = (market: Market): MarketUtilsType => {
    return {
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category as any,
      status: market.status as any,
      createdBy: 'system',
      createdAt: new Date() as any,
      endsAt: market.endDate as any,
      tags: market.tags || [],
      totalParticipants: market.participants,
      totalTokensStaked: market.totalTokens,
      featured: false,
      trending: false,
      options: market.options.map(option => ({
        id: option.id,
        text: option.name,
        totalTokens: option.tokens || 0,
        participantCount: market.totalTokens > 0
          ? Math.round((option.tokens / market.totalTokens) * market.participants)
          : 0
      }))
    }
  }

  // Calculate odds using the same logic as the main component
  const marketForUtils = convertMarketForUtils(market)
  const currentOdds = calculateOdds(marketForUtils) || {}

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <BarChart3 className="h-5 w-5 mr-2 text-kai-500" />
          Market Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Distribution */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Token Distribution</h4>
          <div className="space-y-2">
            {market.options.map((option, index) => {
              const optionTokens = option.tokens || 0

              // Calculate percentage based on actual token distribution
              const percentage = totalTokens > 0 ? Math.round((optionTokens / totalTokens) * 100) : 0

              // Get odds from the same calculation as main component
              let optionOdds = 2.0 // Default fallback
              if (currentOdds && typeof currentOdds === 'object') {
                if (currentOdds[option.id] && typeof currentOdds[option.id] === 'number') {
                  optionOdds = currentOdds[option.id]
                } else {
                  // If exact match not found, try to find by index
                  const oddsKeys = Object.keys(currentOdds)
                  const optionIndex = market.options.indexOf(option)
                  if (oddsKeys[optionIndex] && typeof currentOdds[oddsKeys[optionIndex]] === 'number') {
                    optionOdds = currentOdds[oddsKeys[optionIndex]]
                  }
                }
              }

              // Ensure optionOdds is always a valid number
              if (typeof optionOdds !== 'number' || isNaN(optionOdds)) {
                optionOdds = 2.0
              }

              const colors = ['text-green-600', 'text-red-600', 'text-blue-600', 'text-yellow-600']
              const colorClass = colors[index % colors.length]

              return (
                <div key={option.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{option.name}</span>
                  <div className="text-right">
                    <div className={`font-medium ${colorClass}`}>
                      {optionTokens} tokens ({percentage}%)
                    </div>
                    <div className="text-xs text-gray-500">
                      {(typeof optionOdds === 'number' && !isNaN(optionOdds) ? optionOdds : 2.0).toFixed(1)}x odds
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Participants */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Participants:</span>
            <span className="font-medium text-gray-800">{participantCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}