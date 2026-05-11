/**
 * Google Maps Distance Matrix API integration for calculating drive time between locations
 */

import { cache } from "react";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const CACHE_DURATION = 60 * 60 * 24; // 24 hours

// In-memory cache for distance results
interface CachedDistance {
  distance: number; // meters
  duration: number; // seconds
  timestamp: number;
}

const distanceCache = new Map<string, CachedDistance>();

function getCacheKey(origin: string, destination: string): string {
  return `${origin}|${destination}`;
}

function isCacheValid(entry: CachedDistance): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION * 1000;
}

/**
 * Get distance and duration between two locations using Google Maps Distance Matrix API
 * Results are cached for 24 hours
 */
export async function getDistance(
  origin: string,
  destination: string
): Promise<{ distanceMeters: number; durationSeconds: number }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const cacheKey = getCacheKey(origin, destination);

  // Check cache
  const cached = distanceCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return {
      distanceMeters: cached.distance,
      durationSeconds: cached.duration,
    };
  }

  // Fetch from Google Maps API
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    key: GOOGLE_MAPS_API_KEY,
    mode: "driving",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
    { next: { revalidate: CACHE_DURATION } }
  );

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Maps API error: ${data.status} - ${data.error_message}`);
  }

  if (!data.rows?.[0]?.elements?.[0]) {
    throw new Error("Invalid response from Google Maps API");
  }

  const element = data.rows[0].elements[0];

  if (element.status !== "OK") {
    throw new Error(`Cannot calculate distance: ${element.status}`);
  }

  const distanceMeters = element.distance.value;
  const durationSeconds = element.duration.value;

  // Store in cache
  distanceCache.set(cacheKey, {
    distance: distanceMeters,
    duration: durationSeconds,
    timestamp: Date.now(),
  });

  return { distanceMeters, durationSeconds };
}

/**
 * Get multiple distances in a single API call using Distance Matrix API batch
 */
export async function getDistanceMatrix(
  origins: string[],
  destinations: string[]
): Promise<{ [key: string]: { distanceMeters: number; durationSeconds: number } }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  // Limit to 25 per API constraints
  if (origins.length > 25 || destinations.length > 25) {
    throw new Error("Maximum 25 origins and 25 destinations per request");
  }

  const params = new URLSearchParams({
    origins: origins.join("|"),
    destinations: destinations.join("|"),
    key: GOOGLE_MAPS_API_KEY,
    mode: "driving",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
    { next: { revalidate: CACHE_DURATION } }
  );

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const result: { [key: string]: { distanceMeters: number; durationSeconds: number } } = {};

  data.rows?.forEach((row: any, originIdx: number) => {
    row.elements?.forEach((element: any, destIdx: number) => {
      if (element.status === "OK") {
        const key = `${originIdx}-${destIdx}`;
        result[key] = {
          distanceMeters: element.distance.value,
          durationSeconds: element.duration.value,
        };
      }
    });
  });

  return result;
}

/**
 * Convert drive time from seconds to minutes (rounded up)
 */
export function secondsToMinutes(seconds: number): number {
  return Math.ceil(seconds / 60);
}

/**
 * Estimate drive time between two addresses in minutes
 * This is a helper for quick estimates; use getDistance for precise calculations
 */
export function estimateDriveTimeByDistance(distanceMeters: number): number {
  // Average driving speed: 50 km/h (approximately 0.83 km/minute)
  const averageSpeedKmPerMinute = 0.83;
  const distanceKm = distanceMeters / 1000;
  return Math.ceil(distanceKm / averageSpeedKmPerMinute);
}
