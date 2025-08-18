import fs from 'fs/promises'
import path from 'path'
import { Market } from '@/app/auth/auth-context'

interface Database {
  markets: Market[]
}

const DB_PATH = path.join(process.cwd(), 'lib/db/data.json')

async function readDatabase(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8')
    return JSON.parse(data) as Database
  } catch {
    return { markets: [] }
  }
}

async function writeDatabase(db: Database): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

export async function getAllMarkets(): Promise<Market[]> {
  const db = await readDatabase()
  return db.markets
}

export async function getMarketById(id: string): Promise<Market | null> {
  const db = await readDatabase()
  return db.markets.find(m => m.id === id) || null
}

export async function createMarketRecord(market: Market): Promise<Market> {
  const db = await readDatabase()
  db.markets.push(market)
  await writeDatabase(db)
  return market
}

export async function updateMarket(id: string, update: Partial<Market>): Promise<Market | null> {
  const db = await readDatabase()
  const index = db.markets.findIndex(m => m.id === id)
  if (index === -1) {
    return null
  }
  db.markets[index] = { ...db.markets[index], ...update }
  await writeDatabase(db)
  return db.markets[index]
}
