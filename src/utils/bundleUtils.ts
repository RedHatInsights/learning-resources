import { FiltersMetadata } from './FiltersCategoryInterface';

export interface GetBundleDisplayNameOptions {
  allowFallback?: boolean;
  /** When provided, used as display name when no FiltersMetadata mapping exists (e.g. chrome bundle title). */
  fallbackTitle?: string;
}

/**
 * Get the display name for a bundle
 * @param bundleValue - The bundle identifier
 * @param options - Configuration options
 * @returns The display name or null if not found and fallback disabled
 */
export const getBundleDisplayName = (
  bundleValue: string,
  options: GetBundleDisplayNameOptions = { allowFallback: true }
): string | null => {
  const fullName = FiltersMetadata[bundleValue];

  if (fullName) {
    // Extract abbreviated name by taking the part before parentheses
    return fullName.split(' (')[0];
  }

  if (options.fallbackTitle) {
    return options.fallbackTitle;
  }

  // Return fallback if allowed, otherwise null
  if (options.allowFallback) {
    return bundleValue.charAt(0).toUpperCase() + bundleValue.slice(1);
  }

  return null;
};
