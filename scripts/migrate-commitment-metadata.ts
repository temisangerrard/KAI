/**
 * Data Migration Script for Commitment Metadata
 * Adds metadata fields to existing PredictionCommitment documents
 */

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/db/database';
import { PredictionCommitment } from '../lib/types/token';
import { Market } from '../lib/types/database';

interface MigrationResult {
  totalCommitments: number;
  migratedCommitments: number;
  skippedCommitments: number;
  errors: Array<{
    commitmentId: string;
    error: string;
  }>;
}

interface LegacyCommitment {
  id: string;
  userId: string;
  predictionId: string;
  tokensCommitted: number;
  position: 'yes' | 'no';
  odds: number;
  potentialWinning: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  committedAt: Timestamp;
  resolvedAt?: Timestamp;
  // Missing metadata field
}

export class CommitmentMetadataMigration {
  private static readonly COLLECTIONS = {
    predictionCommitments: 'prediction_commitments',
    markets: 'markets',
    users: 'users',
  } as const;

  /**
   * Run the migration for all commitments
   */
  static async migrateAllCommitments(): Promise<MigrationResult> {
    console.log('Starting commitment metadata migration...');
    
    const result: MigrationResult = {
      totalCommitments: 0,
      migratedCommitments: 0,
      skippedCommitments: 0,
      errors: [],
    };

    try {
      // Get all commitments
      const commitmentsSnapshot = await getDocs(
        collection(db, this.COLLECTIONS.predictionCommitments)
      );

      result.totalCommitments = commitmentsSnapshot.size;
      console.log(`Found ${result.totalCommitments} commitments to process`);

      // Process in batches to avoid memory issues
      const batchSize = 50;
      const commitments = commitmentsSnapshot.docs;
      
      for (let i = 0; i < commitments.length; i += batchSize) {
        const batch = commitments.slice(i, i + batchSize);
        const batchResult = await this.migrateBatch(batch);
        
        result.migratedCommitments += batchResult.migratedCommitments;
        result.skippedCommitments += batchResult.skippedCommitments;
        result.errors.push(...batchResult.errors);
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commitments.length / batchSize)}`);
      }

      console.log('Migration completed!');
      console.log(`Total: ${result.totalCommitments}`);
      console.log(`Migrated: ${result.migratedCommitments}`);
      console.log(`Skipped: ${result.skippedCommitments}`);
      console.log(`Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a batch of commitments
   */
  private static async migrateBatch(
    commitmentDocs: any[]
  ): Promise<Pick<MigrationResult, 'migratedCommitments' | 'skippedCommitments' | 'errors'>> {
    const result = {
      migratedCommitments: 0,
      skippedCommitments: 0,
      errors: [] as MigrationResult['errors'],
    };

    const batch = writeBatch(db);
    let batchOperations = 0;

    for (const commitmentDoc of commitmentDocs) {
      try {
        const commitment = {
          id: commitmentDoc.id,
          ...commitmentDoc.data()
        } as LegacyCommitment;

        // Check if already has metadata
        if ('metadata' in commitmentDoc.data()) {
          result.skippedCommitments++;
          continue;
        }

        // Generate metadata for this commitment
        const metadata = await this.generateMetadataForCommitment(commitment);
        
        if (metadata) {
          // Add to batch update
          const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitment.id);
          batch.update(commitmentRef, { metadata });
          batchOperations++;
          result.migratedCommitments++;
        } else {
          result.skippedCommitments++;
        }

        // Execute batch if it's getting large
        if (batchOperations >= 450) { // Firestore batch limit is 500
          await batch.commit();
          batchOperations = 0;
        }
      } catch (error) {
        result.errors.push({
          commitmentId: commitmentDoc.id,
          error: String(error),
        });
      }
    }

    // Execute remaining batch operations
    if (batchOperations > 0) {
      await batch.commit();
    }

    return result;
  }

  /**
   * Generate metadata for a legacy commitment
   */
  private static async generateMetadataForCommitment(
    commitment: LegacyCommitment
  ): Promise<PredictionCommitment['metadata'] | null> {
    try {
      // Get market data
      const marketDoc = await getDoc(doc(db, this.COLLECTIONS.markets, commitment.predictionId));
      
      if (!marketDoc.exists()) {
        console.warn(`Market not found for commitment ${commitment.id}`);
        return null;
      }

      const market = marketDoc.data() as Market;

      // Generate best-effort metadata based on available data
      const metadata: PredictionCommitment['metadata'] = {
        // Market state (use current state as approximation)
        marketStatus: market.status,
        marketTitle: market.title,
        marketEndsAt: market.endsAt,
        
        // Odds snapshot (reconstruct from current market data)
        oddsSnapshot: {
          yesOdds: commitment.odds, // Use the odds stored in commitment
          noOdds: commitment.odds, // Approximate - we don't have historical data
          totalYesTokens: market.options.find(o => o.id === 'yes')?.totalTokens || 0,
          totalNoTokens: market.options.find(o => o.id === 'no')?.totalTokens || 0,
          totalParticipants: market.totalParticipants,
        },
        
        // Additional tracking data (defaults for legacy data)
        userBalanceAtCommitment: commitment.tokensCommitted, // Approximate
        commitmentSource: 'web', // Default assumption
        ipAddress: undefined, // Not available for legacy data
        userAgent: undefined, // Not available for legacy data
      };

      return metadata;
    } catch (error) {
      console.error(`Error generating metadata for commitment ${commitment.id}:`, error);
      return null;
    }
  }

  /**
   * Dry run to see what would be migrated
   */
  static async dryRun(): Promise<{
    totalCommitments: number;
    needsMigration: number;
    alreadyMigrated: number;
  }> {
    console.log('Running dry run for commitment metadata migration...');
    
    const commitmentsSnapshot = await getDocs(
      collection(db, this.COLLECTIONS.predictionCommitments)
    );

    let needsMigration = 0;
    let alreadyMigrated = 0;

    commitmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if ('metadata' in data) {
        alreadyMigrated++;
      } else {
        needsMigration++;
      }
    });

    const result = {
      totalCommitments: commitmentsSnapshot.size,
      needsMigration,
      alreadyMigrated,
    };

    console.log('Dry run results:');
    console.log(`Total commitments: ${result.totalCommitments}`);
    console.log(`Need migration: ${result.needsMigration}`);
    console.log(`Already migrated: ${result.alreadyMigrated}`);

    return result;
  }

  /**
   * Rollback migration (remove metadata fields)
   */
  static async rollback(): Promise<void> {
    console.log('Rolling back commitment metadata migration...');
    
    const commitmentsSnapshot = await getDocs(
      collection(db, this.COLLECTIONS.predictionCommitments)
    );

    const batch = writeBatch(db);
    let batchOperations = 0;

    for (const commitmentDoc of commitmentsSnapshot.docs) {
      const data = commitmentDoc.data();
      
      if ('metadata' in data) {
        const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitmentDoc.id);
        
        // Remove metadata field
        const { metadata, ...dataWithoutMetadata } = data;
        batch.set(commitmentRef, dataWithoutMetadata);
        batchOperations++;

        // Execute batch if it's getting large
        if (batchOperations >= 450) {
          await batch.commit();
          batchOperations = 0;
        }
      }
    }

    // Execute remaining batch operations
    if (batchOperations > 0) {
      await batch.commit();
    }

    console.log('Rollback completed!');
  }
}

// CLI interface for running the migration
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'dry-run':
      CommitmentMetadataMigration.dryRun()
        .then(result => {
          console.log('Dry run completed:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Dry run failed:', error);
          process.exit(1);
        });
      break;
      
    case 'migrate':
      CommitmentMetadataMigration.migrateAllCommitments()
        .then(result => {
          console.log('Migration completed:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      CommitmentMetadataMigration.rollback()
        .then(() => {
          console.log('Rollback completed');
          process.exit(0);
        })
        .catch(error => {
          console.error('Rollback failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: npm run migrate-commitments [dry-run|migrate|rollback]');
      process.exit(1);
  }
}