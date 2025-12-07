import { MapPin, Clock, AlertCircle, Navigation, Heart, Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export interface RescueCase {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: string;
  imageUrl?: string;
  reportedAt: string;
  contactInfo: string;
  latitude?: number;
  longitude?: number;
}

interface RescueCardProps {
  rescue: RescueCase;
  onTakeAction?: (id: string) => void;
  onTrack?: (id: string) => void;
  onPushForAdoption?: (id: string) => void;
  onMarkAsAdopted?: (id: string) => void;
  showTrackButton?: boolean;
  showAdoptionButton?: boolean;
  adoptionStatus?: string;
}

/**
 * Updated RescueCard:
 * - Forces card background to the light card color and forces readable dark text.
 * - Uses theme-consistent colors for icons and button.
 * - Keeps existing badge color classes unchanged.
 */
export function RescueCard({ 
  rescue, 
  onTakeAction, 
  onTrack, 
  onPushForAdoption, 
  onMarkAsAdopted,
  showTrackButton, 
  showAdoptionButton,
  adoptionStatus 
}: RescueCardProps) {
  const severityColors = {
    Low: "bg-green-100 text-green-800 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200",
  };

  const statusColors = {
    New: "bg-blue-100 text-blue-800 border-blue-200",
    "In Progress": "bg-purple-100 text-purple-800 border-purple-200",
    Resolved: "bg-green-100 text-green-800 border-green-200",
    Completed: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-green-100 text-green-800 border-green-200",
  };

  // Dashboard theme primary and CTA (kept inline here so component remains self-contained)
  const PRIMARY = "#19C2E6"; // used for icons / accents
  const CTA = "#FF5A1F"; // used for Take Action button

  const statusNormalized = String(rescue.status || "").toLowerCase();

  // Consider actionable any status other than 'resolved', 'completed', 'closed', or 'in progress'
  const isActionable = !["resolved", "in progress", "completed", "closed"].includes(statusNormalized);

  return (
    // Force card background to the light card color and ensure text inside is dark.
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow"
      style={{ background: "#eaf7ff", color: "#111827" }} // color ensures default text is dark
    >
      {rescue.imageUrl && (
        <div className="h-48 overflow-hidden">
          <img
            src={rescue.imageUrl}
            alt={rescue.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error(`Failed to load image: ${rescue.imageUrl}`, e);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log(`Successfully loaded image: ${rescue.imageUrl}`);
            }}
          />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {/* title: explicit dark color */}
          <h3 className="font-semibold" style={{ color: "#FF5A1F" }}>
          {rescue.title}
          </h3>
          <div className="flex gap-2 flex-shrink-0">
            <Badge className={severityColors[rescue.severity]} variant="outline">
              {rescue.severity}
            </Badge>
            <Badge className={statusColors[rescue.status as keyof typeof statusColors] ?? "bg-gray-100 text-gray-800 border-gray-200"} variant="outline">
              {rescue.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* description: darker muted text */}
        <p className="text-gray-700">{rescue.description}</p>

        <div className="flex items-center text-sm text-gray-700">
          <MapPin className="w-4 h-4 mr-1" style={{ color: PRIMARY }} />
          <span>{rescue.location}</span>
        </div>

        <div className="flex items-center text-sm text-gray-700">
          <Clock className="w-4 h-4 mr-1" style={{ color: PRIMARY }} />
          <span>{rescue.reportedAt}</span>
        </div>
      </CardContent>

      {(onTakeAction && isActionable) || (onTrack && showTrackButton) || (onPushForAdoption && showAdoptionButton) ? (
        <CardFooter className="flex gap-2">
          {onTakeAction && isActionable && (
            <Button
              onClick={() => onTakeAction(rescue.id)}
              className="flex-1"
              style={{
                background: CTA,
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Take Action
            </Button>
          )}
          {onTrack && showTrackButton && (
            <Button
              onClick={() => onTrack(rescue.id)}
              className="flex-1"
              style={{
                background: PRIMARY,
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Track
            </Button>
          )}
          {onPushForAdoption && showAdoptionButton && !adoptionStatus && (
            <Button
              onClick={() => onPushForAdoption(rescue.id)}
              className="flex-1"
              style={{
                background: "#10B981",
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Push for Adoption
            </Button>
          )}
          {adoptionStatus === "available" && onMarkAsAdopted && (
            <Button
              onClick={() => onMarkAsAdopted(rescue.id)}
              className="flex-1"
              style={{
                background: "#8B5CF6",
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Adopted
            </Button>
          )}
          {adoptionStatus === "adopted" && (
            <Badge
              className="flex-1 justify-center py-2"
              style={{
                background: "#059669",
                color: "#fff",
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Adopted
            </Badge>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}
