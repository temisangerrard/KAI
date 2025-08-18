import { NextResponse } from "next/server"
import { addMarket, getAllMarkets } from "@/lib/db/database"
import { Market, PredictionOption } from "@/app/auth/auth-context"

export async function GET() {
  const markets = getAllMarkets()
  return NextResponse.json(markets)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const marketId = `market_${Date.now()}`

    const options: PredictionOption[] = (body.options || []).map(
      (opt: any, index: number) => ({
        id: `option_${marketId}_${index}`,
        name: opt.name,
        percentage: 0,
        tokens: 0,
        color: opt.color,
      })
    )

    const market: Market = {
      id: marketId,
      title: body.title,
      description: body.description,
      category: body.category,
      options,
      startDate: new Date(),
      endDate: new Date(body.endDate),
      status: "active",
      totalTokens: 0,
      participants: 0,
    }

    addMarket(market)
    return NextResponse.json(market, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create market" },
      { status: 500 }
    )
  }
}

