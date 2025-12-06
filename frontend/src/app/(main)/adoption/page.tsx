"use client"

import { useState } from "react";
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

  // Mock adoption data
  const mockAnimals: AdoptionAnimal[] = [
    {
      id: "1",
      name: "Max",
      type: "Dog",
      breed: "Golden Retriever Mix",
      age: "2 years",
      gender: "Male",
      location: "Mumbai, Maharashtra",
      imageUrl: "https://images.unsplash.com/photo-1671564831911-b357c38f5d69?w=400",
      description: "Friendly and energetic dog, loves to play fetch and great with kids. Fully trained and well-behaved.",
      vaccinated: true,
      neutered: true,
    },
    {
      id: "2",
      name: "Luna",
      type: "Cat",
      breed: "Persian",
      age: "1 year",
      gender: "Female",
      location: "Mumbai, Maharashtra",
      imageUrl: "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400",
      description: "Beautiful and calm cat, loves cuddles and quiet environments. Perfect for apartment living.",
      vaccinated: true,
      neutered: false,
    },
    {
      id: "3",
      name: "Buddy",
      type: "Dog",
      breed: "Labrador",
      age: "3 years",
      gender: "Male",
      location: "Pune, Maharashtra",
      imageUrl: "https://images.unsplash.com/photo-1553434133-96822a8e94af?w=400",
      description: "Loyal companion, trained guard dog. Great with families and very protective. Needs regular exercise.",
      vaccinated: true,
      neutered: true,
    },
    {
      id: "4",
      name: "Bella",
      type: "Dog",
      breed: "Indie Mix",
      age: "6 months",
      gender: "Female",
      location: "Mumbai, Maharashtra",
      imageUrl: "https://images.unsplash.com/photo-1700665537604-412e89a285c3?w=400",
      description: "Playful puppy, very friendly with other pets. Learning basic commands and house training.",
      vaccinated: true,
      neutered: false,
    },
    {
      id: "5",
      name: "Milo",
      type: "Cat",
      breed: "Siamese Mix",
      age: "2 years",
      gender: "Male",
      location: "Delhi, NCR",
      imageUrl: "https://images.unsplash.com/photo-1617835963886-d504ab3cca44?w=400",
      description: "Intelligent and talkative cat. Loves attention and enjoys interactive play. Good with children.",
      vaccinated: true,
      neutered: true,
    },
    {
      id: "6",
      name: "Daisy",
      type: "Dog",
      breed: "Beagle",
      age: "4 years",
      gender: "Female",
      location: "Bangalore, Karnataka",
      imageUrl: "https://images.unsplash.com/photo-1553434133-96822a8e94af?w=400",
      description: "Sweet and gentle, great for first-time dog owners. Loves long walks and treats.",
      vaccinated: true,
      neutered: true,
    },
  ];

  const filteredAnimals = mockAnimals.filter((animal) => {
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
    const animal = mockAnimals.find((a) => a.id === id);
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
              <div className="text-3xl font-bold">{mockAnimals.length}</div>
              <p className="text-sm">Animals Available</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {mockAnimals.filter((a) => a.type === "Dog").length}
              </div>
              <p className="text-sm">Dogs</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {mockAnimals.filter((a) => a.type === "Cat").length}
              </div>
              <p className="text-sm">Cats</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {mockAnimals.filter((a) => a.vaccinated).length}
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