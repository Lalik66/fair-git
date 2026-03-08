/**
 * Route types for "Route to Friend" feature
 * These types define the structure for navigation routes and directions
 */

/**
 * A single step in the route instructions
 */
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
  };
}

/**
 * Active route being displayed on the map
 */
export interface ActiveRoute {
  friendId: string;
  friendName: string;
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  distance: number;
  duration: number;
}

/**
 * Cached route with metadata for cache invalidation
 */
export interface CachedRoute {
  route: ActiveRoute;
  timestamp: number;
  userPosition: [number, number];
}

/**
 * Response from the Mapbox Directions API
 */
export interface DirectionsResponse {
  routes: Array<{
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
    legs: Array<{
      steps: Array<{
        maneuver: {
          type: string;
          modifier?: string;
          instruction?: string;
        };
        distance: number;
        duration: number;
        name?: string;
      }>;
    }>;
  }>;
  code: string;
  message?: string;
}
