"use client"

import { useState } from 'react'
import { Bell, CheckCircle, DollarSign, Crown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePayoutNotifications } from '@/hooks/use-payout-notifications'
import { formatDistanceToNow } from 'date-fns'

export function PayoutNotifications() {
  const { 
    notifications, 
    isLoading, 
    newNotificationCount, 
    markAsRead, 
    markAllAsRead 
  } = usePayoutNotifications()
  
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {newNotificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {newNotificationCount > 9 ? '9+' : newNotificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Payout Notifications</CardTitle>
              {newNotificationCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payout notifications yet</p>
                <p className="text-xs mt-1">You'll be notified when you win predictions</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      notification.isNew ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'winner_payout' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gold-100 text-gold-600'
                      }`}>
                        {notification.type === 'winner_payout' ? (
                          <DollarSign className="h-4 w-4" />
                        ) : (
                          <Crown className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">
                            {notification.type === 'winner_payout' ? 'Prediction Win!' : 'Creator Fee Earned!'}
                          </p>
                          {notification.isNew && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          +{notification.amount.toLocaleString()} tokens
                          {notification.profit && notification.profit > 0 && (
                            <span className="text-green-600 font-medium">
                              {' '}(+{notification.profit} profit)
                            </span>
                          )}
                        </p>
                        
                        {notification.marketTitle && (
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {notification.marketTitle}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      
                      {notification.isNew && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">
                  Showing recent payout notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}