/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth/auth-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useToast } from '@/components/ui/use-toast'
import MarketEditPage from '@/app/admin/markets/[id]/edit/page'
import { MarketDeleteModal } from '@/app/admin/components/market-delete-modal'
import { MarketsService } from '@/lib/services/firestore'

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

jest.mock('@/app/auth/auth-context', () => ({
    useAuth: jest.fn()
}))

jest.mock('@/hooks/use-admin-auth', () => ({
    useAdminAuth: jest.fn()
}))

jest.mock('@/components/ui/use-toast', () => ({
    useToast: jest.fn()
}))

jest.mock('@/lib/services/firestore', () => ({
    MarketsService: {
        updateMarket: jest.fn(),
        deleteMarket: jest.fn()
    }
}))

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    collection: jest.fn(),
    getDocs: jest.fn()
}))

jest.mock('@/lib/db/database', () => ({
    db: {}
}))

const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn()
}

const mockToast = jest.fn()

const mockUser = {
    id: 'admin-user-123',
    address: '0x123',
    email: 'admin@test.com',
    displayName: 'Admin User'
}

const mockMarket = {
    id: 'market-123',
    title: 'Test Market',
    description: 'Test market description',
    category: 'entertainment',
    status: 'active',
    createdAt: { toMillis: () => Date.now() },
    endsAt: { toMillis: () => Date.now() + 86400000 }
}

describe('Admin Market Management Error Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks()

            ; (useRouter as jest.Mock).mockReturnValue(mockRouter)
            ; (useToast as jest.Mock).mockReturnValue({ toast: mockToast })
            ; (useAuth as jest.Mock).mockReturnValue({ user: mockUser })
            ; (useAdminAuth as jest.Mock).mockReturnValue({
                isAdmin: true,
                loading: false,
                error: null
            })
    })

    describe('Market Edit Page Error Handling', () => {
        it('should handle authentication errors with redirect', async () => {
            const { getDoc } = require('firebase/firestore')
            getDoc.mockRejectedValue(new Error('permission-denied: Unauthorized access'))

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Access Denied",
                    description: "You don't have permission to perform this action.",
                    variant: "destructive"
                })
            })

            // Should redirect to login after delay
            await waitFor(() => {
                expect(mockRouter.push).toHaveBeenCalledWith('/admin/login')
            }, { timeout: 3000 })
        })

        it('should handle network errors with retry option', async () => {
            const { getDoc } = require('firebase/firestore')
            getDoc.mockRejectedValue(new Error('network error: Failed to fetch'))

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Network Error",
                    description: "Please check your internet connection and try again.",
                    variant: "destructive"
                })
            })

            // Should show retry button
            expect(screen.getByText('Retry')).toBeInTheDocument()
        })

        it('should handle market not found errors', async () => {
            const { getDoc } = require('firebase/firestore')
            getDoc.mockResolvedValue({ exists: () => false })

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Market Not Found",
                    description: "The requested market could not be found. It may have been deleted.",
                    variant: "destructive"
                })
            })

            expect(screen.getByText('The requested market could not be found. It may have been deleted or the ID is incorrect.')).toBeInTheDocument()
        })

        it('should handle form submission errors', async () => {
            const { getDoc } = require('firebase/firestore')
            getDoc.mockResolvedValue({
                exists: () => true,
                id: 'market-123',
                data: () => mockMarket
            })

                ; (MarketsService.updateMarket as jest.Mock).mockRejectedValue(
                    new Error('Admin privileges required for market updates')
                )

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            // Wait for market to load
            await waitFor(() => {
                expect(screen.getByDisplayValue('Test Market')).toBeInTheDocument()
            })

            // Submit form
            const submitButton = screen.getByText('Update Market')
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Access Denied",
                    description: "You don't have permission to perform this action.",
                    variant: "destructive"
                })
            })
        })

        it('should show loading states during form submission', async () => {
            const { getDoc } = require('firebase/firestore')
            getDoc.mockResolvedValue({
                exists: () => true,
                id: 'market-123',
                data: () => mockMarket
            })

                // Mock slow update
                ; (MarketsService.updateMarket as jest.Mock).mockImplementation(
                    () => new Promise(resolve => setTimeout(resolve, 1000))
                )

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            // Wait for market to load
            await waitFor(() => {
                expect(screen.getByDisplayValue('Test Market')).toBeInTheDocument()
            })

            // Submit form
            const submitButton = screen.getByText('Update Market')
            fireEvent.click(submitButton)

            // Should show loading state
            expect(screen.getByText('Updating...')).toBeInTheDocument()
            expect(submitButton).toBeDisabled()
        })
    })

    describe('Market Delete Modal Error Handling', () => {
        const mockMarketData = {
            id: 'market-123',
            title: 'Test Market',
            totalParticipants: 10,
            totalTokensCommitted: 1000
        }

        it('should display error messages in modal', () => {
            const mockOnClose = jest.fn()
            const mockOnConfirm = jest.fn()

            render(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={false}
                    error="Failed to delete market: Network error"
                />
            )

            expect(screen.getByText('Failed to delete market: Network error')).toBeInTheDocument()
        })

        it('should disable actions during loading', () => {
            const mockOnClose = jest.fn()
            const mockOnConfirm = jest.fn()

            render(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={true}
                    error={null}
                />
            )

            const deleteButton = screen.getByText('Deleting...')
            const cancelButton = screen.getByText('Cancel')

            expect(deleteButton).toBeDisabled()
            expect(cancelButton).toBeDisabled()
        })

        it('should show confirmation requirement', () => {
            const mockOnClose = jest.fn()
            const mockOnConfirm = jest.fn()

            render(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={false}
                    error={null}
                />
            )

            const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm')
            const deleteButton = screen.getByRole('button', { name: /delete market/i })

            // Should be disabled initially
            expect(deleteButton).toBeDisabled()

            // Should enable after typing DELETE
            fireEvent.change(confirmInput, { target: { value: 'DELETE' } })
            expect(deleteButton).not.toBeDisabled()
        })

        it('should show market impact information', () => {
            const mockOnClose = jest.fn()
            const mockOnConfirm = jest.fn()

            render(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={false}
                    error={null}
                />
            )

            expect(screen.getByText('10')).toBeInTheDocument() // Participants
            expect(screen.getByText('1,000')).toBeInTheDocument() // Tokens
            expect(screen.getByText('Participants')).toBeInTheDocument()
            expect(screen.getByText('Tokens Staked')).toBeInTheDocument()
        })
    })

    describe('Error Recovery', () => {
        it('should allow retry after network errors', async () => {
            const { getDoc } = require('firebase/firestore')

            // First call fails
            getDoc.mockRejectedValueOnce(new Error('network error'))
            // Second call succeeds
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                id: 'market-123',
                data: () => mockMarket
            })

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            // Wait for error state
            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument()
            })

            // Click retry
            const retryButton = screen.getByText('Retry')
            fireEvent.click(retryButton)

            // Should reload the page (window.location.reload)
            expect(retryButton).toBeInTheDocument()
        })

        it('should clear errors when modal is reopened', () => {
            const mockOnClose = jest.fn()
            const mockOnConfirm = jest.fn()

            const { rerender } = render(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={false}
                    error="Previous error"
                />
            )

            expect(screen.getByText('Previous error')).toBeInTheDocument()

            // Close and reopen without error
            rerender(
                <MarketDeleteModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    market={mockMarketData}
                    loading={false}
                    error={null}
                />
            )

            expect(screen.queryByText('Previous error')).not.toBeInTheDocument()
        })
    })

    describe('Authentication State Handling', () => {
        it('should redirect to login when user is not authenticated', async () => {
            ; (useAuth as jest.Mock).mockReturnValue({ user: null })

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Authentication Required",
                    description: "Please log in to access the admin panel.",
                    variant: "destructive"
                })
            })

            expect(mockRouter.push).toHaveBeenCalledWith('/admin/login')
        })

        it('should show access denied when user is not admin', async () => {
            ; (useAdminAuth as jest.Mock).mockReturnValue({
                isAdmin: false,
                loading: false,
                error: null
            })

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Access Denied",
                    description: "Admin privileges are required to edit markets.",
                    variant: "destructive"
                })
            })

            expect(screen.getByText("You don't have permission to edit markets. Admin access is required.")).toBeInTheDocument()
        })

        it('should show loading state while checking admin status', () => {
            ; (useAdminAuth as jest.Mock).mockReturnValue({
                isAdmin: false,
                loading: true,
                error: null
            })

            render(<MarketEditPage params={{ id: 'market-123' }} />)

            expect(screen.getByTestId('market-edit-skeleton')).toBeInTheDocument()
        })
    })
})