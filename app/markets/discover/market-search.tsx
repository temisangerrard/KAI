"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { getAllMarkets } from "../create/market-service"
import { Market } from "@/lib/types/database"

interface MarketSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function MarketSearch({ searchQuery, onSearchChange }: MarketSearchProps) {
  const [query, setQuery] = useState(searchQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allMarkets, setAllMarkets] = useState<Market[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load all markets for suggestions
  useEffect(() => {
    const loadMarkets = async () => {
      const markets = await getAllMarkets()
      setAllMarkets(markets)
    }
    loadMarkets()
  }, [])

  // Update suggestions when query changes
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const lowerQuery = query.toLowerCase()
    const titleSuggestions = allMarkets
      .filter(market => market.title.toLowerCase().includes(lowerQuery))
      .map(market => market.title)
    
    // Add category suggestions
    const categorySuggestions = Array.from(new Set(
      allMarkets
        .filter(market => market.category.toLowerCase().includes(lowerQuery))
        .map(market => market.category)
    ))

    // Combine and deduplicate suggestions
    const combinedSuggestions = Array.from(new Set([...titleSuggestions, ...categorySuggestions]))
      .slice(0, 5) // Limit to 5 suggestions
    
    setSuggestions(combinedSuggestions)
  }, [query, allMarkets])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowSuggestions(value.trim().length >= 2)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    onSearchChange(suggestion)
    setShowSuggestions(false)
  }

  // Handle search submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(query)
    setShowSuggestions(false)
  }

  // Clear search
  const handleClearSearch = () => {
    setQuery("")
    onSearchChange("")
    setShowSuggestions(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for markets, categories, or topics..."
            className="pl-10 pr-10 py-6 rounded-full border-gray-200 focus:border-primary-300 focus:ring focus:ring-kai-200 focus:ring-opacity-50"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(query.trim().length >= 2)}
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </form>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full text-left px-4 py-2 hover:bg-kai-50 focus:bg-kai-50 focus:outline-none"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <span>{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}