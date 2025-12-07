"use client"

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdoptionCard, AdoptionAnimal } from "@/components/AdoptionCard";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface AdoptionPageProps {
  onNavigate: (page: string) => void;
}

const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
  text: "#fff"
};

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || "http://127.0.0.1:3000";

export default function AdoptionPage({ onNavigate }: AdoptionPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AdoptionAnimal | null>(null);
  const [adoptionForm, setAdoptionForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    experience: "",
    reason: "",
  });
  const [animals, setAnimals] = useState<AdoptionAnimal[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch adoptions from backend
  const fetchAdoptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_API}/adoptions?status=available`);
      if (!res.ok) {
        toast.error("Failed to load adoptions");
        return;
      }
      const data = await res.json();
      
      // Fetch presigned URLs for images in batches
      const enriched: AdoptionAnimal[] = [];
      const batchSize = 6;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchPromises = batch.map(async (item: any) => {
          let imageUrl = "";
          if (item.adoption_id) {
            try {
              const imgRes = await fetch(`${BACKEND_API}/adoptions/${item.adoption_id}/image-url`);
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                imageUrl = imgData.url;
              }
            } catch (e) {
              console.warn("Failed to fetch image for", item.adoption_id);
            }
          }
          
          return {
            id: item.adoption_id,
            name: item.name,
            type: item.animal_type,
            breed: item.breed || "Mixed Breed",
            age: item.age,
            gender: item.gender || "Unknown",
            location: "Available for Adoption", // Could add NGO location if needed
            imageUrl,
            description: item.description || "",
            vaccinated: item.vaccinated || false,
            neutered: item.neutered || false,
          } as AdoptionAnimal;
        });
        
        const results = await Promise.all(batchPromises);
        enriched.push(...results);
      }
      
      setAnimals(enriched);
    } catch (err) {
      console.error("Fetch adoptions error", err);
      toast.error("Failed to load adoptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdoptions();
  }, [fetchAdoptions]);

  const filteredAnimals = animals.filter((animal) => {
    const matchesSearch =
      searchQuery === "" ||
      animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.breed.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || animal.type === filterType;
    const matchesLocation =
      filterLocation === "all" || animal.location.includes(filterLocation);

    return matchesSearch && matchesType && matchesLocation;
  });

  const handleAdopt = (id: string) => {
    const animal = animals.find((a) => a.id === id);
    if (animal) {
      setSelectedAnimal(animal);
      setIsDialogOpen(true);
    }
  };

  const handleSubmitAdoption = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Adoption request submitted for ${selectedAnimal?.name}!`);
    setIsDialogOpen(false);
    setAdoptionForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      experience: "",
      reason: "",
    });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: THEME.primary }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: THEME.text }}>
            Find Your New Best Friend
          </h1>
          <p className="text-lg" style={{ color: "#eaf7ff" }}>
            Give a loving home to animals in need of adoption
          </p>
        </div>

        {/* Stats Banner */}
        <div style={{ background: THEME.primary, color: THEME.text }} className="rounded-lg p-6 mb-8 text-center">
          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            <div>
              <div className="text-3xl font-bold">{animals.length}</div>
              <p className="text-sm">Animals Available</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {animals.filter((a) => a.type === "Dog").length}
              </div>
              <p className="text-sm">Dogs</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {animals.filter((a) => a.type === "Cat").length}
              </div>
              <p className="text-sm">Cats</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {animals.filter((a) => a.vaccinated).length}
              </div>
              <p className="text-sm">Vaccinated</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8" style={{ background: "#eaf7ff" }}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                <Input
                  placeholder="Search by name or breed..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-black"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48 text-black">
                  <SelectValue placeholder="Animal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-black">All Types</SelectItem>
                  <SelectItem value="Dog" className="text-black">Dogs</SelectItem>
                  <SelectItem value="Cat" className="text-black">Cats</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-full md:w-48 text-black">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-black">All Locations</SelectItem>
                  <SelectItem value="Mumbai" className="text-black">Mumbai</SelectItem>
                  <SelectItem value="Pune" className="text-black">Pune</SelectItem>
                  <SelectItem value="Delhi" className="text-black">Delhi</SelectItem>
                  <SelectItem value="Bangalore" className="text-black">Bangalore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Animals Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-lg" style={{ color: THEME.primary }}>Loading animals...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnimals.length > 0 ? (
              filteredAnimals.map((animal) => (
                <AdoptionCard
                  key={animal.id}
                animal={animal}
                onAdopt={handleAdopt}
              />
            ))
          ) : (
            <div className="col-span-full">
              <Card style={{ background: "#eaf7ff" }}>
                <CardContent className="py-12 text-center ">
                  <p style={{ color: THEME.primary }}>
                    No animals found matching your search criteria.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        )}

        {/* Adoption Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adopt {selectedAnimal?.name}</DialogTitle>
              <DialogDescription>
                Please fill out this form to express your interest in adopting{" "}
                {selectedAnimal?.name}. Our team will review your application and get
                back to you within 48 hours.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAdoption} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" style={{ color: THEME.primary }}>Full Name *</Label>
                  <Input
                    id="name"
                    value={adoptionForm.name}
                    onChange={(e) =>
                      setAdoptionForm({ ...adoptionForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: THEME.primary }}>Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={adoptionForm.email}
                    onChange={(e) =>
                      setAdoptionForm({ ...adoptionForm, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" style={{ color: THEME.primary }}>Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={adoptionForm.phone}
                    onChange={(e) =>
                      setAdoptionForm({ ...adoptionForm, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" style={{ color: THEME.primary }}>Address *</Label>
                  <Input
                    id="address"
                    value={adoptionForm.address}
                    onChange={(e) =>
                      setAdoptionForm({ ...adoptionForm, address: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience" style={{ color: THEME.primary }}>Pet Ownership Experience</Label>
                <Textarea
                  id="experience"
                  placeholder="Tell us about your experience with pets..."
                  rows={3}
                  value={adoptionForm.experience}
                  onChange={(e) =>
                    setAdoptionForm({ ...adoptionForm, experience: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason" style={{ color: THEME.primary }}>Why do you want to adopt? *</Label>
                <Textarea
                  id="reason"
                  placeholder="Share your reasons for adopting..."
                  rows={3}
                  value={adoptionForm.reason}
                  onChange={(e) =>
                    setAdoptionForm({ ...adoptionForm, reason: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" style={{ background: THEME.cta, color: THEME.text }}>
                  <Heart className="w-4 h-4 mr-2" />
                  Submit Application
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}