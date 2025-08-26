"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { designSystem } from "@/lib/design-system-consolidated"

const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
}

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  maxWidth?: keyof typeof containerWidths | "full" | "none"
  centered?: boolean
  gutter?: boolean | number
  fluid?: boolean
}

/**
 * A responsive container component that adapts to different screen sizes
 * 
 * @param as - The HTML element to render as (default: div)
 * @param maxWidth - Maximum width of the container (sm, md, lg, xl, 2xl, full, none)
 * @param centered - Whether to center the container horizontally
 * @param gutter - Whether to add horizontal padding (true = default padding, number = custom padding)
 * @param fluid - Whether the container should be fluid (100% width at all breakpoints)
 * @param className - Additional CSS classes
 * @param children - Child elements
 */
export function ResponsiveContainer({
  as: Component = "div",
  maxWidth = "2xl",
  centered = true,
  gutter = true,
  fluid = false,
  className,
  children,
  ...props
}: ResponsiveContainerProps) {
  return (
    <Component
      className={cn(
        // Base styles
        "w-full",
        
        // Max width based on prop
        maxWidth !== "full" && maxWidth !== "none" && !fluid && `max-w-${maxWidth}`,
        
        // Centered
        centered && "mx-auto",
        
        // Gutter padding
        gutter === true && "px-4 sm:px-6 lg:px-8",
        typeof gutter === "number" && `px-${gutter}`,
        
        // Additional classes
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}