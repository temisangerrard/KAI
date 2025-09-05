'use client'

/**
 * Evidence Collection Form Component
 * Used by admins to collect evidence when resolving markets
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Upload, Link, FileText } from 'lucide-react'
import { Evidence, EvidenceValidationResult } from '@/lib/types/evidence'
import { EvidenceValidationService } from '@/lib/services/evidence-validation-service'

interface EvidenceCollectionFormProps {
  evidence: Partial<Evidence>[]
  onChange: (evidence: Partial<Evidence>[]) => void
  className?: string
}

export function EvidenceCollectionForm({
  evidence,
  onChange,
  className = ''
}: EvidenceCollectionFormProps) {
  const [validationResults, setValidationResults] = useState<Record<number, EvidenceValidationResult>>({})

  const addEvidence = (type: 'url' | 'description' | 'screenshot') => {
    const newEvidence: Partial<Evidence> = {
      type,
      content: '',
      description: ''
    }
    onChange([...evidence, newEvidence])
  }

  const updateEvidence = (index: number, updates: Partial<Evidence>) => {
    const updated = [...evidence]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)

    // Validate the updated evidence
    const validation = EvidenceValidationService.validateEvidence(updated[index])
    setValidationResults(prev => ({
      ...prev,
      [index]: validation
    }))
  }

  const removeEvidence = (index: number) => {
    const updated = evidence.filter((_, i) => i !== index)
    onChange(updated)
    
    // Remove validation result
    setValidationResults(prev => {
      const newResults = { ...prev }
      delete newResults[index]
      return newResults
    })
  }

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link className="h-4 w-4" />
      case 'screenshot':
        return <Upload className="h-4 w-4" />
      case 'description':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getEvidenceTypeLabel = (type: string) => {
    switch (type) {
      case 'url':
        return 'Source URL'
      case 'screenshot':
        return 'Screenshot/File'
      case 'description':
        return 'Description'
      default:
        return 'Evidence'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Evidence Collection</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEvidence('url')}
          >
            <Link className="h-4 w-4 mr-1" />
            Add URL
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEvidence('description')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Add Description
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEvidence('screenshot')}
          >
            <Upload className="h-4 w-4 mr-1" />
            Add File
          </Button>
        </div>
      </div>

      {evidence.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Evidence Added</h4>
            <p className="text-gray-600 mb-4">
              Add evidence to support your market resolution decision
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addEvidence('url')}
              >
                <Link className="h-4 w-4 mr-2" />
                Add Source URL
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => addEvidence('description')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Description
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {evidence.map((item, index) => {
        const validation = validationResults[index]
        const hasErrors = validation && !validation.isValid
        const hasWarnings = validation && validation.warnings.length > 0

        return (
          <Card key={index} className={hasErrors ? 'border-red-200' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getEvidenceIcon(item.type || '')}
                  <CardTitle className="text-base">
                    {getEvidenceTypeLabel(item.type || '')}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {item.type}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEvidence(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Field */}
              <div>
                <Label htmlFor={`evidence-content-${index}`}>
                  {item.type === 'url' ? 'URL' : 
                   item.type === 'screenshot' ? 'File Path/Name' : 
                   'Content'}
                </Label>
                {item.type === 'description' ? (
                  <Textarea
                    id={`evidence-content-${index}`}
                    value={item.content || ''}
                    onChange={(e) => updateEvidence(index, { content: e.target.value })}
                    placeholder={
                      item.type === 'url' ? 'https://example.com/source' :
                      item.type === 'screenshot' ? 'screenshot.png' :
                      'Detailed explanation of the evidence...'
                    }
                    className={hasErrors ? 'border-red-300' : ''}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={`evidence-content-${index}`}
                    value={item.content || ''}
                    onChange={(e) => updateEvidence(index, { content: e.target.value })}
                    placeholder={
                      item.type === 'url' ? 'https://example.com/source' :
                      'File name or path'
                    }
                    className={hasErrors ? 'border-red-300' : ''}
                  />
                )}
              </div>

              {/* Description Field */}
              <div>
                <Label htmlFor={`evidence-description-${index}`}>
                  Description (Optional)
                </Label>
                <Input
                  id={`evidence-description-${index}`}
                  value={item.description || ''}
                  onChange={(e) => updateEvidence(index, { description: e.target.value })}
                  placeholder="Brief description of this evidence"
                />
              </div>

              {/* Validation Messages */}
              {hasErrors && (
                <div className="space-y-1">
                  {validation.errors.map((error, errorIndex) => (
                    <div key={errorIndex} className="text-sm text-red-600 flex items-start gap-1">
                      <span className="font-medium">Error:</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {hasWarnings && (
                <div className="space-y-1">
                  {validation.warnings.map((warning, warningIndex) => (
                    <div key={warningIndex} className="text-sm text-amber-600 flex items-start gap-1">
                      <span className="font-medium">Warning:</span>
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* File Upload for Screenshots */}
              {item.type === 'screenshot' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload screenshot or document
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported: PNG, JPG, GIF, PDF (max 10MB)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        // In a real implementation, this would open a file picker
                        console.log('File upload not implemented in demo')
                      }}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Evidence Guidelines */}
      {evidence.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-900 mb-2">Evidence Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Provide multiple sources when possible</li>
              <li>• Use official sources (news sites, company announcements)</li>
              <li>• Avoid shortened URLs (bit.ly, tinyurl)</li>
              <li>• Include screenshots for visual evidence</li>
              <li>• Write clear descriptions explaining the evidence</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}