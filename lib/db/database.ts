import { Market } from "@/app/auth/auth-context"

// Simple in-memory store for markets.
// In a real application this would connect to an actual database.
let markets: Market[] = []

export function getAllMarkets(): Market[] {
  return markets
}

export function getMarketById(id: string): Market | null {
  return markets.find(market => market.id === id) || null
}

export function addMarket(market: Market): Market {
  markets.push(market)
  return market
}
