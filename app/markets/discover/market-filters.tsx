"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { 
  TrendingUp, 
  Clock, 
  Users, 
  CalendarClock,
  SlidersHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface MarketFiltersProps {
  sortOption: string
  onSortChange: (option: string) => void
}

export function MarketFilters({ 
  sortOption, 
  onSortChange 
}: MarketFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tokenRange, setTokenRange] = useState([0, 10000])
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  // Sort options with icons
  const sortOptions = [
    { value: "trending", label: "Trending", icon: <TrendingUp className="h-4 w-4 mr-2" /> },
    { value: "newest", label: "Newest", icon: <Clock className="h-4 w-4 mr-2" /> },
    { value: "ending-soon", label: "Ending Soon", icon: <CalendarClock className="h-4 w-4 mr-2" /> },
    { value: "most-participants", label: "Most Popular", icon: <Users className="h-4 w-4 mr-2" /> },
  ]

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Sort & Filter</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0 h-8 w-8 rounded-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="sr-only">Toggle filters</span>
        </Button>
      </div>

      {/* Sort options - always visible */}
      <div className="mb-4">
        <RadioGroup 
          value={sortOption} 
          onValueChange={onSortChange}
          className="space-y-1"
        >
          {sortOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={option.value} 
                id={`sort-${option.value}`}
                className="text-kai-500"
              />
              <Label 
                htmlFor={`sort-${option.value}`}
                className="flex items-center text-sm cursor-pointer"
              >
                {option.icon}
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Additional filters - collapsible on mobile */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:block">
        <CollapsibleTrigger asChild className="md:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-sm justify-center mb-2"
          >
            {isOpen ? "Hide Filters" : "Show More Filters"}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 md:space-y-6">
          {/* Token range filter */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Token Range: {tokenRange[0]} - {tokenRange[1]}
            </Label>
            <Slider
              defaultValue={tokenRange}
              min={0}
              max={10000}
              step={100}
              onValueChange={(value) => setTokenRange(value as number[])}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>10,000+</span>
            </div>
          </div>
          
          {/* Active markets only toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="active-only" className="text-sm font-medium">
              Show active markets only
            </Label>
            <Switch
              id="active-only"
              checked={showActiveOnly}
              onCheckedChange={setShowActiveOnly}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}