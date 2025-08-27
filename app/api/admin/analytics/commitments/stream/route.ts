import { NextRequest } from 'next/server';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // For now, return true - implement proper admin auth later
  return true;
}

// Track active connections for monitoring
const activeConnections = new Set<ReadableStreamDefaultController>();
let updateCounter = 0;

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        activeConnections.add(controller);
        
        // Send initial connection message
        const initialMessage = {
          type: 'connection',
          timestamp: new Date().toISOString(),
          message: 'Connected to analytics stream',
          marketId: marketId || 'all'
        };
        
        controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

        // Set up periodic updates
        const updateInterval = setInterval(async () => {
          try {
            // Fetch latest analytics
            const analytics = await AdminCommitmentService.getCommitmentAnalytics();
            
            let marketAnalytics = null;
            if (marketId) {
              const result = await AdminCommitmentService.getMarketCommitments(marketId, {
                includeAnalytics: true,
                pageSize: 1
              });
              marketAnalytics = result.analytics;
            }

            const update = {
              type: 'analytics_update',
              timestamp: new Date().toISOString(),
              analytics,
              marketAnalytics,
              updateId: ++updateCounter
            };

            // Send update to this connection
            controller.enqueue(`data: ${JSON.stringify(update)}\n\n`);

          } catch (error) {
            console.error('[SSE_STREAM] Error sending update:', error);
            
            const errorMessage = {
              type: 'error',
              timestamp: new Date().toISOString(),
              message: 'Error fetching analytics update',
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            
            controller.enqueue(`data: ${JSON.stringify(errorMessage)}\n\n`);
          }
        }, 30000); // Update every 30 seconds

        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = {
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
              activeConnections: activeConnections.size
            };
            
            controller.enqueue(`data: ${JSON.stringify(heartbeat)}\n\n`);
          } catch (error) {
            // Connection likely closed
            clearInterval(updateInterval);
            clearInterval(heartbeatInterval);
            activeConnections.delete(controller);
          }
        }, 15000); // Heartbeat every 15 seconds

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(updateInterval);
          clearInterval(heartbeatInterval);
          activeConnections.delete(controller);
          controller.close();
        });
      },

      cancel() {
        // Connection closed by client
        activeConnections.delete(this as any);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('[SSE_STREAM] Error setting up stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Broadcast update to all connected clients
 */
export function broadcastAnalyticsUpdate(update: any) {
  const message = {
    type: 'broadcast_update',
    timestamp: new Date().toISOString(),
    ...update
  };

  const messageData = `data: ${JSON.stringify(message)}\n\n`;

  // Send to all active connections
  activeConnections.forEach(controller => {
    try {
      controller.enqueue(messageData);
    } catch (error) {
      // Remove dead connections
      activeConnections.delete(controller);
    }
  });
}

/**
 * Get current connection statistics
 */
export function getConnectionStats() {
  return {
    activeConnections: activeConnections.size,
    totalUpdates: updateCounter,
    uptime: process.uptime()
  };
}