import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './auth/auth-context'
import { OnboardingProvider } from './auth/onboarding-context'
import { Toaster } from '@/components/ui/toaster'
import { AdminLink } from './components/admin-link'

export const metadata: Metadata = {
  title: 'KAI Prediction Platform',
  description: 'Back your opinion on trending topics and cultural events',
  generator: 'KAI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <OnboardingProvider>
            {children}
            <AdminLink />
          </OnboardingProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}