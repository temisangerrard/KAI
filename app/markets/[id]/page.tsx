import { Metadata } from 'next'
import { getMarketById } from "@/lib/db/database"
import { MarketDetailClient } from "./market-detail-client"
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

// Generate metadata for Open Graph tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const market = await getMarketById(params.id)
  
  if (!market) {
    return {
      title: 'Market Not Found | KAI',
      description: 'The prediction market you are looking for could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  // Calculate current odds for display
  const totalTokens = market.totalTokens || 0
  const leadingOption = market.options.reduce((prev, current) => 
    (current.tokens > prev.tokens) ? current : prev
  )
  const leadingPercentage = totalTokens > 0 
    ? Math.round((leadingOption.tokens / totalTokens) * 100)
    : 50

  const title = `${market.title} | KAI Prediction Market`
  const description = `${market.description} Current odds: ${leadingOption.name} ${leadingPercentage}%. ${market.participants} participants, ${totalTokens} tokens staked.`
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kai-platform.com'}/markets/${market.id}`
  
  // Generate a basic image URL (placeholder for now)
  const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kai-platform.com'}/api/og/market/${market.id}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    keywords: [
      'prediction market',
      'KAI',
      market.category.toLowerCase(),
      ...market.tags?.map(tag => tag.toLowerCase()) || [],
      'betting',
      'forecasting',
      'social prediction'
    ],
    authors: [{ name: 'KAI Prediction Platform' }],
    creator: 'KAI Prediction Platform',
    publisher: 'KAI Prediction Platform',
    openGraph: {
      title,
      description,
      url,
      siteName: 'KAI Prediction Platform',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: market.title,
          type: 'image/svg+xml',
        },
      ],
      locale: 'en_US',
      type: 'website',
      publishedTime: market.startDate.toISOString(),
      modifiedTime: new Date().toISOString(),
      tags: market.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      site: '@KAIPlatform',
      creator: '@KAIPlatform',
    },
    robots: {
      index: market.status === 'active',
      follow: true,
      googleBot: {
        index: market.status === 'active',
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/svg+xml',
      'twitter:image:alt': market.title,
      'twitter:label1': 'Category',
      'twitter:data1': market.category,
      'twitter:label2': 'Participants',
      'twitter:data2': market.participants.toString(),
    },
  }
}

export default async function MarketDetailPage({ params }: Props) {
  const market = await getMarketById(params.id)
  
  if (!market) {
    notFound()
  }

  return <MarketDetailClient market={market} />
}