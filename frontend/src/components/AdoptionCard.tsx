import { MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// Theme colors
const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
};

export interface AdoptionAnimal {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  gender: "Male" | "Female";
  location: string;
  imageUrl: string;
  description: string;
  vaccinated: boolean;
  neutered: boolean;
}

interface AdoptionCardProps {
  animal: AdoptionAnimal;
  onAdopt?: (id: string) => void;
  buttonText?: string;
}

export function AdoptionCard({ animal, onAdopt, buttonText }: AdoptionCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-56 overflow-hidden">
        <img
          src={animal.imageUrl}
          alt={animal.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: THEME.cta }}>{animal.name}</h3>
            <p className="text-sm" style={{ color: THEME.primary }}>{animal.breed}</p>
          </div>
          <Badge variant="secondary" style={{ background: THEME.primary, color: "#fff" }}>
            {animal.gender}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm" style={{ color: "#555" }}>
          {animal.description}
        </p>
        <div className="flex items-center text-sm" style={{ color: THEME.cta }}>
          <Calendar className="w-4 h-4 mr-1" style={{ color: THEME.primary }} />
          <span>{animal.age}</span>
        </div>
        <div className="flex items-center text-sm" style={{ color: THEME.cta }}>
          <MapPin className="w-4 h-4 mr-1" style={{ color: THEME.primary }} />
          <span>{animal.location}</span>
        </div>
        <div className="flex gap-2">
          {animal.vaccinated && (
            <Badge variant="outline" style={{ background: THEME.accent, color: "#333", borderColor: THEME.primary }}>
              Vaccinated
            </Badge>
          )}
          {animal.neutered && (
            <Badge variant="outline" style={{ background: THEME.primary, color: "#fff", borderColor: THEME.accent }}>
              Neutered
            </Badge>
          )}
        </div>
      </CardContent>
      {onAdopt && (
        <CardFooter>
          <Button
            onClick={() => onAdopt(animal.id)}
            className="w-full"
            style={{ background: THEME.cta, color: "#fff", fontWeight: 600 }}
          >
            {buttonText || `Adopt ${animal.name}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}