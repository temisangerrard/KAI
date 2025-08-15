"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "./auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, TrendingUp, Users, MessageCircle, ArrowRight } from "lucide-react"
import { LoginForm } from "./auth/login-form"
import { RegisterForm } from "./auth/register-form"
import { FeaturedMarketsSection } from "./components/featured-markets-section"

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    router.push("/dashboard")
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (isAuthenticated) {
    return null
  }

  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-kai-500" />,
      title: "Back Your Opinion",
      description: "Use tokens to support your predictions on trending topics and cultural events."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-kai-600" />,
      title: "Discover Trends",
      description: "Explore AI-identified trending topics and make informed predictions."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-500" />,
      title: "Connect with Others",
      description: "Engage with a community that shares your interests and perspectives."
    },
    {
      icon: <MessageCircle className="h-8 w-8 text-blue-500" />,
      title: "Share Insights",
      description: "Comment on predictions and share your thoughts with friends."
    }
  ]
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
              KAI
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-gray-700 hover:text-kai-600"
              onClick={() => {
                setAuthMode("login")
                setShowAuthModal(true)
              }}
            >
              Sign In
            </Button>
            <Button
              className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white"
              onClick={() => {
                setAuthMode("register")
                setShowAuthModal(true)
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                Predict Trends.
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">
                Share Opinions.
              </span>
              <br />
              Win Tokens.
            </h1>
            <p className="text-lg text-gray-600">
              KAI is a fun prediction platform where you can back your opinions on trending topics,
              cultural events, and social phenomena. Join a community of like-minded individuals and
              turn your insights into rewards!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white text-lg py-6 px-8 shadow-lg"
                onClick={() => {
                  setAuthMode("register")
                  setShowAuthModal(true)
                }}
              >
                Join KAI Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="border-kai-300 text-kai-700 hover:bg-kai-50 hover:border-kai-400 text-lg py-6 px-8"
                onClick={() => {
                  setAuthMode("login")
                  setShowAuthModal(true)
                }}
              >
                Sign In
              </Button>
            </div>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-kai-200/30 to-gold-200/30 backdrop-blur-sm z-10 rounded-2xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] h-[80%] bg-white rounded-xl shadow-lg overflow-hidden transform rotate-3">
                <div className="h-12 bg-gradient-to-r from-kai-600 to-gold-600 flex items-center px-4">
                  <div className="text-white font-bold">KAI</div>
                </div>
                <div className="p-4">
                  <div className="h-4 w-3/4 bg-gray-200 rounded-full mb-3"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded-full mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-8 bg-gray-100 rounded-lg"></div>
                    <div className="h-8 bg-gray-100 rounded-lg"></div>
                    <div className="h-8 bg-gray-100 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-10 right-10 w-[60%] h-[60%] bg-white rounded-xl shadow-lg overflow-hidden transform -rotate-6 z-20">
              <div className="h-10 bg-gradient-to-r from-purple-400 to-blue-400 flex items-center px-4">
                <div className="text-white font-bold text-sm">Trending Predictions</div>
              </div>
              <div className="p-3">
                <div className="h-3 w-3/4 bg-gray-200 rounded-full mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded-full mb-4"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-100 rounded-lg"></div>
                  <div className="h-6 bg-gray-100 rounded-lg"></div>
                  <div className="h-6 bg-gray-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Markets Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <FeaturedMarketsSection />
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How KAI Works</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Join a community that's reimagining prediction markets as a fun, social experience
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 border-0 shadow-lg bg-white hover:shadow-xl transition-shadow">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-r from-cream-100 to-kai-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Join thousands of women who are already enjoying KAI
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "KAI makes predicting trends so much fun! I love how it feels like social media, not gambling.",
                name: "Amara J.",
                role: "Fashion Enthusiast"
              },
              {
                quote: "I've always enjoyed reality TV, and now I can make predictions with my friends in a fun way!",
                name: "Zainab K.",
                role: "Media Professional"
              },
              {
                quote: "The platform is so intuitive and engaging. I'm addicted to checking the trending topics!",
                name: "Chioma O.",
                role: "Content Creator"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="p-6 border-0 shadow-lg bg-white">
                <div className="mb-4 text-kai-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.626.41-2.03.315-.4.74-.6 1.276-.6.45 0 .847.15 1.2.45.352.3.608.682.766 1.15.157.468.284.87.384 1.2.1.33.15.56.15.7 0 .11-.02.21-.05.3-.03.09-.08.18-.15.27-.07.09-.18.18-.33.27-.15.09-.38.18-.7.28v1.29c.398-.28.765-.55 1.1-.82.333-.27.602-.51.806-.74.205-.23.35-.46.45-.7.1-.24.15-.5.15-.78 0-.69-.23-1.345-.69-1.957-.46-.612-1.11-1.103-1.95-1.47-.84-.37-1.81-.55-2.91-.55-1.19 0-2.22.22-3.1.66-.877.44-1.54 1.06-1.99 1.83-.45.77-.67 1.65-.67 2.63 0 .98.226 1.83.68 2.55.45.72 1.06 1.28 1.83 1.68.77.4 1.648.6 2.63.6 1.01 0 1.98-.21 2.93-.63.95-.42 1.83-1.04 2.63-1.85l-1.73-1.4c-.553.57-1.102 1.04-1.65 1.42-.55.38-1.084.67-1.607.87v-1.57z" />
                    <path d="M23.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.626.41-2.03.315-.4.74-.6 1.276-.6.45 0 .847.15 1.2.45.352.3.608.682.766 1.15.157.468.284.87.384 1.2.1.33.15.56.15.7 0 .11-.02.21-.05.3-.03.09-.08.18-.15.27-.07.09-.18.18-.33.27-.15.09-.38.18-.7.28v1.29c.398-.28.765-.55 1.1-.82.333-.27.602-.51.806-.74.205-.23.35-.46.45-.7.1-.24.15-.5.15-.78 0-.69-.23-1.345-.69-1.957-.46-.612-1.11-1.103-1.95-1.47-.84-.37-1.81-.55-2.91-.55-1.19 0-2.22.22-3.1.66-.877.44-1.54 1.06-1.99 1.83-.45.77-.67 1.65-.67 2.63 0 .98.226 1.83.68 2.55.45.72 1.06 1.28 1.83 1.68.77.4 1.648.6 2.63.6 1.01 0 1.98-.21 2.93-.63.95-.42 1.83-1.04 2.63-1.85l-1.73-1.4c-.553.57-1.102 1.04-1.65 1.42-.55.38-1.084.67-1.607.87v-1.57z" />
                  </svg>
                </div>
                <p className="text-gray-700 mb-6 italic">{testimonial.quote}</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="bg-gradient-to-r from-kai-600 to-gold-600 rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="md:flex items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to join KAI?</h2>
              <p className="text-white text-opacity-90 text-lg">
                Get started today and receive 2,500 tokens to begin your prediction journey!
              </p>
            </div>
            <Button
              className="bg-white text-kai-700 hover:bg-kai-50 hover:text-kai-800 text-lg py-6 px-8 shadow-lg border border-kai-200"
              onClick={() => {
                setAuthMode("register")
                setShowAuthModal(true)
              }}
            >
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                KAI
              </div>
              <p className="text-gray-500 mt-2">Support your opinion ✨</p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <h3 className="font-semibold mb-3">Platform</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-500 hover:text-kai-600">How it works</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-600">Features</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-600">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Company</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">About</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">Blog</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">Careers</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">Privacy</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">Terms</Link></li>
                  <li><Link href="#" className="text-gray-500 hover:text-kai-500">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500">
            <p>© {new Date().getFullYear()} KAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                onClick={() => setShowAuthModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {authMode === "login" ? (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onRegisterClick={() => setAuthMode("register")}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleAuthSuccess}
                  onLoginClick={() => setAuthMode("login")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}