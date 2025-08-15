"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketCategoryNavProps {
  categories: string[]
  selectedCategory: string
  onCategorySelect: (category: string) => void
}

export function MarketCategoryNav({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: MarketCategoryNavProps) {
  const [showAllCategories, setShowAllCategories] = useState(false)
  
  // Show only first 5 categories initially on mobile
  const visibleCategories = showAllCategories 
    ? categories 
    : categories.slice(0, 5)

  return (
    <Card className="p-4 shadow-sm">
      <h2 className="font-semibold text-gray-800 mb-3">Categories</h2>
      
      <div className="space-y-1">
        {visibleCategories.map((category) => (
          <Button
            key={category}
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 hover:text-primary-600 hover:bg-kai-50",
              selectedCategory === category && "bg-kai-100 text-kai-700 hover:bg-kai-100"
            )}
            onClick={() => onCategorySelect(category)}
          >
            {category}
          </Button>
        ))}
        
        {/* Show more/less button on mobile */}
        {categories.length > 5 && (
          <Button
            variant="ghost"
            className="w-full justify-center text-sm text-gray-500 md:hidden"
            onClick={() => setShowAllCategories(!showAllCategories)}
          >
            {showAllCategories ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show More ({categories.length - 5})
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}