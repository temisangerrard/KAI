import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NativeShare } from '@/app/components/native-share'

// Mock the mobile utilities
jest.mock('@/lib/mobile-consolidated', () => ({
  mobile: {
    isMobileViewport: jest.fn()
  }
}))

const mockMobile = require('@/lib/mobile-consolidated').mobile

describe('NativeShare', () => {
  const mockShareData = {
    title: 'Test Market',
    text: 'Check out this prediction market',
    url: 'https://example.com/market/123'
  }

  const mockFallback = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset navigator.share mock
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  it('renders children correctly', () => {
    mockMobile.isMobileViewport.mockReturnValue(false)
    
    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('uses native share API on mobile when available', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: mockShareData.title,
        text: mockShareData.text,
        url: mockShareData.url
      })
    })

    expect(mockFallback).not.toHaveBeenCalled()
  })

  it('falls back to modal on desktop', async () => {
    mockMobile.isMobileViewport.mockReturnValue(false)

    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockFallback).toHaveBeenCalled()
    })
  })

  it('falls back to modal when Web Share API is not available', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    // Don't define navigator.share

    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockFallback).toHaveBeenCalled()
    })
  })

  it('falls back to modal when native share fails (non-abort error)', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockRejectedValue(new Error('Share failed'))
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled()
      expect(mockFallback).toHaveBeenCalled()
    })
  })

  it('does not fall back when user cancels native share', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const abortError = new Error('User cancelled')
    abortError.name = 'AbortError'
    const mockShare = jest.fn().mockRejectedValue(abortError)
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(
      <NativeShare shareData={mockShareData} fallback={mockFallback}>
        <button>Share</button>
      </NativeShare>
    )

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled()
    })

    // Should not call fallback when user cancels
    expect(mockFallback).not.toHaveBeenCalled()
  })
})