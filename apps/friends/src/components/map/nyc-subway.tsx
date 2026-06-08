import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { Source, Layer, useControl } from "react-map-gl/maplibre";
import { NYC_SUBWAY_URL, SUBWAY_LINE_COLOR_EXPR } from "./constants";

export function NycSubwayLines() {
  return (
    <Source id="nyc-subway" type="geojson" data={NYC_SUBWAY_URL}>
      <Layer
        id="nyc-subway-line"
        type="line"
        paint={{
          "line-color": SUBWAY_LINE_COLOR_EXPR,
          "line-opacity": 0.85,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3, 18, 6],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}

export function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
