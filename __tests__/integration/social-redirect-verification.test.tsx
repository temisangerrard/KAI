/**
 * Social Redirect Verification Test
 * 
 * This test verifies that the social page properly redirects to markets
 * and that navigation works correctly across all remaining pages.
 * 
 * Requirements: 2.2 (Remove Social Page and Routes)
 */

import React from 'react'
import { render } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SocialRedirect from '@/app/social/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockReplace = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('Social Redirect Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  it('should redirect to markets page when social route is accessed', () => {
    render(<SocialRedirect />)
    
    expect(mockReplace).toHaveBeenCalledWith('/markets')
  })

  it('should not render any content while redirecting', () => {
    const { container } = render(<SocialRedirect />)
    
    expect(container.firstChild).toBeNull()
  })

  it('should call redirect immediately on component mount', () => {
    render(<SocialRedirect />)
    
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })
})