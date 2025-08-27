"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Market } from "@/lib/db/database"
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react"

interface MarketTimelineProps {
  market: Market
}

export function MarketTimeline({ market }: MarketTimelineProps) {
  // Calculate timeline events
  const now = new Date()
  const startDate = new Date(market.startDate)
  const endDate = new Date(market.endDate)
  
  const totalDuration = endDate.getTime() - startDate.getTime()
  const elapsed = now.getTime() - startDate.getTime()
  const progressPercentage = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
  
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimelineEvents = () => {
    const events = [
      {
        id: 'created',
        title: 'Market Created',
        description: 'Prediction market opened for participation',
        date: startDate,
        icon: <PlayCircle className="h-4 w-4" />,
        status: 'completed' as const,
        color: 'text-green-600'
      },
      {
        id: 'active',
        title: 'Active Period',
        description: 'Users can support their opinions',
        date: startDate,
        icon: <TrendingUp className="h-4 w-4" />,
        status: now < endDate ? 'active' : 'completed' as const,
        color: 'text-blue-600'
      },
      {
        id: 'ending',
        title: 'Market Closes',
        description: 'No more predictions accepted',
        date: endDate,
        icon: <Clock className="h-4 w-4" />,
        status: now >= endDate ? 'completed' : 'upcoming' as const,
        color: 'text-amber-600'
      }
    ]

    // Add resolution event if market has ended
    if (market.status === 'resolved') {
      events.push({
        id: 'resolved',
        title: 'Market Resolved',
        description: 'Outcome determined, rewards distributed',
        date: endDate,
        icon: <CheckCircle className="h-4 w-4" />,
        status: 'completed' as const,
        color: 'text-green-600'
      })
    } else if (now >= endDate) {
      events.push({
        id: 'pending',
        title: 'Awaiting Resolution',
        description: 'Outcome being determined',
        date: endDate,
        icon: <AlertCircle className="h-4 w-4" />,
        status: 'active' as const,
        color: 'text-orange-600'
      })
    }

    return events
  }

  const timelineEvents = getTimelineEvents()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Calendar className="h-5 w-5 mr-2 text-kai-500" />
          Market Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Started</span>
            <span>{progressPercentage.toFixed(0)}% complete</span>
            <span>Ends</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-400 to-kai-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatDateTime(startDate)}</span>
            <span>{formatDateTime(endDate)}</span>
          </div>
        </div>

        {/* Timeline events */}
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${event.status === 'completed' ? 'bg-green-100 border-green-300 text-green-600' : ''}
                ${event.status === 'active' ? 'bg-blue-100 border-blue-300 text-blue-600' : ''}
                ${event.status === 'upcoming' ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
              `}>
                {event.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${event.color}`}>
                    {event.title}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      event.status === 'completed' ? 'border-green-300 text-green-700' :
                      event.status === 'active' ? 'border-blue-300 text-blue-700' :
                      'border-gray-300 text-gray-500'
                    }`}
                  >
                    {event.status === 'completed' ? 'Done' : 
                     event.status === 'active' ? 'Now' : 'Upcoming'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {event.description}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(event.date)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Market status summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-kai-50 to-kai-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              market.status === 'active' ? 'bg-green-500' :
              market.status === 'resolved' ? 'bg-blue-500' :
              'bg-gray-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-800">
              Status: {market.status === 'active' ? 'Active' : 
                      market.status === 'resolved' ? 'Resolved' : 'Closed'}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {market.status === 'active' && now < endDate && 
              `Market is currently active. ${Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days remaining to participate.`
            }
            {market.status === 'active' && now >= endDate && 
              "Market has ended and is awaiting resolution."
            }
            {market.status === 'resolved' && 
              "Market has been resolved and rewards have been distributed."
            }
            {market.status === 'cancelled' && 
              "Market was cancelled and tokens have been refunded."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}