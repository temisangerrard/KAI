"use client"

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DatabaseStatus {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

interface DatabaseStatusMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function DatabaseStatusMonitor({ 
  className = '',
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: DatabaseStatusMonitorProps) {
  const [status, setStatus] = useState<DatabaseStatus>({
    status: 'unknown',
    responseTime: 0,
    lastChecked: new Date()
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkDatabaseStatus = useCallback(async () => {
    setIsChecking(true);
    const startTime = Date.now();

    try {
      // Use a lightweight endpoint to check database connectivity
      const response = await fetch('/api/admin/markets/commitments?health=true&pageSize=1', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        // Determine status based on response time and data validity
        let healthStatus: DatabaseStatus['status'] = 'healthy';
        
        if (responseTime > 5000) {
          healthStatus = 'degraded'; // Slow response
        } else if (responseTime > 10000) {
          healthStatus = 'down'; // Very slow, likely issues
        }

        setStatus({
          status: healthStatus,
          responseTime,
          lastChecked: new Date(),
          error: undefined
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      setStatus({
        status: 'down',
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Auto-refresh status
  useEffect(() => {
    // Initial check
    checkDatabaseStatus();

    if (autoRefresh) {
      const interval = setInterval(checkDatabaseStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [checkDatabaseStatus, autoRefresh, refreshInterval]);

  const getStatusConfig = () => {
    switch (status.status) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Healthy',
          description: 'Database is responding normally'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          label: 'Degraded',
          description: 'Database is slow but functional'
        };
      case 'down':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Down',
          description: 'Database connection failed'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Checking database status...'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!showDetails) {
    // Compact badge version
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant="outline" 
          className={`${config.bgColor} ${config.borderColor} ${config.color} border`}
        >
          <Icon className="w-3 h-3 mr-1" />
          DB: {config.label}
        </Badge>
        {status.responseTime > 0 && (
          <span className="text-xs text-gray-500">
            {status.responseTime}ms
          </span>
        )}
      </div>
    );
  }

  // Detailed card version
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <Database className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">Database Status</h3>
              <Badge 
                variant="outline" 
                className={`${config.bgColor} ${config.borderColor} ${config.color} border`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={checkDatabaseStatus}
          disabled={isChecking}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Check
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Response Time</p>
          <p className="font-medium text-gray-900">
            {status.responseTime > 0 ? `${status.responseTime}ms` : '-'}
          </p>
        </div>
        
        <div>
          <p className="text-gray-600">Last Checked</p>
          <p className="font-medium text-gray-900">
            {status.lastChecked.toLocaleTimeString()}
          </p>
        </div>
        
        <div>
          <p className="text-gray-600">Auto Refresh</p>
          <div className="flex items-center gap-1">
            {autoRefresh ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-gray-400" />
            )}
            <span className="font-medium text-gray-900">
              {autoRefresh ? 'On' : 'Off'}
            </span>
          </div>
        </div>
        
        <div>
          <p className="text-gray-600">Health Score</p>
          <div className="flex items-center gap-1">
            <Activity className={`w-3 h-3 ${config.color}`} />
            <span className="font-medium text-gray-900">
              {status.status === 'healthy' ? '100%' :
               status.status === 'degraded' ? '75%' :
               status.status === 'down' ? '0%' : '-'}
            </span>
          </div>
        </div>
      </div>

      {status.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {status.error}
          </p>
        </div>
      )}

      {status.status === 'degraded' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Performance Issue:</strong> Database responses are slower than normal. 
            This may affect real-time updates.
          </p>
        </div>
      )}

      {status.status === 'down' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Connection Failed:</strong> Unable to connect to the database. 
            Real-time features are unavailable.
          </p>
        </div>
      )}
    </Card>
  );
}