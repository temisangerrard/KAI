"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Market } from "@/lib/db/database"

interface AdminResolutionActionsProps {
  market: Market
  onResolutionApproved?: () => Promise<void>
}

export function AdminResolutionActions({ market, onResolutionApproved }: AdminResolutionActionsProps) {
  const [isApproving, setIsApproving] = useState(false)
  const pending = market.pendingResolution

  if (!pending) {
    return null
  }

  const optionName = market.options.find(o => o.id === pending.optionId)?.name || pending.optionId

  const approveResolution = async () => {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/admin/markets/${market.id}/resolution/approve`, {
        method: 'POST'
      })
      if (res.ok && onResolutionApproved) {
        await onResolutionApproved()
      }
    } catch (err) {
      console.error('Failed to approve resolution', err)
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Pending Resolution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">
          Submitted option: <span className="font-medium">{optionName}</span>
        </p>
        <Button onClick={approveResolution} disabled={isApproving}>
          {isApproving ? 'Approving...' : 'Approve Resolution'}
        </Button>
      </CardContent>
    </Card>
  )
}
