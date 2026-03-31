import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Card } from "@cobalt-web/ui/components/card";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
} from "@cobalt-web/ui/components/ui/map";

function hasLocationFields(
  loc: TransactionListItem["location"]
): loc is NonNullable<TransactionListItem["location"]> {
  if (!loc || typeof loc !== "object") {
    return false;
  }
  const l = loc as Record<string, unknown>;
  return !!(
    (typeof l.address === "string" && l.address.trim()) ||
    (typeof l.city === "string" && l.city.trim()) ||
    (typeof l.region === "string" && l.region.trim()) ||
    (typeof l.postal_code === "string" && l.postal_code.trim()) ||
    (typeof l.country === "string" && l.country.trim()) ||
    (typeof l.store_number === "string" && l.store_number.trim())
  );
}

/** Plaid `location.lat` / `location.lon` when present (WGS84). */
function getLocationCoordinates(
  loc: TransactionListItem["location"]
): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== "object") {
    return null;
  }
  const l = loc as { lat?: unknown; lon?: unknown };
  if (typeof l.lat !== "number" || typeof l.lon !== "number") {
    return null;
  }
  if (!Number.isFinite(l.lat) || !Number.isFinite(l.lon)) {
    return null;
  }
  if (l.lat < -90 || l.lat > 90 || l.lon < -180 || l.lon > 180) {
    return null;
  }
  return { lat: l.lat, lng: l.lon };
}

export function shouldShowLocationSection(
  loc: TransactionListItem["location"]
): boolean {
  return getLocationCoordinates(loc) !== null || hasLocationFields(loc);
}

function formatLocation(
  location: NonNullable<TransactionListItem["location"]>
): string {
  const l = location as Record<string, string | null | undefined>;
  const line2 = [l.city, l.region, l.postal_code, l.country]
    .filter(Boolean)
    .join(", ");
  const parts = [l.address, line2].filter(Boolean);
  let s = parts.join(", ");
  if (l.store_number?.trim()) {
    const store = `Store ${l.store_number.trim()}`;
    s = s ? `${s} · ${store}` : store;
  }
  return s;
}

function LocationCaption({
  coords,
  location,
}: {
  coords: { lat: number; lng: number } | null;
  location: TransactionListItem["location"];
}) {
  if (location && hasLocationFields(location)) {
    return (
      <p className="text-foreground text-sm leading-relaxed">
        {formatLocation(location)}
      </p>
    );
  }
  if (coords) {
    return (
      <p className="text-muted-foreground text-xs tabular-nums">
        {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
      </p>
    );
  }
  return null;
}

export function TransactionDetailLocationSection({
  location,
}: {
  location: TransactionListItem["location"];
}) {
  const coords = getLocationCoordinates(location);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-foreground text-sm">Location</h2>
      {coords ? (
        <Card className="overflow-hidden p-0">
          <div className="relative h-56 w-full sm:h-72">
            <Map center={[coords.lng, coords.lat]} zoom={14}>
              <MapControls position="bottom-right" />
              <MapMarker latitude={coords.lat} longitude={coords.lng}>
                <MarkerContent />
              </MapMarker>
            </Map>
          </div>
        </Card>
      ) : null}
      <LocationCaption coords={coords} location={location} />
    </section>
  );
}
