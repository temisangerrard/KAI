/**
 * Coinbase CDP Configuration for KAI Platform
 * 
 * This file contains the configuration for Coinbase's CDP (Coinbase Developer Platform)
 * integration, including smart account settings and KAI-specific branding.
 */

import { type Config } from "@coinbase/cdp-hooks";
import { type AppConfig } from "@coinbase/cdp-react/components/CDPReactProvider";

/**
 * CDP Core Configuration
 * Uses smart accounts for gasless transactions and improved UX
 */
export const CDP_CONFIG: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "",
  createAccountOnLogin: "evm-smart", // Smart accounts for gasless transactions
};

/**
 * KAI App Configuration for CDP
 * Customizes the CDP UI with KAI branding and settings
 */
export const APP_CONFIG: AppConfig = {
  name: "KAI Prediction Platform",
  logoUrl: "/placeholder-logo.svg", // Using existing KAI logo
  authMethods: ["email"], // Email-only authentication as per requirements
};