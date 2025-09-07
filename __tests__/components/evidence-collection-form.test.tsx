/**
 * Tests for Evidence Collection Form Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EvidenceCollectionForm } from '@/app/components/evidence-collection-form'
import { Evidence } from '@/lib/types/evidence'

// Mock the validation service
jest.mock('@/lib/services/evidence-validation-service', () => ({
  EvidenceValidationService: {
    validateEvidence: jest.fn(() => ({
      isValid: true,
      errors: [],
      warnings: []
    }))
  }
}))

describe('EvidenceCollectionForm', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render empty state when no evidence provided', () => {
    render(
      <EvidenceCollectionForm
        evidence={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('No Evidence Added')).toBeInTheDocument()
    expect(screen.getByText('Add evidence to support your market resolution decision')).toBeInTheDocument()
  })

  it('should render add evidence buttons', () => {
    render(
      <EvidenceCollectionForm
        evidence={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Add URL')).toBeInTheDocument()
    expect(screen.getAllByText('Add Description')).toHaveLength(2) // Header and empty state
    expect(screen.getByText('Add File')).toBeInTheDocument()
  })

  it('should add URL evidence when Add URL button is clicked', () => {
    render(
      <EvidenceCollectionForm
        evidence={[]}
        onChange={mockOnChange}
      />
    )

    fireEvent.click(screen.getByText('Add URL'))

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'url',
        content: '',
        description: ''
      }
    ])
  })

  it('should add description evidence when Add Description button is clicked', () => {
    render(
      <EvidenceCollectionForm
        evidence={[]}
        onChange={mockOnChange}
      />
    )

    // Click the first "Add Description" button (in header)
    fireEvent.click(screen.getAllByText('Add Description')[0])

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'description',
        content: '',
        description: ''
      }
    ])
  })

  it('should add file evidence when Add File button is clicked', () => {
    render(
      <EvidenceCollectionForm
        evidence={[]}
        onChange={mockOnChange}
      />
    )

    fireEvent.click(screen.getByText('Add File'))

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'screenshot',
        content: '',
        description: ''
      }
    ])
  })

  it('should render existing evidence items', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://example.com/article',
        description: 'News article'
      },
      {
        type: 'description',
        content: 'This is what happened',
        description: 'Admin observation'
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Source URL')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/article')).toBeInTheDocument()
    expect(screen.getByDisplayValue('This is what happened')).toBeInTheDocument()
  })

  it('should update evidence content when input changes', async () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://example.com',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    const input = screen.getByDisplayValue('https://example.com')
    fireEvent.change(input, { target: { value: 'https://updated.com' } })

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'url',
        content: 'https://updated.com',
        description: ''
      }
    ])
  })

  it('should update evidence description when input changes', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://example.com',
        description: 'Original description'
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    const input = screen.getByDisplayValue('Original description')
    fireEvent.change(input, { target: { value: 'Updated description' } })

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'url',
        content: 'https://example.com',
        description: 'Updated description'
      }
    ])
  })

  it('should remove evidence when X button is clicked', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://example.com',
        description: 'News article'
      },
      {
        type: 'description',
        content: 'Admin observation',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    // Find X buttons by looking for buttons with X icon (lucide-x class or similar)
    const allButtons = screen.getAllByRole('button')
    // The X buttons should be the ones without text content (just icon)
    const xButtons = allButtons.filter(button => 
      button.textContent === '' && button.querySelector('svg')
    )
    
    // Click the first X button
    if (xButtons.length > 0) {
      fireEvent.click(xButtons[0])
    }

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        type: 'description',
        content: 'Admin observation',
        description: ''
      }
    ])
  })

  it('should render textarea for description evidence type', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'description',
        content: 'Long description content',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByRole('textbox', { name: /content/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Long description content')).toBeInTheDocument()
  })

  it('should render file upload area for screenshot evidence type', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'screenshot',
        content: 'screenshot.png',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Upload screenshot or document')).toBeInTheDocument()
    expect(screen.getByText('Supported: PNG, JPG, GIF, PDF (max 10MB)')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
  })

  it('should display evidence guidelines when evidence exists', () => {
    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://example.com',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Evidence Guidelines')).toBeInTheDocument()
    expect(screen.getByText('• Provide multiple sources when possible')).toBeInTheDocument()
    expect(screen.getByText('• Use official sources (news sites, company announcements)')).toBeInTheDocument()
  })

  it('should display validation errors when evidence is invalid', async () => {
    const { EvidenceValidationService } = require('@/lib/services/evidence-validation-service')
    
    EvidenceValidationService.validateEvidence.mockReturnValue({
      isValid: false,
      errors: [
        {
          field: 'content',
          message: 'Invalid URL format',
          code: 'invalid_url'
        }
      ],
      warnings: []
    })

    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'invalid-url',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    // Trigger validation by changing content
    const input = screen.getByDisplayValue('invalid-url')
    fireEvent.change(input, { target: { value: 'still-invalid' } })

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument()
      expect(screen.getByText('Invalid URL format')).toBeInTheDocument()
    })
  })

  it('should display validation warnings', async () => {
    const { EvidenceValidationService } = require('@/lib/services/evidence-validation-service')
    
    EvidenceValidationService.validateEvidence.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [
        {
          field: 'content',
          message: 'Shortened URLs may not be reliable evidence sources',
          code: 'suspicious_domain'
        }
      ]
    })

    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'https://bit.ly/short-link',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    // Trigger validation by changing content
    const input = screen.getByDisplayValue('https://bit.ly/short-link')
    fireEvent.change(input, { target: { value: 'https://bit.ly/another-link' } })

    await waitFor(() => {
      expect(screen.getByText('Warning:')).toBeInTheDocument()
      expect(screen.getByText('Shortened URLs may not be reliable evidence sources')).toBeInTheDocument()
    })
  })

  it('should apply error styling when validation fails', async () => {
    const { EvidenceValidationService } = require('@/lib/services/evidence-validation-service')
    
    EvidenceValidationService.validateEvidence.mockReturnValue({
      isValid: false,
      errors: [
        {
          field: 'content',
          message: 'Invalid URL format',
          code: 'invalid_url'
        }
      ],
      warnings: []
    })

    const evidence: Partial<Evidence>[] = [
      {
        type: 'url',
        content: 'invalid-url',
        description: ''
      }
    ]

    render(
      <EvidenceCollectionForm
        evidence={evidence}
        onChange={mockOnChange}
      />
    )

    // Trigger validation by changing content
    const input = screen.getByDisplayValue('invalid-url')
    fireEvent.change(input, { target: { value: 'still-invalid' } })

    await waitFor(() => {
      expect(input).toHaveClass('border-red-300')
    })
  })
})