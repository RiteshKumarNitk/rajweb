/**
 * Client-safe shape of the State → District choices offered on registration
 * and membership forms. Loaded server-side by getRegistrationLocations().
 */
export interface RegistrationLocation {
  /** State slug — what forms submit as `state`. */
  slug: string;
  name: string;
  districts: string[];
}

/** The state a form should start on: the record's current state, or the only one. */
export function defaultStateSlug(locations: RegistrationLocation[], current?: string | null): string {
  if (current && locations.some((l) => l.slug === current)) return current;
  return locations.length === 1 ? locations[0].slug : "";
}

export function districtsForState(locations: RegistrationLocation[], stateSlug: string | undefined): string[] {
  return locations.find((l) => l.slug === stateSlug)?.districts ?? [];
}
