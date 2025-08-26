"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Market } from "@/lib/types/database"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Coins, 
  Activity,
  PieChart,
  Target,
  Zap
} from "lucide-react"

interface MarketStatisticsProps {
  market: Market
}

export function MarketStatistics({ market }: MarketStatisticsProps) {
  // Calculate statistics
  const averageTokensPerParticipant = market.participants > 0 ? 
    Math.round(market.totalTokens / market.participants) : 0
  
  const mostPopularOption = market.options.reduce((prev, current) => 
    prev.percentage > current.percentage ? prev : current
  )
  
  const leastPopularOption = market.options.reduce((prev, current) => 
    prev.percentage < current.percentage ? prev : current
  )

  // Calculate engagement metrics
  const engagementScore = Math.min(
    Math.round((market.participants / 100) * 30 + (market.totalTokens / 1000) * 20 + 50), 
    100
  )
  
  const competitiveness = market.options.length > 1 ? 
    100 - Math.max(...market.options.map(o => o.percentage)) : 0

  // Mock additional statistics (in a real app, these would come from the backend)
  const dailyParticipants = Math.floor(market.participants * 0.15) // ~15% joined today
  const weeklyGrowth = Math.floor(Math.random() * 30) + 10 // 10-40% growth
  const averageSessionTime = Math.floor(Math.random() * 5) + 3 // 3-8 minutes

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <BarChart3 className="h-5 w-5 mr-2 text-kai-500" />
          Market Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Coins className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-gray-800">{averageTokensPerParticipant}</div>
            <div className="text-xs text-gray-600">Avg. tokens per user</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-gray-800">{dailyParticipants}</div>
            <div className="text-xs text-gray-600">New today</div>
          </div>
        </div>

        {/* Engagement metrics */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2 text-amber-500" />
            Engagement
          </h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Engagement</span>
                <span className="font-medium text-gray-800">{engagementScore}%</span>
              </div>
              <Progress value={engagementScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Market Competitiveness</span>
                <span className="font-medium text-gray-800">{competitiveness}%</span>
              </div>
              <Progress value={competitiveness} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {competitiveness > 70 ? 'Highly competitive' :
                 competitiveness > 40 ? 'Moderately competitive' :
                 'Clear favorite emerging'}
              </p>
            </div>
          </div>
        </div>

        {/* Option breakdown */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <PieChart className="h-4 w-4 mr-2 text-primary-500" />
            Option Breakdown
          </h4>
          
          <div className="space-y-2">
            {market.options.map((option) => (
              <div key={option.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                  <span className="text-gray-700 truncate max-w-[120px]">{option.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{option.percentage}%</div>
                  <div className="text-xs text-gray-500">{option.tokens.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market insights */}
        <div className="bg-gradient-to-r from-kai-50 to-kai-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2 flex items-center">
            <Target className="h-4 w-4 mr-2 text-kai-500" />
            Market Insights
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Leading option:</span>
              <span className="font-medium text-gray-800">{mostPopularOption.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Underdog option:</span>
              <span className="font-medium text-gray-800">{leastPopularOption.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Weekly growth:</span>
              <span className="font-medium text-green-600">+{weeklyGrowth}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. session:</span>
              <span className="font-medium text-gray-800">{averageSessionTime}m</span>
            </div>
          </div>
        </div>

        {/* Participation trend */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
            Participation Trend
          </h4>
          
          {/* Simple trend visualization */}
          <div className="flex items-end gap-1 h-16 mb-2">
            {[...Array(7)].map((_, i) => {
              const height = Math.floor(Math.random() * 40) + 20
              return (
                <div
                  key={i}
                  className="bg-gradient-to-t from-primary-400 to-kai-600 rounded-t flex-1"
                  style={{ height: `${height}%` }}
                ></div>
              )
            })}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>7d ago</span>
            <span>Today</span>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {weeklyGrowth > 20 ? 
              "🚀 Strong growth in participation this week!" :
              weeklyGrowth > 10 ?
              "📈 Steady growth in participation." :
              "📊 Participation has been stable."
            }
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm font-bold text-gray-800">{market.options.length}</div>
            <div className="text-xs text-gray-600">Options</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm font-bold text-gray-800">
              {Math.floor((new Date().getTime() - new Date(market.startDate).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-xs text-gray-600">Days active</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm font-bold text-gray-800">
              {Math.ceil((new Date(market.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-xs text-gray-600">Days left</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}