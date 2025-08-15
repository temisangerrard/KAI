"use client"

import React from 'react'
import { Sparkles } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { TokenBalance } from '@/lib/types/transaction'

interface TokenVisualizationProps {
  tokenBalance: TokenBalance
}

export function TokenVisualization({ tokenBalance }: TokenVisualizationProps) {
  const data = [
    { name: 'Available', value: tokenBalance.available, color: '#ec4899' },
    { name: 'Pending', value: tokenBalance.pending, color: '#a855f7' }
  ].filter(item => item.value > 0)

  // If there's no pending tokens, just show available
  if (data.length === 1) {
    data[0].color = '#ec4899'
  }

  const config = {
    available: {
      label: 'Available Tokens',
      color: '#ec4899'
    },
    pending: {
      label: 'Pending Tokens',
      color: '#a855f7'
    }
  }

  return (
    <div className="relative h-48 w-full">
      {tokenBalance.total > 0 ? (
        <ChartContainer className="h-full w-full" config={config}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                const RADIAN = Math.PI / 180
                const radius = 25 + innerRadius + (outerRadius - innerRadius)
                const x = cx + radius * Math.cos(-midAngle * RADIAN)
                const y = cy + radius * Math.sin(-midAngle * RADIAN)
                
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    className="text-xs font-medium fill-gray-700"
                  >
                    {data[index].name} ({value.toLocaleString()})
                  </text>
                )
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center">
          <Sparkles className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500 text-center">No tokens yet</p>
          <p className="text-gray-400 text-sm text-center">Purchase tokens to get started</p>
        </div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
        <Sparkles className="h-6 w-6 text-kai-500 mb-1" />
        <p className="text-2xl font-bold text-gray-800">{tokenBalance.total.toLocaleString()}</p>
        <p className="text-sm text-gray-500">Total Tokens</p>
      </div>
    </div>
  )
}