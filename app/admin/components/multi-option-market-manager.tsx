"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  Users, 
  Coins, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Settings
} from "lucide-react"
import { Market } from "@/lib/db/database"

interface MultiOptionMarketManagerProps {
  markets: Market[]
  onUpdateMarket: (marketId: string, updates: Partial<Market>) => Promise<void>
  onDeleteMarket: (marketId: string) => Promise<void>
}

interface EditingMarket extends Market {
  isEditing?: boolean
}

export function MultiOptionMarketManager({ 
  markets, 
  onUpdateMarket, 
  onDeleteMarket 
}: MultiOptionMarketManagerProps) {
  const [editingMarkets, setEditingMarkets] = useState<Record<string, EditingMarket>>({})
  const [filter, setFilter] = useState<'all' | 'binary' | 'multi'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter markets based on option count and status
  const filteredMarkets = markets.filter(market => {
    const optionCountMatch = 
      filter === 'all' || 
      (filter === 'binary' && market.options.length === 2) ||
      (filter === 'multi' && market.options.length > 2)
    
    const statusMatch = statusFilter === 'all' || market.status === statusFilter
    
    return optionCountMatch && statusMatch
  })

  const startEditing = (market: Market) => {
    setEditingMarkets(prev => ({
      ...prev,
      [market.id]: { ...market, isEditing: true }
    }))
  }

  const cancelEditing = (marketId: string) => {
    setEditingMarkets(prev => {
      const { [marketId]: _, ...rest } = prev
      return rest
    })
  }

  const updateEditingMarket = (marketId: string, field: string, value: any) => {
    setEditingMarkets(prev => ({
      ...prev,
      [marketId]: {
        ...prev[marketId],
        [field]: value
      }
    }))
  }

  const updateMarketOption = (marketId: string, optionIndex: number, field: string, value: any) => {
    setEditingMarkets(prev => {
      const market = prev[marketId]
      const updatedOptions = [...market.options]
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        [field]: value
      }
      return {
        ...prev,
        [marketId]: {
          ...market,
          options: updatedOptions
        }
      }
    })
  }

  const addOption = (marketId: string) => {
    setEditingMarkets(prev => {
      const market = prev[marketId]
      const newOption = {
        id: `option_${Date.now()}_${market.options.length}`,
        name: `Option ${market.options.length + 1}`,
        percentage: 0,
        tokens: 0,
        color: `bg-gray-400`
      }
      return {
        ...prev,
        [marketId]: {
          ...market,
          options: [...market.options, newOption]
        }
      }
    })
  }

  const removeOption = (marketId: string, optionIndex: number) => {
    setEditingMarkets(prev => {
      const market = prev[marketId]
      if (market.options.length <= 2) return prev // Don't allow less than 2 options
      
      const updatedOptions = market.options.filter((_, index) => index !== optionIndex)
      return {
        ...prev,
        [marketId]: {
          ...market,
          options: updatedOptions
        }
      }
    })
  }

  const saveMarket = async (marketId: string) => {
    const editingMarket = editingMarkets[marketId]
    if (!editingMarket) return

    try {
      // Validate options have unique names
      const optionNames = editingMarket.options.map(opt => opt.name.trim().toLowerCase())
      const uniqueNames = new Set(optionNames)
      if (uniqueNames.size !== editingMarket.options.length) {
        alert('All options must have unique names')
        return
      }

      // Validate minimum 2 options
      if (editingMarket.options.length < 2) {
        alert('Market must have at least 2 options')
        return
      }

      const { isEditing, ...marketUpdates } = editingMarket
      await onUpdateMarket(marketId, marketUpdates)
      cancelEditing(marketId)
    } catch (error) {
      console.error('Failed to update market:', error)
      alert('Failed to update market. Please try again.')
    }
  }

  const getMarketTypeLabel = (optionCount: number) => {
    if (optionCount === 2) return 'Binary'
    return `Multi (${optionCount} options)`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      case 'pending_resolution': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Option Market Manager</h2>
          <p className="text-gray-600">Manage binary and multi-option prediction markets</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value: 'all' | 'binary' | 'multi') => setFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="binary">Binary Only</SelectItem>
              <SelectItem value="multi">Multi-Option</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="pending_resolution">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Markets</p>
                <p className="text-2xl font-bold">{filteredMarkets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Binary Markets</p>
                <p className="text-2xl font-bold">
                  {markets.filter(m => m.options.length === 2).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Multi-Option</p>
                <p className="text-2xl font-bold">
                  {markets.filter(m => m.options.length > 2).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold">
                  {markets.reduce((sum, m) => sum + m.participants, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Markets List */}
      <div className="space-y-4">
        {filteredMarkets.map(market => {
          const editingMarket = editingMarkets[market.id]
          const isEditing = editingMarket?.isEditing

          return (
            <Card key={market.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editingMarket.title}
                        onChange={(e) => updateEditingMarket(market.id, 'title', e.target.value)}
                        className="text-lg font-semibold mb-2"
                        placeholder="Market title"
                      />
                    ) : (
                      <CardTitle className="text-lg">{market.title}</CardTitle>
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getStatusColor(market.status)}>
                        {market.status}
                      </Badge>
                      <Badge variant="secondary">
                        {getMarketTypeLabel(market.options.length)}
                      </Badge>
                      <Badge variant="outline">
                        {market.category}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{market.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4" />
                        <span>{market.totalTokens} tokens</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveMarket(market.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelEditing(market.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(market)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteMarket(market.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {isEditing && (
                  <div className="mb-4">
                    <Textarea
                      value={editingMarket.description}
                      onChange={(e) => updateEditingMarket(market.id, 'description', e.target.value)}
                      placeholder="Market description"
                      className="mb-2"
                    />
                  </div>
                )}

                {/* Options Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">
                      Prediction Options ({(isEditing ? editingMarket : market).options.length})
                    </h4>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(market.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    {(isEditing ? editingMarket : market).options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                        
                        {isEditing ? (
                          <>
                            <Input
                              value={option.name}
                              onChange={(e) => updateMarketOption(market.id, index, 'name', e.target.value)}
                              className="flex-1"
                              placeholder={`Option ${index + 1}`}
                            />
                            {editingMarket.options.length > 2 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOption(market.id, index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{option.name}</span>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{option.percentage.toFixed(1)}%</span>
                              <span>{option.tokens} tokens</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {!isEditing && !market.description && (
                  <p className="text-gray-600 mt-3">{market.description}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredMarkets.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No markets found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No markets match the current filters.' 
                : `No ${filter} markets found.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}