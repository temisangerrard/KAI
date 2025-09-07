'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  RefreshCw
} from 'lucide-react'
import { ResolutionLog } from '@/lib/services/resolution-service'
import { format } from 'date-fns'

interface ResolutionAuditTrailProps {
  marketId?: string
  adminId?: string
  className?: string
}

interface AuditTrailData {
  logs: ResolutionLog[]
  loading: boolean
  error: string | null
}

interface FilterOptions {
  marketId: string
  adminId: string
  action: string
  dateRange: string
}

export function ResolutionAuditTrail({ 
  marketId,
  adminId,
  className = ""
}: ResolutionAuditTrailProps) {
  const [data, setData] = useState<AuditTrailData>({
    logs: [],
    loading: true,
    error: null
  })
  
  const [filters, setFilters] = useState<FilterOptions>({
    marketId: marketId || '',
    adminId: adminId || '',
    action: '',
    dateRange: ''
  })

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAuditTrail()
  }, [marketId, adminId])

  const loadAuditTrail = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))
      
      let logs: ResolutionLog[] = []
      
      if (marketId) {
        // Load logs for specific market via API
        const response = await fetch(`/api/admin/markets/${marketId}/resolution-logs`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          logs = result.logs;
        } else {
          console.error('Error loading resolution logs:', result.error || result.message);
          logs = [];
        }
      } else {
        // For now, we'll need to implement a method to get all logs
        // This would require a new service method
        logs = []
      }
      
      setData({
        logs,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error loading audit trail:', error)
      setData({
        logs: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load audit trail'
      })
    }
  }

  const getActionIcon = (action: ResolutionLog['action']) => {
    switch (action) {
      case 'resolution_started':
        return <Play className="w-4 h-4 text-blue-600" />
      case 'evidence_validated':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'payouts_calculated':
        return <Activity className="w-4 h-4 text-purple-600" />
      case 'tokens_distributed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'resolution_completed':
        return <CheckCircle className="w-4 h-4 text-green-700" />
      case 'resolution_failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'rollback_initiated':
        return <RotateCcw className="w-4 h-4 text-orange-600" />
      case 'rollback_completed':
        return <RotateCcw className="w-4 h-4 text-orange-700" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionBadge = (action: ResolutionLog['action']) => {
    switch (action) {
      case 'resolution_started':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Started</Badge>
      case 'evidence_validated':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Evidence OK</Badge>
      case 'payouts_calculated':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Calculated</Badge>
      case 'tokens_distributed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Distributed</Badge>
      case 'resolution_completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
      case 'resolution_failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'rollback_initiated':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Rolling Back</Badge>
      case 'rollback_completed':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Rolled Back</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatActionText = (action: ResolutionLog['action']) => {
    switch (action) {
      case 'resolution_started':
        return 'Resolution process initiated'
      case 'evidence_validated':
        return 'Evidence validation completed'
      case 'payouts_calculated':
        return 'Payout calculations completed'
      case 'tokens_distributed':
        return 'Token distribution completed'
      case 'resolution_completed':
        return 'Market resolution completed successfully'
      case 'resolution_failed':
        return 'Resolution process failed'
      case 'rollback_initiated':
        return 'Rollback process initiated'
      case 'rollback_completed':
        return 'Rollback process completed'
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const filteredLogs = data.logs.filter(log => {
    if (filters.action && log.action !== filters.action) return false
    if (filters.adminId && log.adminId !== filters.adminId) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        log.marketId.toLowerCase().includes(searchLower) ||
        log.adminId.toLowerCase().includes(searchLower) ||
        formatActionText(log.action).toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (data.loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
            <span className="ml-3 text-sage-600">Loading audit trail...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{data.error}</p>
            <Button onClick={loadAuditTrail} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Resolution Audit Trail</span>
            <Badge variant="outline">{filteredLogs.length} events</Badge>
          </CardTitle>
          <Button onClick={loadAuditTrail} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="resolution_started">Started</SelectItem>
                <SelectItem value="evidence_validated">Evidence Validated</SelectItem>
                <SelectItem value="payouts_calculated">Payouts Calculated</SelectItem>
                <SelectItem value="tokens_distributed">Tokens Distributed</SelectItem>
                <SelectItem value="resolution_completed">Completed</SelectItem>
                <SelectItem value="resolution_failed">Failed</SelectItem>
                <SelectItem value="rollback_initiated">Rollback Started</SelectItem>
                <SelectItem value="rollback_completed">Rollback Completed</SelectItem>
              </SelectContent>
            </Select>

            {!marketId && (
              <Input
                placeholder="Market ID"
                value={filters.marketId}
                onChange={(e) => setFilters(prev => ({ ...prev, marketId: e.target.value }))}
              />
            )}

            {!adminId && (
              <Input
                placeholder="Admin ID"
                value={filters.adminId}
                onChange={(e) => setFilters(prev => ({ ...prev, adminId: e.target.value }))}
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Audit Trail */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No audit trail events found</p>
              {(filters.action || filters.adminId || filters.marketId || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({ marketId: marketId || '', adminId: adminId || '', action: '', dateRange: '' })
                    setSearchTerm('')
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => (
                <div key={log.id || index} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getActionBadge(log.action)}
                          <span className="text-sm font-medium text-gray-900">
                            {formatActionText(log.action)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(log.timestamp.toDate(), 'MMM d, yyyy h:mm:ss a')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Market:</span>
                          <code className="bg-gray-100 px-1 rounded text-xs">{log.marketId}</code>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">Admin:</span>
                          <code className="bg-gray-100 px-1 rounded text-xs">{log.adminId}</code>
                        </div>
                        {log.error && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-medium">Error</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      {(log.details || log.error) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border">
                          {log.error && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-red-700">Error:</span>
                              <p className="text-xs text-red-600 mt-1">{log.error}</p>
                            </div>
                          )}
                          {log.details && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">Details:</span>
                              <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}