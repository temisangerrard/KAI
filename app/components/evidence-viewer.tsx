'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Eye, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Calendar,
  Copy,
  Check
} from 'lucide-react'
import { Evidence } from '@/lib/types/database'
import { format } from 'date-fns'

interface EvidenceViewerProps {
  evidence: Evidence[]
  trigger?: React.ReactNode
  title?: string
  className?: string
}

interface EvidenceItemProps {
  evidence: Evidence
  index: number
}

function EvidenceItem({ evidence, index }: EvidenceItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'url':
        return <ExternalLink className="w-5 h-5 text-blue-600" />
      case 'screenshot':
        return <ImageIcon className="w-5 h-5 text-green-600" />
      case 'description':
        return <FileText className="w-5 h-5 text-purple-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  const getEvidenceTypeColor = (type: Evidence['type']) => {
    switch (type) {
      case 'url':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'screenshot':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'description':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="border-l-4 border-l-sage-500">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getEvidenceIcon(evidence.type)}
              <div>
                <Badge className={getEvidenceTypeColor(evidence.type)}>
                  Evidence #{index + 1} - {evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {format(evidence.uploadedAt.toDate(), 'MMM d, yyyy h:mm a')}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            {evidence.type === 'url' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Source URL:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(evidence.content)}
                    className="h-6 px-2"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border">
                  <a
                    href={evidence.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                  >
                    {evidence.content}
                  </a>
                </div>
              </div>
            ) : evidence.type === 'screenshot' ? (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Screenshot/File:</span>
                <div className="bg-gray-50 rounded-md p-3 border">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 break-all">{evidence.content}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Description:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(evidence.content)}
                    className="h-6 px-2"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {evidence.content}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Description */}
            {evidence.description && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Additional Notes:</span>
                <div className="bg-amber-50 rounded-md p-3 border border-amber-200">
                  <p className="text-sm text-amber-800 italic">
                    {evidence.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EvidenceViewer({ 
  evidence, 
  trigger,
  title = "Resolution Evidence",
  className = ""
}: EvidenceViewerProps) {
  const [open, setOpen] = useState(false)

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="w-4 h-4 mr-2" />
      View Evidence ({evidence.length})
    </Button>
  )

  if (evidence.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No evidence available</p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>{title}</span>
            <Badge variant="outline">{evidence.length} item{evidence.length !== 1 ? 's' : ''}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Evidence Summary */}
          <div className="bg-sage-50 rounded-lg p-4 border border-sage-200">
            <h4 className="font-medium text-sage-800 mb-2">Evidence Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-blue-600">
                  {evidence.filter(e => e.type === 'url').length}
                </div>
                <div className="text-gray-600">URLs</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">
                  {evidence.filter(e => e.type === 'screenshot').length}
                </div>
                <div className="text-gray-600">Files</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600">
                  {evidence.filter(e => e.type === 'description').length}
                </div>
                <div className="text-gray-600">Descriptions</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Evidence Items */}
          <div className="space-y-4">
            {evidence.map((item, index) => (
              <EvidenceItem
                key={item.id || index}
                evidence={item}
                index={index}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t">
            <p>Evidence collected during market resolution process</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}