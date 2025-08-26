"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  CalendarClock,
  Filter,
  X,
  ArrowLeft
} from "lucide-react"
import { Navigation } from "../components/navigation"
import { TopNavigation } from "../components/top-navigation"

import { MarketGrid } from "./discover/market-grid"
import { getAllMarkets, getTrendingMarketsWithMetadata, isSampleMarket } from "./create/market-service"
import { Market } from "@/lib/types/database"
import { useAuth } from "../auth/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"

function MarketsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const isMobile = useIsMobile()
  
  // State management
  const [markets, setMarkets] = useState<Market[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortOption, setSortOption] = useState<string>("trending")
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(true)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [dataSource, setDataSource] = useState<'mixed' | 'sample-only' | 'real-only'>('mixed')
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // Categories
  const categories = [
    "All",
    "Entertainment", 
    "Fashion",
    "Music",
    "Celebrity",
    "TV Shows",
    "Movies",
    "Social Media",
    "Sports",
    "Politics",
    "Technology"
  ]

  // Sort options
  const sortOptions = [
    { value: "trending", label: "Trending", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "newest", label: "Newest", icon: <Clock className="h-4 w-4" /> },
    { value: "ending-soon", label: "Ending Soon", icon: <CalendarClock className="h-4 w-4" /> },
    { value: "most-participants", label: "Most Popular", icon: <Users className="h-4 w-4" /> },
  ]

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category') || "All"
    const sort = searchParams.get('sort') || "trending"
    const search = searchParams.get('search') || ""
    
    setSelectedCategory(category)
    setSortOption(sort)
    setSearchQuery(search)
  }, [searchParams])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  // Load markets on component mount
  useEffect(() => {
    const loadMarkets = async () => {
      setIsLoadingMarkets(true)
      setLoadingError(null)
      
      try {
        console.log('Loading markets...')
        const allMarkets = await getAllMarkets()
        console.log(`Loaded ${allMarkets.length} markets`)
        
        // Determine data source for user feedback
        const sampleCount = allMarkets.filter(m => isSampleMarket(m)).length
        const realCount = allMarkets.length - sampleCount
        
        if (realCount > 0 && sampleCount > 0) {
          setDataSource('mixed')
        } else if (sampleCount > 0 && realCount === 0) {
          setDataSource('sample-only')
        } else if (realCount > 0 && sampleCount === 0) {
          setDataSource('real-only')
        }
        
        setMarkets(allMarkets)
        
        if (allMarkets.length === 0) {
          setLoadingError('No markets available at the moment')
        }
        
      } catch (error) {
        console.error("Failed to load markets:", error)
        setLoadingError('Failed to load markets. Please try again.')
        setMarkets([])
      } finally {
        setIsLoadingMarkets(false)
      }
    }

    if (isAuthenticated) {
      loadMarkets()
    }
  }, [isAuthenticated])

  // Filter and sort markets
  useEffect(() => {
    const applyFilters = async () => {
      let result = [...markets]

      // Filter by category
      if (selectedCategory !== "All") {
        result = result.filter(market => market.category === selectedCategory)
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        result = result.filter(market =>
          market.title.toLowerCase().includes(query) ||
          market.description.toLowerCase().includes(query)
        )
      }

      // Sort markets
      switch (sortOption) {
        case "trending":
          try {
            const trendingMarkets = await getTrendingMarketsWithMetadata(result.length)
            const trendingIds = trendingMarkets.map(m => m.id)
            result = result.sort((a, b) => {
              const aIndex = trendingIds.indexOf(a.id)
              const bIndex = trendingIds.indexOf(b.id)
              if (aIndex === -1 && bIndex === -1) return 0
              if (aIndex === -1) return 1
              if (bIndex === -1) return -1
              return aIndex - bIndex
            })
          } catch (error) {
            console.error("Failed to get trending data:", error)
          }
          break
        case "newest":
          result = result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
          break
        case "ending-soon":
          result = result.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
          break
        case "most-participants":
          result = result.sort((a, b) => b.participants - a.participants)
          break
        default:
          break
      }

      setFilteredMarkets(result)
    }

    if (markets.length > 0) {
      applyFilters()
    }
  }, [markets, selectedCategory, searchQuery, sortOption])

  // Update URL when filters change
  const updateURL = (category: string, sort: string, search: string) => {
    const params = new URLSearchParams()
    if (category !== "All") params.set('category', category)
    if (sort !== "trending") params.set('sort', sort)
    if (search) params.set('search', search)
    
    const newURL = params.toString() ? `/markets?${params.toString()}` : '/markets'
    router.replace(newURL, { scroll: false })
  }

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    updateURL(category, sortOption, searchQuery)
  }

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortOption(sort)
    updateURL(selectedCategory, sort, searchQuery)
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    updateURL(selectedCategory, sortOption, query)
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory("All")
    setSortOption("trending")
    setSearchQuery("")
    router.replace('/markets', { scroll: false })
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      
      {/* Desktop Top Navigation */}
      <TopNavigation />
      


      {/* Desktop Page Header */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Markets</h1>
            <p className="text-gray-600">Discover trending prediction markets and support your opinions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24 md:pb-8">
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search markets, categories, or topics..."
              className="pl-10 pr-10 py-6 rounded-full border-gray-200 focus:border-kai-300 focus:ring focus:ring-kai-200 focus:ring-opacity-50"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600"
                onClick={() => handleSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters Toggle (Mobile) */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sidebar Filters */}
          <div className={`lg:col-span-3 space-y-4 ${showFilters || !isMobile ? 'block' : 'hidden'}`}>
            
            {/* Categories */}
            <Card className="p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Categories</h2>
              <div className="space-y-1">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant="ghost"
                    className={`w-full justify-start text-gray-600 hover:text-kai-600 hover:bg-kai-50 ${
                      selectedCategory === category ? "bg-kai-100 text-kai-700 hover:bg-kai-100" : ""
                    }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Sort Options */}
            <Card className="p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Sort By</h2>
              <div className="space-y-1">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    className={`w-full justify-start text-gray-600 hover:text-kai-600 hover:bg-kai-50 ${
                      sortOption === option.value ? "bg-kai-100 text-kai-700 hover:bg-kai-100" : ""
                    }`}
                    onClick={() => handleSortChange(option.value)}
                  >
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Clear Filters */}
            {(selectedCategory !== "All" || sortOption !== "trending" || searchQuery) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            
            {/* Active Filters */}
            {(selectedCategory !== "All" || sortOption !== "trending" || searchQuery) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategory !== "All" && (
                  <Badge variant="secondary" className="bg-kai-100 text-kai-700">
                    Category: {selectedCategory}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => handleCategorySelect("All")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {sortOption !== "trending" && (
                  <Badge variant="secondary" className="bg-kai-100 text-kai-700">
                    Sort: {sortOptions.find(opt => opt.value === sortOption)?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => handleSortChange("trending")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="bg-kai-100 text-kai-700">
                    Search: "{searchQuery}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => handleSearch("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}

            {/* Results Count and Data Source Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <p className="text-gray-600">
                  {isLoadingMarkets ? "Loading..." : `${filteredMarkets.length} markets found`}
                </p>

                {!isLoadingMarkets && dataSource === 'mixed' && (
                  <p className="text-sm text-green-600 mt-1">
                    Showing real and sample markets
                  </p>
                )}
                {loadingError && (
                  <p className="text-sm text-red-600 mt-1">
                    {loadingError}
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Sorted by {sortOptions.find(opt => opt.value === sortOption)?.label}
              </div>
            </div>

            {/* Error State with Retry */}
            {loadingError && !isLoadingMarkets && filteredMarkets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <p className="text-lg font-medium mb-2">Unable to load markets</p>
                  <p className="text-sm">{loadingError}</p>
                </div>
                <Button
                  onClick={() => {
                    const loadMarkets = async () => {
                      setIsLoadingMarkets(true)
                      setLoadingError(null)
                      
                      try {
                        const allMarkets = await getAllMarkets()
                        setMarkets(allMarkets)
                        
                        // Update data source
                        const sampleCount = allMarkets.filter(m => isSampleMarket(m)).length
                        const realCount = allMarkets.length - sampleCount
                        
                        if (realCount > 0 && sampleCount > 0) {
                          setDataSource('mixed')
                        } else if (sampleCount > 0 && realCount === 0) {
                          setDataSource('sample-only')
                        } else if (realCount > 0 && sampleCount === 0) {
                          setDataSource('real-only')
                        }
                        
                        if (allMarkets.length === 0) {
                          setLoadingError('No markets available at the moment')
                        }
                      } catch (error) {
                        console.error("Failed to retry loading markets:", error)
                        setLoadingError('Failed to load markets. Please try again.')
                      } finally {
                        setIsLoadingMarkets(false)
                      }
                    }
                    loadMarkets()
                  }}
                  variant="outline"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Markets Grid */}
            {(!loadingError || filteredMarkets.length > 0) && (
              <MarketGrid 
                markets={filteredMarkets} 
                isLoading={isLoadingMarkets} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => router.push("/markets/create")}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-gradient-to-r from-kai-500 to-primary-600 hover:from-kai-600 hover:to-primary-700 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 z-40"
        aria-label="Create new market"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <Navigation />
    </div>
  )
}

export default function MarketsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
        </div>
      </div>
    }>
      <MarketsPageContent />
    </Suspense>
  )
}