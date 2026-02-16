import { FiltersMetadata } from './FiltersCategoryInterface';

/**
 * Get the display name for a bundle
 * @param bundleValue - The bundle identifier
 * @param options - Configuration options
 * @returns The display name or null if not found and fallback disabled
 */
export const getBundleDisplayName = (
  bundleValue: string,
  options: { allowFallback?: boolean } = { allowFallback: true }
): string | null => {
  const fullName = FiltersMetadata[bundleValue];

  if (fullName) {
    // Extract abbreviated name by taking the part before parentheses
    return fullName.split(' (')[0];
  }

  // Return fallback if allowed, otherwise null
  if (options.allowFallback) {
    return bundleValue.charAt(0).toUpperCase() + bundleValue.slice(1);
  }

  return null;
};
