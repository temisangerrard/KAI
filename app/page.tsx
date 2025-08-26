"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "./auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, TrendingUp, Users, ArrowRight, Star, Shield, Zap, Target, Award } from "lucide-react"
import { LoginForm } from "./auth/login-form"
import { RegisterForm } from "./auth/register-form"
import { PasswordResetForm } from "./auth/password-reset-form"
import { FeaturedMarketsSection } from "./components/featured-markets-section"

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login")

  // Don't auto-redirect authenticated users - let them visit landing page

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

  // Show landing page for both authenticated and unauthenticated users

  const features = [
    {
      icon: <Target className="h-8 w-8" />,
      title: "Back Your Opinion",
      description: "Use tokens to support your predictions on trending topics and cultural events.",
      color: "from-kai-500 to-kai-600",
      bgColor: "bg-kai-50"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Discover Trends",
      description: "Explore AI-identified trending topics and make informed predictions.",
      color: "from-kai-500 to-kai-600",
      bgColor: "bg-kai-50"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Connect with Others",
      description: "Engage with a community that shares your interests and perspectives.",
      color: "from-gold-500 to-gold-600",
      bgColor: "bg-gold-50"
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Earn Rewards",
      description: "Win tokens for accurate predictions and climb the leaderboards.",
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50"
    }
  ]

  const stats = [
    { number: "10K+", label: "Active Users", icon: <Users className="w-5 h-5" /> },
    { number: "50K+", label: "Predictions Made", icon: <Target className="w-5 h-5" /> },
    { number: "2.5M", label: "Tokens Distributed", icon: <Sparkles className="w-5 h-5" /> },
    { number: "95%", label: "User Satisfaction", icon: <Star className="w-5 h-5" /> }
  ]
  return (
    <div className="min-h-screen bg-gradient-to-br from-kai-50 via-cream-50 to-gold-50">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
              KAI
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  className="text-gray-700 hover:text-kai-600"
                  onClick={() => router.push("/profile")}
                >
                  Profile
                </Button>
                <Button
                  className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-kai-100 to-gold-100 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-kai-600" />
                <span className="text-sm font-medium text-kai-700">Join 10,000+ predictors worldwide</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                  Predict Trends.
                </span>
                <br />
                <span className="bg-gradient-to-r from-kai-500 to-kai-600 text-transparent bg-clip-text">
                  Share Opinions.
                </span>
                <br />
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text">
                  Win Tokens.
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                KAI is the social prediction platform where your opinions matter. Back your predictions on trending topics, 
                connect with like-minded people, and earn rewards for your insights.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <>
                  <Button
                    className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white text-lg py-6 px-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-kai-300 text-kai-700 hover:bg-kai-50 hover:border-kai-400 text-lg py-6 px-8 hover:shadow-lg transition-all duration-300"
                    onClick={() => router.push("/markets/create")}
                  >
                    Create Market
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white text-lg py-6 px-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    onClick={() => {
                      setAuthMode("register")
                      setShowAuthModal(true)
                    }}
                  >
                    Start Predicting Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-kai-300 text-kai-700 hover:bg-kai-50 hover:border-kai-400 text-lg py-6 px-8 hover:shadow-lg transition-all duration-300"
                    onClick={() => {
                      setAuthMode("login")
                      setShowAuthModal(true)
                    }}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Secure & Safe</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold-500" />
                <span className="text-sm text-gray-600">Instant Rewards</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-kai-500" />
                <span className="text-sm text-gray-600">Active Community</span>
              </div>
            </div>
          </div>

          {/* Enhanced Hero Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-kai-200/20 to-gold-200/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Mock App Interface */}
              <div className="h-16 bg-gradient-to-r from-kai-600 to-gold-600 flex items-center justify-between px-6">
                <div className="text-white font-bold text-xl">KAI</div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">2,500</span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Mock Prediction Card */}
                <div className="bg-gradient-to-r from-kai-50 to-gold-50 rounded-xl p-4 border border-kai-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-kai-600">TRENDING</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Who will win BBNaija All Stars?</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mercy</span>
                      <span className="text-sm font-medium text-kai-600">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-kai-500 to-kai-600 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                </div>

                {/* Mock Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">1,247</div>
                    <div className="text-xs text-green-600">Participants</div>
                  </div>
                  <div className="bg-gold-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gold-600">27.9K</div>
                    <div className="text-xs text-gold-600">Tokens</div>
                  </div>
                  <div className="bg-kai-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-kai-600">98</div>
                    <div className="text-xs text-kai-600">Vibe Score</div>
                  </div>
                </div>

                {/* Mock Action Button */}
                <button className="w-full bg-gradient-to-r from-kai-500 to-gold-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-shadow">
                  Support Your Opinion ✨
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-kai-100 to-gold-100 rounded-xl mb-4">
                <div className="text-kai-600">{stat.icon}</div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
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
            <Card key={index} className="p-8 border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-gradient-to-r ${feature.color} ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-r from-kai-50 to-gold-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Join thousands of users who are already enjoying KAI
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
        <div className="relative overflow-hidden bg-gradient-to-r from-kai-600 via-kai-500 to-gold-600 rounded-3xl p-8 md:p-16 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-30 translate-y-30"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          </div>
          
          <div className="relative md:flex items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to join KAI?</h2>
              <p className="text-white text-opacity-90 text-xl leading-relaxed mb-6">
                Get started today and receive <span className="font-bold">2,500 free tokens</span> to begin your prediction journey!
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white/80">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">100% Free to Start</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm">Instant Setup</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {isAuthenticated ? (
                <Button
                  className="bg-white text-kai-700 hover:bg-kai-50 hover:text-kai-800 text-lg py-6 px-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  className="bg-white text-kai-700 hover:bg-kai-50 hover:text-kai-800 text-lg py-6 px-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => {
                    setAuthMode("register")
                    setShowAuthModal(true)
                  }}
                >
                  Create Your Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <p className="text-white/70 text-sm text-center">No credit card required</p>
            </div>
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
                  onForgotPasswordClick={() => setAuthMode("reset")}
                />
              ) : authMode === "register" ? (
                <RegisterForm
                  onSuccess={handleAuthSuccess}
                  onLoginClick={() => setAuthMode("login")}
                />
              ) : (
                <PasswordResetForm
                  onBackToLogin={() => setAuthMode("login")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}