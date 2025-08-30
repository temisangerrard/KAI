/**
 * User Service for CDP Integration
 * 
 * This service handles user operations using wallet addresses as primary identifiers
 * instead of Firebase UIDs. It provides CRUD operations for user profiles stored
 * in Firestore with wallet addresses as document keys.
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/db/database";

export interface UserProfile {
  address: string;           // Wallet address (document ID)
  email: string;            // User email from CDP
  displayName?: string;     // Optional display name
  avatarUrl?: string;       // Profile avatar
  createdAt: Date;          // Account creation date
  lastLoginAt: Date;        // Last login timestamp
  
  // KAI-specific data
  tokens: {
    available: number;
    committed: number;
    totalEarned: number;
    totalSpent: number;
  };
  
  // User statistics
  stats: {
    totalPredictions: number;
    correctPredictions: number;
    winRate: number;
    totalTokensWon: number;
    totalTokensLost: number;
  };
  
  // User preferences
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export class UserService {
  /**
   * Get user profile by wallet address
   * @param address - Wallet address to look up
   * @returns User profile or null if not found
   */
  static async getUserByAddress(address: string): Promise<UserProfile | null> {
    try {
      if (!address) {
        throw new Error("Wallet address is required");
      }

      // Validate address format (basic Ethereum address validation)
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Invalid wallet address format");
      }

      const userRef = doc(db, 'users', address);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      
      // Transform Firestore data to UserProfile
      return {
        address: userDoc.id,
        email: data.email || '',
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        tokens: {
          available: data.tokens?.available || 0,
          committed: data.tokens?.committed || 0,
          totalEarned: data.tokens?.totalEarned || 0,
          totalSpent: data.tokens?.totalSpent || 0,
        },
        stats: {
          totalPredictions: data.stats?.totalPredictions || 0,
          correctPredictions: data.stats?.correctPredictions || 0,
          winRate: data.stats?.winRate || 0,
          totalTokensWon: data.stats?.totalTokensWon || 0,
          totalTokensLost: data.stats?.totalTokensLost || 0,
        },
        preferences: {
          notifications: data.preferences?.notifications ?? true,
          emailUpdates: data.preferences?.emailUpdates ?? true,
          theme: data.preferences?.theme || 'auto',
        },
      };
    } catch (error) {
      console.error('Error fetching user by address:', error);
      throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create new user profile with wallet address as key
   * @param address - Wallet address
   * @param email - User email
   * @param additionalData - Optional additional user data
   * @returns Created user profile
   */
  static async createUser(
    address: string, 
    email: string, 
    additionalData?: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      if (!address || !email) {
        throw new Error("Wallet address and email are required");
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Invalid wallet address format");
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
      }

      // Check if user already exists
      const existingUser = await this.getUserByAddress(address);
      if (existingUser) {
        throw new Error("User with this wallet address already exists");
      }

      const now = new Date();
      const userProfile: UserProfile = {
        address,
        email,
        displayName: additionalData?.displayName,
        avatarUrl: additionalData?.avatarUrl,
        createdAt: now,
        lastLoginAt: now,
        tokens: {
          available: 100, // Starting tokens for new users
          committed: 0,
          totalEarned: 0,
          totalSpent: 0,
          ...additionalData?.tokens,
        },
        stats: {
          totalPredictions: 0,
          correctPredictions: 0,
          winRate: 0,
          totalTokensWon: 0,
          totalTokensLost: 0,
          ...additionalData?.stats,
        },
        preferences: {
          notifications: true,
          emailUpdates: true,
          theme: 'auto',
          ...additionalData?.preferences,
        },
      };

      // Store user profile with wallet address as document ID
      const userRef = doc(db, 'users', address);
      await setDoc(userRef, {
        ...userProfile,
        createdAt: Timestamp.fromDate(userProfile.createdAt),
        lastLoginAt: Timestamp.fromDate(userProfile.lastLoginAt),
      });

      return userProfile;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user profile using wallet address
   * @param address - Wallet address
   * @param updates - Partial user data to update
   * @returns Updated user profile
   */
  static async updateUser(address: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!address) {
        throw new Error("Wallet address is required");
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Invalid wallet address format");
      }

      // Check if user exists
      const existingUser = await this.getUserByAddress(address);
      if (!existingUser) {
        throw new Error("User not found");
      }

      // Prepare update data
      const updateData: any = {};
      
      if (updates.email) updateData.email = updates.email;
      if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
      if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
      if (updates.lastLoginAt) updateData.lastLoginAt = Timestamp.fromDate(updates.lastLoginAt);
      
      if (updates.tokens) {
        updateData.tokens = { ...existingUser.tokens, ...updates.tokens };
      }
      
      if (updates.stats) {
        updateData.stats = { ...existingUser.stats, ...updates.stats };
      }
      
      if (updates.preferences) {
        updateData.preferences = { ...existingUser.preferences, ...updates.preferences };
      }

      // Update user document
      const userRef = doc(db, 'users', address);
      await updateDoc(userRef, updateData);

      // Return updated user profile
      const updatedUser = await this.getUserByAddress(address);
      if (!updatedUser) {
        throw new Error("Failed to retrieve updated user profile");
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user's last login timestamp
   * @param address - Wallet address
   */
  static async updateLastLogin(address: string): Promise<void> {
    try {
      await this.updateUser(address, { lastLoginAt: new Date() });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error for login timestamp updates to avoid blocking user flow
    }
  }

  /**
   * Get user by email (for migration purposes)
   * @param email - User email
   * @returns User profile or null if not found
   */
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      if (!email) {
        throw new Error("Email is required");
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // Return the first matching user
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();

      return {
        address: userDoc.id,
        email: data.email || '',
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        tokens: {
          available: data.tokens?.available || 0,
          committed: data.tokens?.committed || 0,
          totalEarned: data.tokens?.totalEarned || 0,
          totalSpent: data.tokens?.totalSpent || 0,
        },
        stats: {
          totalPredictions: data.stats?.totalPredictions || 0,
          correctPredictions: data.stats?.correctPredictions || 0,
          winRate: data.stats?.winRate || 0,
          totalTokensWon: data.stats?.totalTokensWon || 0,
          totalTokensLost: data.stats?.totalTokensLost || 0,
        },
        preferences: {
          notifications: data.preferences?.notifications ?? true,
          emailUpdates: data.preferences?.emailUpdates ?? true,
          theme: data.preferences?.theme || 'auto',
        },
      };
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error(`Failed to fetch user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user exists by wallet address
   * @param address - Wallet address
   * @returns True if user exists, false otherwise
   */
  static async userExists(address: string): Promise<boolean> {
    try {
      const user = await this.getUserByAddress(address);
      return user !== null;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  /**
   * Get or create user (useful for authentication flows)
   * @param address - Wallet address
   * @param email - User email
   * @returns User profile (existing or newly created)
   */
  static async getOrCreateUser(address: string, email: string): Promise<UserProfile> {
    try {
      // Try to get existing user
      const existingUser = await this.getUserByAddress(address);
      
      if (existingUser) {
        // Update last login timestamp
        await this.updateLastLogin(address);
        return existingUser;
      }

      // Create new user if doesn't exist
      return await this.createUser(address, email);
    } catch (error) {
      console.error('Error getting or creating user:', error);
      throw new Error(`Failed to get or create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}