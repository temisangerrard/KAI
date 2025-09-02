"use client";

/**
 * CDP Providers Component for KAI Platform
 * 
 * This component wraps the application with Coinbase CDP providers,
 * enabling smart wallet functionality throughout the app.
 */

import { CDPReactProvider } from "@coinbase/cdp-react/components/CDPReactProvider";
import { CDP_CONFIG, APP_CONFIG } from "@/lib/cdp-config";
import { kaiCDPTheme } from "@/lib/cdp-theme";

interface CDPProvidersProps {
  children: React.ReactNode;
}

/**
 * CDP Providers wrapper component
 * Provides CDP context and theming to all child components
 */
export function CDPProviders({ children }: CDPProvidersProps) {
  return (
    <CDPReactProvider 
      config={CDP_CONFIG} 
      app={APP_CONFIG} 
      theme={kaiCDPTheme}
    >
      {children}
    </CDPReactProvider>
  );
}