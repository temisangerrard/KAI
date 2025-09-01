# Design Document

## Overview

The social media sharing feature enables users to share markets and their commitments across social platforms with rich media previews. The system generates shareable URLs with Open Graph and Twitter Card metadata, provides native mobile sharing capabilities, and tracks sharing analytics. The feature integrates seamlessly with the existing KAI platform architecture while maintaining the brand's sophisticated design aesthetic.

## Architecture

### Component Architecture
```
SocialSharing/
├── ShareButton.tsx           # Main share trigger component
├── ShareModal.tsx           # Desktop sharing options modal
├── ShareOptions.tsx         # Platform-specific sharing options
├── NativeShare.tsx          # Mobile native sharing wrapper
├── SharePreview.tsx         # Preview of shared content
└── ShareAnalytics.tsx       # Analytics tracking component
```

### API Architecture
```
/api/share/
├── generate-link/           # Generate shareable URLs with tracking
├── og-data/                 # Open Graph metadata endpoint
└── analytics/               # Share tracking and analytics
```

### URL Structure
```
Market Sharing:
/share/market/[marketId]?ref=[userId]&utm_source=[platform]

Commitment Sharing:
/share/commitment/[commitmentId]?ref=[userId]&utm_source=[platform]

Victory Sharing:
/share/victory/[commitmentId]?ref=[userId]&utm_source=[platform]
```

## Components and Interfaces

### Core Components

#### ShareButton Component
```typescript
interface ShareButtonProps {
  type: 'market' | 'commitment' | 'victory'
  data: Market | Prediction | VictoryData
  variant?: 'button' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onShare?: (platform: string) => void
}
```

#### ShareModal Component
```typescript
interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareData: ShareData
  platforms: SocialPlatform[]
}

interface ShareData {
  type: 'market' | 'commitment' | 'victory'
  title: string
  description: string
  url: string
  imageUrl?: string
  hashtags?: string[]
  via?: string
}
```

#### NativeShare Component
```typescript
interface NativeShareProps {
  shareData: ShareData
  fallback: () => void
  children: React.ReactNode
}
```

### Data Models

#### Social Platform Configuration
```typescript
interface SocialPlatform {
  id: 'twitter' | 'facebook' | 'linkedin' | 'instagram' | 'copy'
  name: string
  icon: React.ComponentType
  color: string
  shareUrl: string
  parameters: Record<string, string>
  mobileSupported: boolean
}
```

#### Share Analytics
```typescript
interface ShareEvent {
  id: string
  userId: string
  contentType: 'market' | 'commitment' | 'victory'
  contentId: string
  platform: string
  shareUrl: string
  createdAt: Timestamp
  referralClicks?: number
  conversions?: number
}
```

#### Open Graph Metadata
```typescript
interface OGMetadata {
  title: string
  description: string
  image: string
  url: string
  type: 'website' | 'article'
  siteName: string
  locale: string
  twitterCard: 'summary' | 'summary_large_image'
  twitterSite?: string
  twitterCreator?: string
}
```

## Data Models

### Market Sharing Data
```typescript
interface MarketShareData {
  market: Market
  shareUrl: string
  title: string // "Join me in predicting: [Market Title]"
  description: string // Market description + current odds
  imageUrl: string // Generated market card image
  hashtags: string[] // Based on market category and tags
  stats: {
    participants: number
    totalStaked: number
    timeLeft: string
  }
}
```

### Commitment Sharing Data
```typescript
interface CommitmentShareData {
  prediction: Prediction
  market: Market
  user: UserProfile
  shareUrl: string
  title: string // "I just backed [option] with [amount] KAI tokens!"
  description: string // Market context and confidence message
  imageUrl: string // Generated commitment card image
  hashtags: string[]
  stats: {
    confidence: number // Based on amount staked
    potentialWin: number
  }
}
```

### Victory Sharing Data
```typescript
interface VictoryShareData {
  prediction: Prediction
  market: Market
  user: UserProfile
  winnings: number
  shareUrl: string
  title: string // "I won [amount] KAI tokens on [market]!"
  description: string // Victory message with accuracy stats
  imageUrl: string // Generated victory card image
  hashtags: string[]
}
```

## Error Handling

### Share Generation Errors
- **Invalid Content ID**: Return 404 with fallback sharing options
- **User Privacy Settings**: Respect user privacy preferences for sharing
- **Platform API Limits**: Implement rate limiting and graceful degradation
- **Image Generation Failures**: Provide default KAI branded images

### Mobile Sharing Errors
- **Native Share Unavailable**: Fall back to web-based sharing modal
- **Clipboard API Failures**: Provide manual copy instructions
- **Deep Link Failures**: Ensure web fallbacks for all platforms

### Analytics Errors
- **Tracking Failures**: Log errors but don't block sharing functionality
- **Privacy Compliance**: Respect user consent for analytics tracking

## Testing Strategy

### Unit Tests
- **ShareButton Component**: Test rendering, click handlers, platform detection
- **Share URL Generation**: Test URL formatting, parameter encoding, tracking codes
- **OG Metadata Generation**: Test metadata accuracy for different content types
- **Mobile Detection**: Test native share availability and fallback behavior

### Integration Tests
- **End-to-End Sharing Flow**: Test complete sharing process from trigger to social platform
- **Cross-Platform Compatibility**: Test sharing on different devices and browsers
- **Analytics Integration**: Test event tracking and data collection
- **Privacy Compliance**: Test opt-out functionality and data handling

### Visual Tests
- **Share Modal Rendering**: Test modal appearance and responsive behavior
- **Generated Images**: Test Open Graph image generation and quality
- **Platform-Specific Previews**: Test how shares appear on each social platform

### Performance Tests
- **Image Generation Speed**: Test dynamic image creation performance
- **Share URL Generation**: Test URL creation and redirect performance
- **Mobile Native Share**: Test native sharing performance and reliability

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create share URL generation system
2. Implement basic ShareButton component
3. Set up Open Graph metadata endpoints
4. Create share analytics tracking

### Phase 2: Rich Media Generation
1. Implement dynamic image generation for share cards
2. Create platform-specific content formatting
3. Add Twitter Card and Facebook OG support
4. Implement image caching and optimization

### Phase 3: Mobile Enhancement
1. Add native mobile sharing capabilities
2. Implement responsive share modal
3. Add mobile-specific share options
4. Test cross-platform compatibility

### Phase 4: Analytics and Optimization
1. Implement comprehensive share tracking
2. Add conversion attribution
3. Create admin analytics dashboard
4. Optimize sharing performance and UX

## Technical Considerations

### SEO and Meta Tags
- Dynamic meta tag generation for shared URLs
- Server-side rendering for social media crawlers
- Proper canonical URLs and redirects
- Schema.org markup for rich snippets

### Performance Optimization
- Image generation caching with CDN
- Lazy loading of share components
- Efficient URL parameter handling
- Minimal JavaScript for core functionality

### Privacy and Security
- User consent for analytics tracking
- Secure share URL generation
- Rate limiting for share generation
- Content moderation for shared images

### Accessibility
- Keyboard navigation for share modals
- Screen reader support for share buttons
- High contrast mode compatibility
- Focus management in modal dialogs