"use client"

import { HamburgerMenu } from "./hamburger-menu"
import { useHamburgerMenu } from "@/hooks/use-hamburger-menu"

export function HamburgerMenuDemo() {
  const { isOpen, toggle, close } = useHamburgerMenu()

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Hamburger Menu Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-lg font-semibold mb-4">Test the Menu</h2>
          <p className="text-gray-600 mb-4">
            Click the hamburger menu button to test:
          </p>
          <ul className="text-sm text-gray-500 space-y-1 mb-6">
            <li>• Smooth slide-in animation</li>
            <li>• Click outside to close</li>
            <li>• Press ESC to close</li>
            <li>• Keyboard navigation support</li>
            <li>• Touch-friendly interactions</li>
          </ul>
          
          <div className="flex justify-center">
            <HamburgerMenu 
              isOpen={isOpen}
              onToggle={toggle}
              onClose={close}
            />
          </div>
        </div>
      </div>
    </div>
  )
}