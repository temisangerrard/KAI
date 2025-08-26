import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllMarkets, createMarketRecord, Market } from '@/lib/db/database'

const OptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentage: z.number(),
  tokens: z.number(),
  color: z.string(),
  imageUrl: z.string().optional(),
})

const MarketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  options: z.array(OptionSchema),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['active', 'resolved', 'cancelled']),
  totalTokens: z.number(),
  participants: z.number(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
})

export async function GET() {
  try {
    const markets = await getAllMarkets()
    return NextResponse.json(markets)
  } catch (error) {
    console.error('Failed to fetch markets', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received market data:', body)
    
    const result = MarketSchema.safeParse(body)
    if (!result.success) {
      console.error('Schema validation failed:', result.error)
      return NextResponse.json({ error: 'Invalid market data', details: result.error }, { status: 400 })
    }
    
    // Filter out undefined values from the validated data
    const cleanData = Object.fromEntries(
      Object.entries(result.data).filter(([_, value]) => value !== undefined)
    )
    
    console.log('Clean market data:', cleanData)
    const market = await createMarketRecord(cleanData as Market)
    return NextResponse.json(market, { status: 201 })
  } catch (error) {
    console.error('Failed to create market', error)
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
