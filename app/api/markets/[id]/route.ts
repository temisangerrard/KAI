import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getMarketById, updateMarket } from '@/lib/db/database'

const OptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentage: z.number(),
  tokens: z.number(),
  color: z.string(),
})

const MarketUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  options: z.array(OptionSchema).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['active', 'resolved', 'cancelled']).optional(),
  totalTokens: z.number().optional(),
  participants: z.number().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const market = await getMarketById(params.id)
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }
    return NextResponse.json(market)
  } catch (error) {
    console.error('Failed to fetch market', error)
    return NextResponse.json({ error: 'Failed to fetch market' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const result = MarketUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid market data' }, { status: 400 })
    }
    const market = await updateMarket(params.id, result.data)
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }
    return NextResponse.json(market)
  } catch (error) {
    console.error('Failed to update market', error)
    return NextResponse.json({ error: 'Failed to update market' }, { status: 500 })
  }
}
