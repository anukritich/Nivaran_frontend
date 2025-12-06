import { MapPin } from "lucide-react";
import { RescueCase } from "./RescueCard";

interface MapViewProps {
  rescues: RescueCase[];
}

export function MapView({ rescues }: MapViewProps) {
  // This is a placeholder map component
  // In production, you would integrate with Leaflet or Mapbox
  
  return (
    <div className="w-full h-96 bg-secondary rounded-lg border border-border overflow-hidden relative">
      {/* Placeholder map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `repeating-linear-gradient(0deg, #ddd, #ddd 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #ddd, #ddd 1px, transparent 1px, transparent 20px)`
        }} />
      </div>

      {/* Map markers */}
      <div className="relative w-full h-full p-8">
        {rescues.slice(0, 5).map((rescue, index) => (
          <div
            key={rescue.id}
            className="absolute group cursor-pointer"
            style={{
              left: `${20 + index * 15}%`,
              top: `${30 + (index % 3) * 20}%`,
            }}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-white" fill="white" />
              </div>
              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-white rounded-lg shadow-xl p-3 w-48 border border-border">
                  <p className="font-semibold text-sm">{rescue.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rescue.location}
                  </p>
                  <p className="text-xs text-primary mt-1">
                    {rescue.severity} • {rescue.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Map controls placeholder */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 space-y-2">
        <button className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded">
          +
        </button>
        <button className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded">
          −
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <p className="text-xs font-semibold mb-2">Active Rescues</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>{rescues.length} cases</span>
        </div>
      </div>
    </div>
  );
}