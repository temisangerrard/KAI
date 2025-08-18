import { NextResponse } from "next/server"
import { getMarketById } from "@/lib/db/database"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const market = getMarketById(params.id)

  if (!market) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(market)
}

