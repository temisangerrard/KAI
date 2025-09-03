import { NextRequest, NextResponse } from 'next/server'
import { WalletUidMappingService } from '@/lib/services/wallet-uid-mapping'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for orphaned CDP users')
    
    // Find orphaned mappings
    const orphanedMappings = await WalletUidMappingService.findOrphanedMappings()
    
    // Get all mappings for comparison
    const allMappings = await WalletUidMappingService.getAllMappings()
    
    console.log(`Found ${orphanedMappings.length} orphaned out of ${allMappings.length} total mappings`)
    
    return NextResponse.json({
      success: true,
      totalMappings: allMappings.length,
      orphanedMappings: orphanedMappings.length,
      orphanedUsers: orphanedMappings.map(mapping => ({
        walletAddress: mapping.walletAddress,
        email: mapping.email,
        firebaseUid: mapping.firebaseUid,
        createdAt: mapping.createdAt
      }))
    })
    
  } catch (error) {
    console.error('❌ Failed to check orphaned users:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check orphaned users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}