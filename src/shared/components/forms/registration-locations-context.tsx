"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { rajasthanDistricts } from "@/shared/config/site";
import {
  defaultStateSlug,
  districtsForState,
  type RegistrationLocation,
} from "@/modules/districts/registration-locations";

const LocationsContext = createContext<RegistrationLocation[] | null>(null);

/** Server pages/layouts pass getRegistrationLocations() down to their forms through this. */
export function RegistrationLocationsProvider({
  locations,
  children,
}: {
  locations: RegistrationLocation[];
  children: ReactNode;
}) {
  return <LocationsContext.Provider value={locations}>{children}</LocationsContext.Provider>;
}

/**
 * State/District choices for registration & membership forms.
 *
 * - One active state: `multiState` is false — forms show no State picker and
 *   submit that state's slug automatically (identical to the old UX).
 * - Several states: forms show a State picker and filter districts by it.
 * - No data (database down / static release): falls back to the static
 *   district list with an empty state, which the server resolves only when
 *   the district name is unambiguous.
 */
export function useRegistrationLocations() {
  const provided = useContext(LocationsContext);
  const locations = useMemo<RegistrationLocation[]>(
    () => (provided && provided.length > 0 ? provided : [{ slug: "", name: "", districts: [...rajasthanDistricts] }]),
    [provided]
  );

  return {
    locations,
    multiState: locations.length > 1,
    /** Starting state: the one containing the record's current district, or the only state. */
    initialState(currentDistrict?: string | null): string {
      const owning = currentDistrict
        ? locations.filter((l) => l.districts.some((d) => d.toLowerCase() === currentDistrict.toLowerCase()))
        : [];
      return defaultStateSlug(locations, owning.length === 1 ? owning[0].slug : null);
    },
    districtsFor(stateSlug: string | undefined): string[] {
      return districtsForState(locations, locations.length === 1 ? locations[0].slug : stateSlug);
    },
  };
}
