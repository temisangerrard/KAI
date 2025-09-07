"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus,
  X,
  Link as LinkIcon,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Evidence } from '@/lib/types/database'

interface EvidenceCollectionFormProps {
  evidence: Evidence[]
  onChange: (evidence: Evidence[]) => void
}

interface EvidenceItem {
  id: string
  type: 'url' | 'screenshot' | 'description'
  content: string
  description?: string
}

export function EvidenceCollectionForm({ 
  evidence, 
  onChange 
}: EvidenceCollectionFormProps) {
  const [newEvidenceType, setNewEvidenceType] = useState<'url' | 'screenshot' | 'description'>('url')
  const [newEvidenceContent, setNewEvidenceContent] = useState('')
  const [newEvidenceDescription, setNewEvidenceDescription] = useState('')

  const addEvidence = () => {
    if (!newEvidenceContent.trim()) return

    const newEvidence: Evidence = {
      id: Date.now().toString(),
      type: newEvidenceType,
      content: newEvidenceContent.trim(),
      description: newEvidenceDescription.trim() || undefined,
      uploadedAt: new Date() as any // Will be converted to Timestamp in service
    }

    onChange([...evidence, newEvidence])
    
    // Reset form
    setNewEvidenceContent('')
    setNewEvidenceDescription('')
  }

  const removeEvidence = (id: string) => {
    onChange(evidence.filter(e => e.id !== id))
  }

  const updateEvidence = (id: string, updates: Partial<Evidence>) => {
    onChange(evidence.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'url':
        return <LinkIcon className="w-4 h-4" />
      case 'screenshot':
        return <Upload className="w-4 h-4" />
      case 'description':
        return <FileText className="w-4 h-4" />
    }
  }

  const getEvidenceTypeLabel = (type: Evidence['type']) => {
    switch (type) {
      case 'url':
        return 'Source URL'
      case 'screenshot':
        return 'Screenshot'
      case 'description':
        return 'Description'
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Resolution Evidence</h3>
          <p className="text-sm text-gray-600">
            Provide evidence to support your resolution decision. Include source URLs, 
            screenshots, or detailed descriptions of how the outcome was determined.
          </p>
        </div>

        {/* Evidence Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Evidence Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Include at least one reliable source URL when possible</li>
            <li>• Screenshots should clearly show the relevant information</li>
            <li>• Descriptions should be detailed and objective</li>
            <li>• All evidence will be publicly visible to users</li>
          </ul>
        </div>

        {/* Existing Evidence */}
        {evidence.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Added Evidence ({evidence.length})</h4>
            {evidence.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getEvidenceIcon(item.type)}
                      <Badge variant="outline">
                        {getEvidenceTypeLabel(item.type)}
                      </Badge>
                      {item.type === 'url' && !validateUrl(item.content) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Invalid URL
                        </Badge>
                      )}
                      {item.type === 'url' && validateUrl(item.content) && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Valid URL
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {item.type === 'url' ? (
                        <div>
                          <Label className="text-xs text-gray-600">URL</Label>
                          <Input
                            value={item.content}
                            onChange={(e) => updateEvidence(item.id, { content: e.target.value })}
                            placeholder="https://example.com/source"
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs text-gray-600">Content</Label>
                          <Textarea
                            value={item.content}
                            onChange={(e) => updateEvidence(item.id, { content: e.target.value })}
                            placeholder="Enter detailed description..."
                            className="text-sm min-h-[80px]"
                          />
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-xs text-gray-600">Description (Optional)</Label>
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateEvidence(item.id, { description: e.target.value })}
                          placeholder="Additional context or explanation..."
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEvidence(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Evidence */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Add Evidence</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-700">Type</Label>
              <Select value={newEvidenceType} onValueChange={(value: any) => setNewEvidenceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Source URL
                    </div>
                  </SelectItem>
                  <SelectItem value="description">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description
                    </div>
                  </SelectItem>
                  <SelectItem value="screenshot">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Screenshot
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <Label className="text-sm text-gray-700">
                {newEvidenceType === 'url' ? 'URL' : 'Content'}
              </Label>
              {newEvidenceType === 'url' ? (
                <Input
                  value={newEvidenceContent}
                  onChange={(e) => setNewEvidenceContent(e.target.value)}
                  placeholder="https://example.com/source"
                />
              ) : newEvidenceType === 'screenshot' ? (
                <Input
                  value={newEvidenceContent}
                  onChange={(e) => setNewEvidenceContent(e.target.value)}
                  placeholder="Screenshot file path or description"
                />
              ) : (
                <Textarea
                  value={newEvidenceContent}
                  onChange={(e) => setNewEvidenceContent(e.target.value)}
                  placeholder="Enter detailed description of the evidence..."
                  className="min-h-[40px]"
                />
              )}
            </div>
            
            <div>
              <Label className="text-sm text-gray-700">Description</Label>
              <Input
                value={newEvidenceDescription}
                onChange={(e) => setNewEvidenceDescription(e.target.value)}
                placeholder="Optional context..."
              />
            </div>
          </div>
          
          <Button 
            onClick={addEvidence}
            disabled={!newEvidenceContent.trim()}
            variant="outline"
            className="w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Evidence
          </Button>
        </div>

        {/* Evidence Summary */}
        {evidence.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No evidence added yet</p>
            <p className="text-sm">Add at least one piece of evidence to proceed</p>
          </div>
        )}
      </div>
    </Card>
  )
}