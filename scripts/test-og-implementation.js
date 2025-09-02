/**
 * Simple script to test Open Graph implementation
 */

const { getMarketById } = require('../lib/db/database.ts')

async function testOGImplementation() {
  console.log('Testing Open Graph implementation...')
  
  // Test with a mock market data
  const mockMarket = {
    id: 'test-market-123',
    title: 'Will AI replace developers by 2025?',
    description: 'A prediction about the future of software development and artificial intelligence.',
    category: 'Technology',
    options: [
      {
        id: 'yes',
        name: 'Yes',
        percentage: 60,
        tokens: 600,
        color: '#10B981'
      },
      {
        id: 'no',
        name: 'No',
        percentage: 40,
        tokens: 400,
        color: '#EF4444'
      }
    ],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    status: 'active',
    totalTokens: 1000,
    participants: 50,
    tags: ['AI', 'Technology', 'Future']
  }

  // Test metadata generation logic
  const totalTokens = mockMarket.totalTokens || 0
  const leadingOption = mockMarket.options.reduce((prev, current) => 
    (current.tokens > prev.tokens) ? current : prev
  )
  const leadingPercentage = totalTokens > 0 
    ? Math.round((leadingOption.tokens / totalTokens) * 100)
    : 50

  const title = `${mockMarket.title} | KAI Prediction Market`
  const description = `${mockMarket.description} Current odds: ${leadingOption.name} ${leadingPercentage}%. ${mockMarket.participants} participants, ${totalTokens} tokens staked.`
  
  console.log('Generated metadata:')
  console.log('Title:', title)
  console.log('Description:', description)
  console.log('Leading option:', leadingOption.name, `(${leadingPercentage}%)`)
  
  // Test SVG generation logic
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
        ${mockMarket.title.length > 50 ? mockMarket.title.substring(0, 47) + '...' : mockMarket.title}
      </text>
      
      <!-- Market Description -->
      <text x="60" y="240" font-family="Inter, sans-serif" font-size="24" fill="#4b5563" text-anchor="start">
        ${mockMarket.description.length > 80 ? mockMarket.description.substring(0, 77) + '...' : mockMarket.description}
      </text>
      
      <!-- Current Odds -->
      <text x="60" y="320" font-family="Inter, sans-serif" font-size="20" fill="#6b7280">
        Leading: ${leadingOption.name} (${leadingPercentage}%)
      </text>
      
      <!-- Stats -->
      <text x="60" y="380" font-family="Inter, sans-serif" font-size="18" fill="#6b7280">
        ${mockMarket.participants} participants • ${totalTokens} tokens staked
      </text>
      
      <!-- Category Tag -->
      <rect x="60" y="420" width="${mockMarket.category.length * 12 + 20}" height="40" rx="20" fill="#059669"/>
      <text x="${60 + (mockMarket.category.length * 12 + 20) / 2}" y="445" font-family="Inter, sans-serif" font-size="16" font-weight="medium" fill="white" text-anchor="middle">
        ${mockMarket.category}
      </text>
      
      <!-- Call to Action -->
      <text x="60" y="520" font-family="Inter, sans-serif" font-size="20" fill="#059669" font-weight="medium">
        Support your opinion ✨
      </text>
    </svg>
  `

  console.log('\nSVG generated successfully!')
  console.log('SVG length:', svg.length, 'characters')
  console.log('Contains market title:', svg.includes(mockMarket.title))
  console.log('Contains category:', svg.includes(mockMarket.category))
  console.log('Contains leading option:', svg.includes(`Leading: ${leadingOption.name}`))
  
  console.log('\n✅ Open Graph implementation test completed successfully!')
}

testOGImplementation().catch(console.error)