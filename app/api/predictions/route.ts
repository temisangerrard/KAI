import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || "anonymous"

  const predictions = [
    {
      id: 1,
      title: "Who will be the fan favorite on BBNaija All Stars?",
      description: "The ultimate showdown is here! Which housemate has captured viewers' hearts?",
      options: [
        { name: "Dede", percentage: 45, tokens: 12500, color: "bg-kai-600" },
        { name: "Kuture", percentage: 35, tokens: 9800, color: "bg-primary-400" },
        { name: "Capy", percentage: 20, tokens: 5600, color: "bg-blue-400" },
      ],
      category: "BBNaija",
      vibeScore: 98,
      totalBacked: 27900,
      participants: 1247,
      timeLeft: "2 days",
      trending: true,
      userId,
    },
    {
      id: 2,
      title: "Davido vs Wizkid: Who creates the better album?",
      description: "The eternal debate continues! Both artists are releasing new music",
      options: [
        { name: "Davido", percentage: 52, tokens: 15600, color: "bg-orange-400" },
        { name: "Wizkid", percentage: 48, tokens: 14400, color: "bg-green-400" },
      ],
      category: "Music",
      vibeScore: 95,
      totalBacked: 30000,
      participants: 892,
      timeLeft: "5 days",
      trending: true,
      userId,
    },
  ]

  return NextResponse.json({ predictions })
}
