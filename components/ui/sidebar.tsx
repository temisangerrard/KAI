"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useBreakpoint } from "@/hooks/use-mobile"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  position?: "left" | "right"
  collapsible?: boolean
  defaultCollapsed?: boolean
  width?: {
    expanded: string
    collapsed?: string
  }
  showOnMobile?: boolean
}

/**
 * A responsive sidebar component that can be collapsed and expanded
 */
export function Sidebar({
  children,
  position = "left",
  collapsible = true,
  defaultCollapsed = false,
  width = { expanded: "w-64", collapsed: "w-16" },
  showOnMobile = false,
  className,
  ...props
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const breakpoint = useBreakpoint()
  
  // Hide sidebar on mobile unless explicitly shown
  const isMobile = ["xs", "sm"].includes(breakpoint)
  if (isMobile && !showOnMobile) {
    return null
  }

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-white border-gray-200 transition-all duration-300",
        position === "left" ? "border-r" : "border-l",
        collapsed ? width.collapsed : width.expanded,
        className
      )}
      {...props}
    >
      {children}
      
      {collapsible && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute top-4 bg-white rounded-full p-1 shadow-md border border-gray-200",
            position === "left" 
              ? "left-[calc(100%-0.75rem)]" 
              : "right-[calc(100%-0.75rem)]"
          )}
        >
          {position === "left" ? (
            collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
          ) : (
            collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
          )}
        </button>
      )}
    </div>
  )
}

interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export function SidebarSection({
  title,
  collapsible = false,
  defaultCollapsed = false,
  children,
  className,
  ...props
}: SidebarSectionProps) {
  const [sectionCollapsed, setSectionCollapsed] = useState(defaultCollapsed)

  return (
    <div className={cn("py-2 px-3", className)} {...props}>
      {title && (
        <div 
          className={cn(
            "flex items-center justify-between mb-2 text-sm font-medium text-gray-500",
            collapsible && "cursor-pointer"
          )}
          onClick={() => collapsible && setSectionCollapsed(!sectionCollapsed)}
        >
          <span>{title}</span>
          {collapsible && (
            <ChevronRight 
              size={16} 
              className={cn(
                "transition-transform",
                !sectionCollapsed && "transform rotate-90"
              )} 
            />
          )}
        </div>
      )}
      {(!collapsible || !sectionCollapsed) && (
        <div className="space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}