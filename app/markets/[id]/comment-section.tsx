"use client"

import { DiscussionEmbed } from 'disqus-react'
import { MessageCircle } from "lucide-react"

interface CommentSectionProps {
  marketId: string
  marketTitle: string
}

export function CommentSection({ marketId, marketTitle }: CommentSectionProps) {
  const disqusConfig = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    identifier: `market-${marketId}`,
    title: marketTitle,
    language: 'en' // Change to your preferred language
  }

  return (
    <div className="w-full">
      <div className="mb-6 p-4 bg-kai-50 rounded-lg border border-kai-200">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-kai-600" />
          <p className="text-sm font-medium text-gray-700">
            Discussion about {marketTitle}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          What's on your mind?
        </p>
      </div>
      
      <div className="min-h-[200px]">
        <DiscussionEmbed
          shortname='kaipredicts'
          config={disqusConfig}
        />
      </div>
    </div>
  )
}