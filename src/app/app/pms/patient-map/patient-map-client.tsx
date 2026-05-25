"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PatientMapPoint } from "@/lib/pms-patient-map-repository";

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
        Marker: new (options: Record<string, unknown>) => GoogleMarker;
        InfoWindow: new (options?: Record<string, unknown>) => GoogleInfoWindow;
        LatLngBounds: new () => GoogleLatLngBounds;
        LatLng: new (lat: number, lng: number) => unknown;
        Size: new (width: number, height: number) => unknown;
        visualization?: {
          HeatmapLayer: new (options: Record<string, unknown>) => GoogleHeatmapLayer;
        };
      };
    };
  }
}

type GoogleMap = {
  fitBounds: (bounds: GoogleLatLngBounds) => void;
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};
type GoogleMarker = {
  addListener: (eventName: string, callback: () => void) => void;
  setMap: (map: GoogleMap | null) => void;
};
type GoogleInfoWindow = {
  open: (map: GoogleMap, marker: GoogleMarker) => void;
};
type GoogleLatLngBounds = {
  extend: (position: { lat: number; lng: number }) => void;
};
type GoogleHeatmapLayer = {
  setMap: (map: GoogleMap | null) => void;
};

let googleMapsLoader: Promise<void> | null = null;

export function PatientMapClient({ apiKey, points, mode }: { apiKey: string; points: PatientMapPoint[]; mode: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const heatmapRef = useRef<GoogleHeatmapLayer | null>(null);
  const [status, setStatus] = useState(apiKey ? "Loading Google Maps..." : "Google Maps API key is not configured.");
  const center = useMemo(() => getCenter(points), [points]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    let disposed = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (disposed || !mapRef.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: points.length ? 10 : 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        heatmapRef.current?.setMap(null);
        heatmapRef.current = null;
        const bounds = new window.google.maps.LatLngBounds();
        const infoWindow = new window.google.maps.InfoWindow();

        if (mode === "heatmap" && window.google.maps.visualization?.HeatmapLayer) {
          heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: points.map((point) => ({
              location: new window.google!.maps.LatLng(point.latitude, point.longitude),
              weight: Math.max(1, point.patientCount + point.opportunityScore / 10),
            })),
            map,
            radius: 32,
            opacity: 0.72,
          });
        }

        for (const point of points) {
          const position = { lat: point.latitude, lng: point.longitude };
          if (mode === "heatmap") {
            bounds.extend(position);
            continue;
          }
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: `${point.patientCount} patient${point.patientCount === 1 ? "" : "s"} · ${point.city ?? "Unknown"}`,
            icon: {
              path: "M 0 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
              fillColor: markerColor(point),
              fillOpacity: 0.9,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: markerScale(point),
            },
          });
          marker.addListener("click", () => {
            infoWindowContent(infoWindow, point);
            infoWindow.open(map, marker);
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        }

        if (points.length > 1) map.fitBounds(bounds);
        if (points.length === 1) {
          map.setCenter(center);
          map.setZoom(12);
        }
        setStatus(points.length ? `${points.length} mapped household clusters` : "No mapped patients match the current filters.");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load Google Maps."));

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      heatmapRef.current?.setMap(null);
      heatmapRef.current = null;
    };
  }, [apiKey, center, mode, points]);

  return (
    <div className="min-w-0">
      <div className="relative h-[620px] min-h-[420px] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100" ref={mapRef}>
        {!apiKey ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-lg font-semibold text-neutral-950">Google Maps is not configured</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">Add the Maps JavaScript and Geocoding-enabled API key to production as <code className="rounded bg-white px-1 py-0.5">GOOGLE_MAPS_API_KEY</code>.</p>
            </div>
          </div>
        ) : null}
        {apiKey && !points.length ? (
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-lg border border-amber-200 bg-white/95 p-4 shadow-lg shadow-neutral-950/10">
            <p className="text-sm font-semibold text-neutral-950">No patient households match the current filters</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">The map is loaded, but the selected filters returned zero plotted patients. Clear filters or widen the service, payer, provider, age, referral, or value criteria.</p>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-semibold text-neutral-500">{status}</p>
    </div>
  );
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-1dentalai-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")));
      return;
    }
    const script = document.createElement("script");
    script.dataset["1dentalaiGoogleMaps"] = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=visualization`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}

function infoWindowContent(infoWindow: GoogleInfoWindow, point: PatientMapPoint) {
  const services = point.serviceLines.slice(0, 5).join(", ") || "No service history";
  const payers = point.payerNames.slice(0, 4).join(", ") || "No payer on file";
  const patients = point.samplePatients.join(", ");
  (infoWindow as unknown as { setContent: (content: string) => void }).setContent(`
    <div style="max-width:320px;font-family:Inter,Arial,sans-serif;color:#111827">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0e7490">${escapeHtml(point.city ?? "Unknown city")}${point.state ? `, ${escapeHtml(point.state)}` : ""}</div>
      <div style="margin-top:4px;font-size:18px;font-weight:800">${point.patientCount} patient${point.patientCount === 1 ? "" : "s"}</div>
      <div style="margin-top:8px;font-size:13px;line-height:1.45;color:#4b5563">${escapeHtml(patients || point.label)}</div>
      <div style="margin-top:10px;font-size:12px;line-height:1.45"><strong>Services:</strong> ${escapeHtml(services)}</div>
      <div style="margin-top:4px;font-size:12px;line-height:1.45"><strong>Insurance:</strong> ${escapeHtml(payers)}</div>
      <div style="margin-top:8px;font-size:12px;color:#111827"><strong>${money(point.productionCents)}</strong> completed/scheduled · <strong>${money(point.treatmentCents)}</strong> treatment</div>
      <div style="margin-top:4px;font-size:12px;color:#111827">${point.highValuePatientCount} high-value · ${point.membershipSignalCount} membership signal</div>
    </div>
  `);
}

function markerColor(point: PatientMapPoint) {
  if (point.highValuePatientCount > 0) return "#be123c";
  if (point.membershipSignalCount > 0) return "#047857";
  if (point.treatmentCents > 0) return "#7c3aed";
  return "#0891b2";
}

function markerScale(point: PatientMapPoint) {
  return Math.min(2.2, 0.8 + Math.log2(point.patientCount + 1) * 0.28 + Math.min(0.7, point.productionCents / 500000));
}

function getCenter(points: PatientMapPoint[]) {
  if (!points.length) return { lat: 39.7392, lng: -104.9903 };
  return {
    lat: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char] ?? char);
}
