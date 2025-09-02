import { NextRequest, NextResponse } from 'next/server'
import { getMarketById } from '@/lib/db/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const market = await getMarketById(params.id)
    
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Calculate current odds
    const totalTokens = market.totalTokens || 0
    const leadingOption = market.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    const leadingPercentage = totalTokens > 0 
      ? Math.round((leadingOption.tokens / totalTokens) * 100)
      : 50

    // For now, return a simple SVG image
    // In a production environment, you might use a service like @vercel/og or canvas
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f0fdf4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#dcfce7;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#bbf7d0;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- KAI Logo/Brand -->
        <text x="60" y="80" font-family="Inter, sans-serif" font-size="32" font-weight="bold" fill="#059669">
          KAI
        </text>
        <text x="130" y="80" font-family="Inter, sans-serif" font-size="18" fill="#6b7280">
          Prediction Platform
        </text>
        
        <!-- Market Title -->
        <text x="60" y="180" font-family="Inter, sans-serif" font-size="48" font-weight="bold" fill="#111827" text-anchor="start">
          ${market.title.length > 50 ? market.title.substring(0, 47) + '...' : market.title}
        </text>
        
        <!-- Market Description -->
        <text x="60" y="240" font-family="Inter, sans-serif" font-size="24" fill="#4b5563" text-anchor="start">
          ${market.description.length > 80 ? market.description.substring(0, 77) + '...' : market.description}
        </text>
        
        <!-- Current Odds -->
        <text x="60" y="320" font-family="Inter, sans-serif" font-size="20" fill="#6b7280">
          Leading: ${leadingOption.name} (${leadingPercentage}%)
        </text>
        
        <!-- Stats -->
        <text x="60" y="380" font-family="Inter, sans-serif" font-size="18" fill="#6b7280">
          ${market.participants} participants • ${totalTokens} tokens staked
        </text>
        
        <!-- Category Tag -->
        <rect x="60" y="420" width="${market.category.length * 12 + 20}" height="40" rx="20" fill="#059669"/>
        <text x="${60 + (market.category.length * 12 + 20) / 2}" y="445" font-family="Inter, sans-serif" font-size="16" font-weight="medium" fill="white" text-anchor="middle">
          ${market.category}
        </text>
        
        <!-- Call to Action -->
        <text x="60" y="520" font-family="Inter, sans-serif" font-size="20" fill="#059669" font-weight="medium">
          Support your opinion ✨
        </text>
      </svg>
    `

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate OG image:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}