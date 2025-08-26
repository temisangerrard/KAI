"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MarketDiscoveryHeader } from "./market-discovery-header"
import { MarketFilters } from "./market-filters"
import { Navigation } from "../../components/navigation"
import { MarketGrid } from "./market-grid"
import { MarketSearch } from "./market-search"
import { MarketCategoryNav } from "./market-category-nav"
import { getAllMarkets, getTrendingMarketsWithMetadata } from "../create/market-service"
import { Market } from "@/lib/types/database"
import { useAuth } from "@/app/auth/auth-context"

export default function MarketDiscoveryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [markets, setMarkets] = useState<Market[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortOption, setSortOption] = useState<string>("trending")
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Mock categories based on the requirements
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

  // Load markets on component mount
  useEffect(() => {
    const loadMarkets = async () => {
      setIsLoading(true)
      try {
        const allMarkets = await getAllMarkets()
        setMarkets(allMarkets)
        setFilteredMarkets(allMarkets)
      } catch (error) {
        console.error("Failed to load markets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMarkets()
  }, [])

  // Filter markets when category, search query, or sort option changes
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

    applyFilters()
  }, [markets, selectedCategory, searchQuery, sortOption])

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
  }

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  // Handle sort option change
  const handleSortChange = (option: string) => {
    setSortOption(option)
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 lg:py-12">
        <MarketDiscoveryHeader />
        
        <div className="mb-6">
          <MarketSearch 
            searchQuery={searchQuery} 
            onSearchChange={handleSearchChange} 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <MarketCategoryNav 
              categories={categories} 
              selectedCategory={selectedCategory} 
              onCategorySelect={handleCategorySelect} 
            />
            
            <div className="mt-6">
              <MarketFilters 
                sortOption={sortOption} 
                onSortChange={handleSortChange} 
              />
            </div>
          </div>
          
          <div className="lg:col-span-9">
            <MarketGrid 
              markets={filteredMarkets} 
              isLoading={isLoading} 
            />
          </div>
        </div>
      </div>
      
      <Navigation />
    </div>
  )
}