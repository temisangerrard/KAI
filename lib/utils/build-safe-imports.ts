/**
 * Utility for safely importing services during build time
 * Prevents Firebase initialization errors during Next.js build process
 */

export function isBuildTime(): boolean {
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.RUNTIME;
}

export function createBuildSafeResponse(message: string = 'Service unavailable during build') {
  return {
    error: message,
    buildTime: true,
    timestamp: new Date().toISOString()
  };
}

export async function safeImport<T>(importFn: () => Promise<T>): Promise<T | null> {
  if (isBuildTime()) {
    return null;
  }
  
  try {
    return await importFn();
  } catch (error) {
    console.warn('Safe import failed:', error);
    return null;
  }
}