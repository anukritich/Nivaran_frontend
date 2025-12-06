"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_STYLE: React.CSSProperties = { width: "100%", height: "70vh", borderRadius: 8, overflow: "hidden" };

// small helper: distance (meters) between two lat/lng using Haversine
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const aHarv = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  return R * c;
}

export default function TrackingPage() {
  const search = useSearchParams();
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);

  // Query params
  const caseId = search?.get("case_id") || "";
  const destLatParam = search?.get("lat");
  const destLngParam = search?.get("lng");
  const ngoLatParam = search?.get("ngo_lat");
  const ngoLngParam = search?.get("ngo_lng");

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    ngoLatParam && ngoLngParam ? { lat: parseFloat(ngoLatParam), lng: parseFloat(ngoLngParam) } : null
  );
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(
    destLatParam && destLngParam ? { lat: parseFloat(destLatParam), lng: parseFloat(destLngParam) } : null
  );

  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceText?: string; durationText?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closingCase, setClosingCase] = useState(false);

  // live tracking state
  const watchIdRef = useRef<number | null>(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRouteTimestampRef = useRef<number>(0);

  // Load Google Maps script dynamically
  useEffect(() => {
    if (!destination) {
      setError("Destination coordinates are missing. Open this page with ?lat=<lat>&lng=<lng>.");
      return;
    }

    if (typeof window !== "undefined" && (window as any).google && (window as any).google.maps) {
      setMapReady(true);
      return;
    }

    if (!GOOGLE_KEY) {
      setError("Google Maps API key is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
      return;
    }

    const id = "google-maps-script";
    if (document.getElementById(id)) {
      const t = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(t);
          setMapReady(true);
        }
      }, 200);
      return () => clearInterval(t);
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setError("Failed to load Google Maps script.");
    document.head.appendChild(script);

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  // helper to compute route from a given origin
  const computeRouteFrom = async (usedOrigin: { lat: number; lng: number }) => {
    const g = (window as any).google;
    if (!g || !g.maps) {
      setError("Google Maps is not available.");
      return;
    }
    if (!directionsServiceRef.current) directionsServiceRef.current = new g.maps.DirectionsService();
    if (!directionsRendererRef.current) directionsRendererRef.current = new g.maps.DirectionsRenderer({ map: googleMapRef.current });

    setLoading(true);
    directionsServiceRef.current.route(
      {
        origin: new g.maps.LatLng(usedOrigin.lat, usedOrigin.lng),
        destination: new g.maps.LatLng(destination!.lat, destination!.lng),
        travelMode: g.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
        provideRouteAlternatives: false,
      },
      (result: any, status: string) => {
        setLoading(false);
        if (status === "OK") {
          directionsRendererRef.current.setDirections(result);
          try {
            const leg = result.routes[0].legs[0];
            setRouteInfo({ distanceText: leg.distance?.text, durationText: leg.duration?.text });
          } catch (e) {
            setRouteInfo(null);
          }
        } else {
          console.error("Directions request failed:", status, result);
          setError(`Could not compute route: ${status}`);
        }
      }
    );
  };

  // Initialize map and optionally compute initial route
  useEffect(() => {
    if (!mapReady || !destination) return;

    let cancelled = false;

    const initialize = async () => {
      // If origin is missing, try to get it once (not watching)
      if (!origin) {
        if ("geolocation" in navigator) {
          try {
            setLoading(true);
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
            );
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setOrigin(coords);
            lastPositionRef.current = coords;
            setLoading(false);
          } catch (e) {
            setLoading(false);
            // leave origin null — Tracking UI will prompt user if they want
          }
        }
      }

      const g = (window as any).google;
      if (!g || !g.maps) {
        setError("Google Maps is not available.");
        return;
      }

      // Setup map centered between origin and destination
      const bounds = new g.maps.LatLngBounds();
      if (origin) bounds.extend(new g.maps.LatLng(origin.lat, origin.lng));
      bounds.extend(new g.maps.LatLng(destination.lat, destination.lng));

      if (!googleMapRef.current && mapRef.current) {
        googleMapRef.current = new g.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 13,
        });
      }

      googleMapRef.current.fitBounds(bounds, 80);

      // create directions renderer & service
      if (!directionsRendererRef.current) directionsRendererRef.current = new g.maps.DirectionsRenderer({ map: googleMapRef.current });
      if (!directionsServiceRef.current) directionsServiceRef.current = new g.maps.DirectionsService();

      // create current position marker (if missing)
      if (!currentMarkerRef.current && origin) {
        currentMarkerRef.current = new g.maps.Marker({
          position: new g.maps.LatLng(origin.lat, origin.lng),
          map: googleMapRef.current,
          title: "You (approx.)",
        });
      }

      // If we have origin now, compute route
      if (origin) {
        await computeRouteFrom(origin);
      } else {
        // no origin yet: show a marker only for destination
        const destMarker = new g.maps.Marker({
          position: new g.maps.LatLng(destination.lat, destination.lng),
          map: googleMapRef.current,
          title: "Destination",
        });
        // keep dest marker if needed (no need to cleanup here; it's fine)
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, destination, origin]);

  // Live tracking: watchPosition start/stop and handler
  useEffect(() => {
    if (!liveTracking) {
      // stop watcher if any
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not available in this browser.");
      setLiveTracking(false);
      return;
    }

    // start watching
    const success = (pos: GeolocationPosition) => {
      const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const prev = lastPositionRef.current;
      const now = Date.now();

      // update last position
      lastPositionRef.current = newPos;
      setOrigin(newPos); // update state so UI shows it

      // update marker
      const g = (window as any).google;
      if (g && g.maps) {
        if (!currentMarkerRef.current) {
          currentMarkerRef.current = new g.maps.Marker({
            position: new g.maps.LatLng(newPos.lat, newPos.lng),
            map: googleMapRef.current,
            title: "You (live)",
          });
        } else {
          currentMarkerRef.current.setPosition(new g.maps.LatLng(newPos.lat, newPos.lng));
        }
      }

      // decide whether to recompute route:
      // recompute if moved > 20 meters OR if it's been > 10s since last route
      const moved = prev ? haversineMeters(prev, newPos) : Infinity;
      const sinceLastRoute = now - (lastRouteTimestampRef.current || 0);
      if (moved > 20 || sinceLastRoute > 10000) {
        lastRouteTimestampRef.current = now;
        if (directionsServiceRef.current && googleMapRef.current) {
          computeRouteFrom(newPos).catch((e) => {
            console.warn("compute route error", e);
          });
        }
      }
    };

    const fail = (err: any) => {
      console.warn("watchPosition error", err);
      toast.error("Unable to get live position (permission denied or unavailable).");
      setLiveTracking(false);
    };

    const id = navigator.geolocation.watchPosition(success, fail, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    });
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [liveTracking]);

  const openInGoogleMaps = () => {
    if (!origin || !destination) {
      toast.error("Missing origin or destination coordinates");
      return;
    }
    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = `${destination.lat},${destination.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(
      destStr
    )}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleCloseCase = async () => {
    if (!caseId) {
      toast.error("No case ID provided");
      return;
    }

    try {
      setClosingCase(true);
      const response = await fetch(`http://127.0.0.1:3000/ngo-cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to close case");
      }

      toast.success("Case marked as completed!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Error closing case:", err);
      toast.error("Failed to close case. Please try again.");
    } finally {
      setClosingCase(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Button onClick={handleBack} variant="outline">
          Back
        </Button>
        <h2 style={{ margin: 0 }}>Track route to rescue {caseId ? ` (Case ${caseId})` : ""}</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div>
          <Card>
            <CardContent>
              <div ref={mapRef} style={MAP_STYLE} />
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <Button onClick={() => setLiveTracking((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Navigation />
                  {liveTracking ? "Stop live tracking" : "Start live tracking"}
                </Button>

                <Button onClick={openInGoogleMaps} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Navigation /> Open in Google Maps
                </Button>
              </div>

              {loading && <p style={{ marginTop: 8 }}>Computing best route…</p>}
              {error && (
                <p style={{ marginTop: 8, color: "crimson" }}>
                  <strong>Error:</strong> {error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent>
              <h3 style={{ marginTop: 0 }}>Route info</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <MapPin />
                <div>
                  <div style={{ fontSize: 13, color: "#666" }}>Origin (NGO)</div>
                  <div style={{ fontWeight: 600, color: "#000" }}>{origin ? `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}` : "Unknown"}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <MapPin />
                <div>
                  <div style={{ fontSize: 13, color: "#666" }}>Destination (Case)</div>
                  <div style={{ fontWeight: 600, color: "#000" }}>{destination ? `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}` : "Unknown"}</div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: "#666" }}>Estimated distance</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#000" }}>{routeInfo?.distanceText || "—"}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "#666" }}>Estimated travel time</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#000" }}>{routeInfo?.durationText || "—"}</div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Button
                  onClick={handleCloseCase}
                  disabled={closingCase || !caseId}
                  variant="destructive"
                  style={{ width: "100%" }}
                >
                  {closingCase ? "Closing Case..." : "Close Case"}
                </Button>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, color: "#333" }}>
                  Tips:
                  <ul>
                    <li>Use Start live tracking to keep the map and route updating inside this app as the volunteer moves.</li>
                    <li>If you prefer to use the Google Maps app for navigation, open it with "Open in Google Maps" — but note the web app cannot track the volunteer while they use the external app.</li>
                    <li>Live tracking uses high-accuracy GPS; it may consume battery and requires location permission.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// "use client";
// import React, { useEffect, useRef, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { MapPin, Navigation, ExternalLink } from "lucide-react";
// import { toast } from "sonner";

// /**
//  * Tracking page
//  *
//  * - Expects query params:
//  *    case_id (optional) — used only to show case id
//  *    lat, lng (destination coordinates) OR the page will try to fetch case details (not implemented)
//  *    ngo_lat, ngo_lng (origin coordinates) OR the page will prompt for NGO location
//  *
//  * - Uses Google Maps JavaScript API DirectionsService/DirectionsRenderer to compute & render the fastest route.
//  * - Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set in your frontend environment (.env.local).
//  * - If the Maps API cannot be loaded or fails, a fallback button opens Google Maps directions in a new tab.
//  *
//  * How to call from Dashboard:
//  *  - When user clicks Take Action, navigate to:
//  *      /tracking?case_id=<id>&lat=<case_lat>&lng=<case_lng>&ngo_lat=<ngo_lat>&ngo_lng=<ngo_lng>
//  *
//  * Example:
//  *  router.push(`/tracking?case_id=${case.case_id}&lat=${case.latitude}&lng=${case.longitude}&ngo_lat=${ngoLat}&ngo_lng=${ngoLng}`);
//  *
//  * Notes:
//  *  - This is a client page (maps needs window).
//  *  - You can improve UX by obtaining the NGO location from the authenticated profile instead of passing coords.
//  */

// const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// const MAP_STYLE: React.CSSProperties = { width: "100%", height: "70vh", borderRadius: 8, overflow: "hidden" };

// export default function TrackingPage() {
//   const search = useSearchParams();
//   const router = useRouter();
//   const mapRef = useRef<HTMLDivElement | null>(null);
//   const googleMapRef = useRef<any>(null);
//   const directionsRendererRef = useRef<any>(null);

//   // Query params
//   const caseId = search?.get("case_id") || "";
//   const destLatParam = search?.get("lat");
//   const destLngParam = search?.get("lng");
//   const ngoLatParam = search?.get("ngo_lat");
//   const ngoLngParam = search?.get("ngo_lng");

//   const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
//     ngoLatParam && ngoLngParam ? { lat: parseFloat(ngoLatParam), lng: parseFloat(ngoLngParam) } : null
//   );
//   const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(
//     destLatParam && destLngParam ? { lat: parseFloat(destLatParam), lng: parseFloat(destLngParam) } : null
//   );

//   const [loading, setLoading] = useState(false);
//   const [mapReady, setMapReady] = useState(false);
//   const [routeInfo, setRouteInfo] = useState<{ distanceText?: string; durationText?: string } | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // Load Google Maps script dynamically
//   useEffect(() => {
//     if (!destination) {
//       setError("Destination coordinates are missing. Open this page with ?lat=<lat>&lng=<lng>.");
//       return;
//     }

//     // if script already loaded
//     if (typeof window !== "undefined" && (window as any).google && (window as any).google.maps) {
//       setMapReady(true);
//       return;
//     }

//     if (!GOOGLE_KEY) {
//       setError("Google Maps API key is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
//       return;
//     }

//     const id = "google-maps-script";
//     if (document.getElementById(id)) {
//       // script exists but google may not be ready yet - wait a bit
//       const t = setInterval(() => {
//         if ((window as any).google && (window as any).google.maps) {
//           clearInterval(t);
//           setMapReady(true);
//         }
//       }, 200);
//       return () => clearInterval(t);
//     }

//     const script = document.createElement("script");
//     script.id = id;
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
//     script.async = true;
//     script.defer = true;
//     script.onload = () => setMapReady(true);
//     script.onerror = () => setError("Failed to load Google Maps script.");
//     document.head.appendChild(script);

//     return () => {
//       // do not remove the script; leave cached
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [destination]);

//   // Initialize map and compute route when mapReady, origin, destination are present
//   useEffect(() => {
//     if (!mapReady || !destination) return;

//     // If origin is missing, try to get from browser geolocation as a convenience
//     const ensureOrigin = async () => {
//       if (!origin) {
//         // try browser geolocation
//         if ("geolocation" in navigator) {
//           try {
//             setLoading(true);
//             const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
//               navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
//             );
//             const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
//             setOrigin(coords);
//             setLoading(false);
//             return coords;
//           } catch (e) {
//             setLoading(false);
//             // if geolocation fails, prompt user
//             const manual = window.prompt("Enter your NGO coordinates as lat,lng (e.g. 12.9716,77.5946)");
//             if (manual) {
//               const parts = manual.split(",").map((s) => s.trim());
//               if (parts.length === 2) {
//                 const lat = parseFloat(parts[0]);
//                 const lng = parseFloat(parts[1]);
//                 if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
//                   const coords = { lat, lng };
//                   setOrigin(coords);
//                   return coords;
//                 }
//               }
//             }
//             setError("NGO origin not available (geolocation blocked). Provide ngo_lat & ngo_lng in query.");
//             return null;
//           }
//         } else {
//           setError("Geolocation not supported and no NGO coords provided.");
//           return null;
//         }
//       }
//       return origin!;
//     };

//     let cancelled = false;

//     (async () => {
//       const usedOrigin = await ensureOrigin();
//       if (!usedOrigin) return;
//       if (cancelled) return;

//       // create map if not created
//       const g = (window as any).google;
//       if (!g || !g.maps) {
//         setError("Google Maps is not available.");
//         return;
//       }

//       // Setup map centered between origin and destination
//       const bounds = new g.maps.LatLngBounds();
//       bounds.extend(new g.maps.LatLng(usedOrigin.lat, usedOrigin.lng));
//       bounds.extend(new g.maps.LatLng(destination.lat, destination.lng));

//       if (!googleMapRef.current && mapRef.current) {
//         googleMapRef.current = new g.maps.Map(mapRef.current, {
//           center: bounds.getCenter(),
//           zoom: 13,
//         });
//       }

//       googleMapRef.current.fitBounds(bounds, 80);

//       // Prepare directions service & renderer
//       const directionsService = new g.maps.DirectionsService();
//       if (!directionsRendererRef.current) {
//         directionsRendererRef.current = new g.maps.DirectionsRenderer({ map: googleMapRef.current });
//       }

//       setLoading(true);
//       directionsService.route(
//         {
//           origin: new g.maps.LatLng(usedOrigin.lat, usedOrigin.lng),
//           destination: new g.maps.LatLng(destination.lat, destination.lng),
//           travelMode: g.maps.TravelMode.DRIVING,
//           drivingOptions: {
//             departureTime: new Date(), // use current traffic
//             trafficModel: "bestguess",
//           },
//           provideRouteAlternatives: false,
//         },
//         (result: any, status: string) => {
//           setLoading(false);
//           if (status === "OK") {
//             directionsRendererRef.current.setDirections(result);
//             // extract summary data
//             try {
//               const leg = result.routes[0].legs[0];
//               setRouteInfo({ distanceText: leg.distance?.text, durationText: leg.duration?.text });
//             } catch (e) {
//               setRouteInfo(null);
//             }
//           } else {
//             console.error("Directions request failed:", status, result);
//             setError(`Could not compute route: ${status}`);
//           }
//         }
//       );
//     })();

//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mapReady, origin, destination]);

//   const openInGoogleMaps = () => {
//     if (!origin || !destination) {
//       toast.error("Missing origin or destination coordinates");
//       return;
//     }
//     const originStr = `${origin.lat},${origin.lng}`;
//     const destStr = `${destination.lat},${destination.lng}`;
//     const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(
//       destStr
//     )}&travelmode=driving`;
//     window.open(url, "_blank");
//   };

//   const handleBack = () => {
//     router.back();
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
//         <Button onClick={handleBack} variant="outline">
//           Back
//         </Button>
//         <h2 style={{ margin: 0 }}>Track route to rescue {caseId ? ` (Case ${caseId})` : ""}</h2>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
//         <div>
//           <Card>
//             <CardContent>
//               <div ref={mapRef} style={MAP_STYLE} />
//               {loading && <p style={{ marginTop: 8 }}>Computing best route…</p>}
//               {error && (
//                 <p style={{ marginTop: 8, color: "crimson" }}>
//                   <strong>Error:</strong> {error}
//                 </p>
//               )}
//             </CardContent>
//           </Card>

//           <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
//             <Button onClick={openInGoogleMaps} style={{ display: "flex", alignItems: "center", gap: 8 }}>
//               <Navigation /> Open in Google Maps
//             </Button>

//             <a
//               href={
//                 origin && destination
//                   ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`
//                   : "#"
//               }
//               target="_blank"
//               rel="noreferrer"
//             >
//               <Button variant="outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                 <ExternalLink /> Open in browser
//               </Button>
//             </a>
//           </div>
//         </div>

//         <div>
//           <Card>
//             <CardContent>
//               <h3 style={{ marginTop: 0 }}>Route info</h3>
//               <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
//                 <MapPin />
//                 <div>
//                   <div style={{ fontSize: 13, color: "#666" }}>Origin (NGO)</div>
//                   <div style={{ fontWeight: 600 }}>{origin ? `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}` : "Unknown"}</div>
//                 </div>
//               </div>

//               <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
//                 <MapPin />
//                 <div>
//                   <div style={{ fontSize: 13, color: "#666" }}>Destination (Case)</div>
//                   <div style={{ fontWeight: 600 }}>{destination ? `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}` : "Unknown"}</div>
//                 </div>
//               </div>

//               <div style={{ marginTop: 8 }}>
//                 <div style={{ fontSize: 13, color: "#666" }}>Estimated distance</div>
//                 <div style={{ fontWeight: 700, fontSize: 16 }}>{routeInfo?.distanceText || "—"}</div>
//               </div>

//               <div style={{ marginTop: 12 }}>
//                 <div style={{ fontSize: 13, color: "#666" }}>Estimated travel time</div>
//                 <div style={{ fontWeight: 700, fontSize: 16 }}>{routeInfo?.durationText || "—"}</div>
//               </div>

//               <div style={{ marginTop: 18 }}>
//                 <div style={{ fontSize: 12, color: "#333" }}>
//                   Tips:
//                   <ul>
//                     <li>Use Open in Google Maps to get live traffic and turn-by-turn navigation on your phone.</li>
//                     <li>If origin is wrong, provide NGO coords as query params ngo_lat & ngo_lng or allow browser geolocation.</li>
//                   </ul>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }