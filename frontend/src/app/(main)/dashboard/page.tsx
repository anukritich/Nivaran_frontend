
"use client";
import { useEffect, useState, useCallback } from "react";
import { Filter, Map, List, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RescueCard, RescueCase } from "@/components/RescueCard";
import { AdoptionCard, AdoptionAnimal } from "@/components/AdoptionCard";
import { MapView } from "@/components/MapView";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

/**
 * Dashboard page - updated
 *
 * - When the user clicks "Take Action" on a RescueCard, navigate to /tracking
 *   with query params: case_id, lat, lng, ngo_lat, ngo_lng.
 * - We try to resolve NGO coordinates from backend (/ngos list) using ngo_id stored in localStorage or entered in the UI.
 * - If NGO coords are not available, we attempt to use browser geolocation as a fallback.
 *
 * Requirements:
 * - NEXT_PUBLIC_BACKEND_API set (e.g. http://127.0.0.1:3000)
 * - Backend presign endpoint at /cases/{case_id}/image-url (already implemented)
 * - List NGOs endpoint GET /ngos exists (returns array) so we can resolve ngo coords by ngo_id
 */

const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
  text: "#fff",
};

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || "http://127.0.0.1:3000";
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || process.env.NEXT_PUBLIC_ANIMAL_BUCKET || "nivaran-animal-image";
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1";

function s3UrlForKey(key: string | null) {
  if (!key) return "";
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
}

export default function DashboardPage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [caseType, setCaseType] = useState<"all" | "ongoing" | "completed" | "adopted">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [ngoEmail, setNgoEmail] = useState<string | null>(null);
  const [editingNgoEmail, setEditingNgoEmail] = useState<string>("");
  const [ngoCoords, setNgoCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Adoption modal state
  const [showAdoptionModal, setShowAdoptionModal] = useState(false);
  const [selectedCaseForAdoption, setSelectedCaseForAdoption] = useState<any>(null);
  const [adoptionForm, setAdoptionForm] = useState({
    name: "",
    animal_type: "",
    age: "",
    gender: "",
    breed: "",
    size: "",
    neutered: false,
    vaccinated: false,
    description: "",
    health_status: "",
    temperament: "",
    good_with_kids: false,
    good_with_pets: false,
    image_file: null as File | null,
    image_base64: ""
  });
  const [submittingAdoption, setSubmittingAdoption] = useState(false);
  const [adoptionStatusMap, setAdoptionStatusMap] = useState<Record<string, { adoption_id: string; status: string }>>({}); // Track which cases are pushed for adoption
  const [adoptedAnimals, setAdoptedAnimals] = useState<Record<string, AdoptionAnimal>>({}); // Store adoption card data for pushed cases

  const router = useRouter();

  // Stats derived from cases
  const stats = {
    total: cases.length,
    new: cases.filter((c) => (c.status || "New") === "New").length,
    inProgress: cases.filter((c) => (c.status || "New") === "In Progress").length,
    resolved: cases.filter((c) => (c.status || "New") === "Resolved").length,
  };

  const fetchPresignedForCase = useCallback(async (caseId: string) => {
    try {
      const res = await fetch(`${BACKEND_API}/cases/${encodeURIComponent(caseId)}/image-url`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn(`Presign fetch failed for ${caseId}`, res.status, txt);
        return undefined;
      }
      const body = await res.json().catch(() => null);
      if (body && body.url) return body.url as string;
      return undefined;
    } catch (err) {
      console.warn("Presign request error", err);
      return undefined;
    }
  }, []);

  const fetchPresignedForS3Key = useCallback(async (s3Key: string) => {
    try {
      const res = await fetch(`${BACKEND_API}/cases/dummy/image-url?key=${encodeURIComponent(s3Key)}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn(`Presign fetch failed for s3_key ${s3Key}`, res.status, txt);
        return undefined;
      }
      const body = await res.json().catch(() => null);
      if (body && body.url) return body.url as string;
      return undefined;
    } catch (err) {
      console.warn("Presign request error for s3_key", err);
      return undefined;
    }
  }, []);

  async function fetchNearbyCases(currentNgoEmail: string) {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_API}/cases-nearby?email=${encodeURIComponent(currentNgoEmail)}`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        toast.error(`Failed to load nearby cases: ${res.status} ${body}`);
        setCases([]);
        return;
      }
      let data = await res.json();
      if (!Array.isArray(data)) {
        toast.error("Unexpected response shape from backend");
        setCases([]);
        return;
      }

      // Attach presigned URLs in batches
      const batchSize = 6;
      const enriched: any[] = [];
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchPromises = batch.map(async (c: any) => {
          if (c.case_id) {
            const presigned = await fetchPresignedForCase(c.case_id);
            if (presigned) c.image_presigned_url = presigned;
          }
          return c;
        });
        const results = await Promise.all(batchPromises);
        enriched.push(...results);
      }

      setCases(enriched);
    } catch (err: any) {
      console.error("Fetch nearby cases error", err);
      toast.error("Network error while loading nearby cases");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOngoingCases(currentNgoEmail: string) {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_API}/ngo-cases?email=${encodeURIComponent(currentNgoEmail)}`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        toast.error(`Failed to load ongoing cases: ${res.status} ${body}`);
        setCases([]);
        return;
      }
      let data = await res.json();
      if (!Array.isArray(data)) {
        toast.error("Unexpected response shape from backend");
        setCases([]);
        return;
      }

      // Extract case data from case_payload
      const enriched: any[] = [];
      
      // Process in batches to fetch presigned URLs
      const batchSize = 6;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchPromises = batch.map(async (item: any) => {
          let caseData = item.case_payload;
          if (typeof caseData === 'string') {
            try {
              caseData = JSON.parse(caseData);
            } catch (e) {
              caseData = {};
            }
          }
          
          const caseId = item.case_id || caseData.case_id;
          const s3Key = item.s3_key || caseData.s3_key;
          const itemStatus = item.status || "In Progress";
          
          // Fetch presigned URL using s3_key parameter
          let imageUrl = undefined;
          if (s3Key) {
            const presigned = await fetchPresignedForS3Key(s3Key);
            if (presigned) {
              imageUrl = presigned;
            }
          }
          
          return {
            ...caseData,
            case_id: caseId,
            ngo_id: item.ngo_id,
            taken_at: item.taken_at,
            status: itemStatus,
            s3_key: s3Key,
            image_presigned_url: imageUrl,
            latitude: item.latitude || caseData.latitude,
            longitude: item.longitude || caseData.longitude,
            completed_at: item.completed_at
          };
        });
        
        const results = await Promise.all(batchPromises);
        enriched.push(...results);
      }

      setCases(enriched);
    } catch (err: any) {
      console.error("Fetch ongoing cases error", err);
      toast.error("Network error while loading ongoing cases");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch adoptions by NGO email for completed cases
  async function fetchAdoptionsByNgoEmail(email: string) {
    try {
      const res = await fetch(`${BACKEND_API}/adoptions?status=all`);
      if (!res.ok) {
        console.warn("Failed to fetch adoptions", res.status);
        return;
      }
      const adoptions = await res.json();
      if (!Array.isArray(adoptions)) return;
      
      console.log("[Dashboard] Fetched adoptions:", adoptions.length);
      
      // Filter adoptions by NGO email (include both available and adopted)
      const ngoAdoptions = adoptions.filter((a: any) => 
        a.ngo_email && 
        a.ngo_email.toLowerCase() === email.toLowerCase()
      );
      
      console.log("[Dashboard] NGO adoptions (all):", ngoAdoptions.length);
      ngoAdoptions.forEach((a: any) => {
        console.log(`  - Adoption ${a.adoption_id}, case_id: ${a.case_id}, status: ${a.adoption_status}`);
      });
      
      // Fetch images for adoptions in batches
      const batchSize = 6;
      const enrichedAdoptions: Record<string, AdoptionAnimal> = {};
      
      for (let i = 0; i < ngoAdoptions.length; i += batchSize) {
        const batch = ngoAdoptions.slice(i, i + batchSize);
        const batchPromises = batch.map(async (adoption: any) => {
          let imageUrl = "";
          if (adoption.adoption_id) {
            try {
              const imgRes = await fetch(`${BACKEND_API}/adoptions/${adoption.adoption_id}/image-url`);
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                imageUrl = imgData.url;
              }
            } catch (e) {
              console.warn("Failed to fetch adoption image");
            }
          }
          
          const animal: AdoptionAnimal = {
            id: adoption.adoption_id,
            name: adoption.name,
            type: adoption.animal_type,
            breed: adoption.breed || "Mixed Breed",
            age: adoption.age,
            gender: adoption.gender || "Unknown",
            location: "Available for Adoption",
            imageUrl,
            description: adoption.description || "",
            vaccinated: adoption.vaccinated || false,
            neutered: adoption.neutered || false,
          };
          
          return {
            case_id: adoption.case_id,
            adoption_id: adoption.adoption_id,
            status: adoption.adoption_status,
            animal
          };
        });
        
        const results = await Promise.all(batchPromises);
        results.forEach(result => {
          if (result.case_id) {
            console.log(`[Dashboard] Mapping case_id ${result.case_id} to adoption ${result.adoption_id}`);
            enrichedAdoptions[result.case_id] = result.animal;
            setAdoptionStatusMap(prev => ({
              ...prev,
              [result.case_id]: {
                adoption_id: result.adoption_id,
                status: result.status
              }
            }));
          }
        });
      }
      
      console.log("[Dashboard] adoptedAnimals keys:", Object.keys(enrichedAdoptions));
      setAdoptedAnimals(enrichedAdoptions);
    } catch (e) {
      console.warn("Error fetching adoptions", e);
    }
  }

  // Resolve ngo coordinates by calling GET /ngos and matching by email
  async function fetchNgoCoordsByEmail(email: string) {
    try {
      const res = await fetch(`${BACKEND_API}/ngos`);
      if (!res.ok) {
        console.warn("Failed to fetch NGOs for coords", res.status);
        return null;
      }
      const list = await res.json().catch(() => []);
      if (!Array.isArray(list)) return null;
      const match = list.find((n: any) => String(n.email).toLowerCase() === String(email).toLowerCase());
      if (match && (match.latitude !== undefined && match.longitude !== undefined)) {
        const lat = Number(match.latitude);
        const lng = Number(match.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setNgoCoords({ lat, lng });
          return { lat, lng };
        }
      }
    } catch (e) {
      console.warn("Error fetching ngo coords", e);
    }
    return null;
  }

  // On mount or caseType change: get email from Firebase auth and load cases + NGO coords
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user && user.email) {
      const email = user.email;
      setNgoEmail(email);
      setEditingNgoEmail(email);
      if (caseType === "all") {
        fetchNearbyCases(email);
      } else {
        fetchOngoingCases(email);
      }
      fetchNgoCoordsByEmail(email);
      
      // Fetch adoptions for completed cases tab
      if (caseType === "completed") {
        fetchAdoptionsByNgoEmail(email);
      }
    } else {
      // Wait for auth state
      const unsubscribe = auth.onAuthStateChanged((u) => {
        if (u && u.email) {
          setNgoEmail(u.email);
          setEditingNgoEmail(u.email);
          if (caseType === "all") {
            fetchNearbyCases(u.email);
          } else {
            fetchOngoingCases(u.email);
          }
          fetchNgoCoordsByEmail(u.email);
          
          // Fetch adoptions for completed cases tab
          if (caseType === "completed") {
            fetchAdoptionsByNgoEmail(u.email);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [caseType]);

  const saveNgoEmail = async () => {
    if (!editingNgoEmail) {
      toast.error("Enter an NGO email first");
      return;
    }
    setNgoEmail(editingNgoEmail);
    toast.success("NGO email saved");
    await fetchNearbyCases(editingNgoEmail);
    await fetchNgoCoordsByEmail(editingNgoEmail);
  };

  const clearNgoEmail = () => {
    setNgoEmail(null);
    setEditingNgoEmail("");
    setNgoCoords(null);
    setCases([]);
  };

  // When user clicks Take Action: send request to backend
  const handleTakeAction = async (id: string) => {
    // find case object from original fetched cases
    const c = cases.find((it) => (it.case_id || it.id) === id || it.id === id);
    if (!c) {
      toast.error("Case not found");
      return;
    }

    if (!ngoEmail) {
      toast.error("NGO email not set");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API}/cases/${encodeURIComponent(id)}/take-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ngoEmail }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        toast.error(`Failed to take action: ${res.status} ${errBody}`);
        return;
      }

      toast.success(`Case #${id} assigned to you!`);
      
      // Refresh the current view
      if (caseType === "all") {
        fetchNearbyCases(ngoEmail);
      } else {
        fetchOngoingCases(ngoEmail);
      }
    } catch (err: any) {
      console.error("Take action error", err);
      toast.error("Network error while taking action");
    }
  };

  const handlePushForAdoption = (id: string) => {
    const c = cases.find((it) => (it.case_id || it.id) === id || it.id === id);
    if (!c) {
      toast.error("Case not found");
      return;
    }
    setSelectedCaseForAdoption(c);
    setShowAdoptionModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAdoptionForm(prev => ({ ...prev, image_file: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdoptionForm(prev => ({ ...prev, image_base64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAdoption = async () => {
    if (!ngoEmail) {
      toast.error("NGO email not found");
      return;
    }

    if (!adoptionForm.name || !adoptionForm.animal_type || !adoptionForm.age || !adoptionForm.image_base64) {
      toast.error("Please fill in all required fields and upload an image");
      return;
    }

    setSubmittingAdoption(true);

    try {
      const res = await fetch(`${BACKEND_API}/adoptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adoptionForm,
          ngo_email: ngoEmail,
          case_id: selectedCaseForAdoption?.case_id || selectedCaseForAdoption?.id || "",
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        toast.error(`Failed to post adoption: ${res.status} ${errBody}`);
        return;
      }

      const data = await res.json();
      toast.success(`Animal posted for adoption successfully!`);
      
      const caseId = selectedCaseForAdoption?.case_id || selectedCaseForAdoption?.id;
      
      // Refresh adoptions data to show the new adoption card
      if (caseId && data.adoption_id && ngoEmail) {
        await fetchAdoptionsByNgoEmail(ngoEmail);
      }
      
      setShowAdoptionModal(false);
      setAdoptionForm({
        name: "",
        animal_type: "",
        age: "",
        gender: "",
        breed: "",
        size: "",
        neutered: false,
        vaccinated: false,
        description: "",
        health_status: "",
        temperament: "",
        good_with_kids: false,
        good_with_pets: false,
        image_file: null,
        image_base64: ""
      });
      setSelectedCaseForAdoption(null);
    } catch (err: any) {
      console.error("Submit adoption error", err);
      toast.error("Network error while submitting adoption");
    } finally {
      setSubmittingAdoption(false);
    }
  };

  const handleMarkAsAdopted = async (adoptionId: string, caseId: string) => {
    try {
      const res = await fetch(`${BACKEND_API}/adoptions/${adoptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adoption_status: "adopted" }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        toast.error(`Failed to mark as adopted: ${res.status} ${errBody}`);
        return;
      }

      toast.success("Animal marked as adopted!");
      
      // Refresh adoptions to remove adopted animals from view
      if (ngoEmail) {
        await fetchAdoptionsByNgoEmail(ngoEmail);
      }
    } catch (err: any) {
      console.error("Mark as adopted error", err);
      toast.error("Network error while marking as adopted");
    }
  };

  const filteredRescues = cases
    .map((caseItem) => {
      const id = caseItem.case_id || caseItem.id || Math.random().toString(36).slice(2, 9);
      const imageUrl =
        caseItem.image_presigned_url ||
        (caseItem.s3_key ? s3UrlForKey(caseItem.s3_key) : caseItem.imageUrl || "");
      
      const location =
        caseItem.location ||
        (caseItem.latitude && caseItem.longitude ? `${caseItem.latitude}, ${caseItem.longitude}` : "Unknown");
      return {
        id,
        title: caseItem.description ? (caseItem.description as string).slice(0, 60) : `Case ${id}`,
        description: caseItem.description || "",
        location,
        severity: caseItem.severity || "Unknown",
        status: caseItem.status || "New",
        imageUrl,
        reportedAt: caseItem.created_at || caseItem.reportedAt || "recent",
        contactInfo: caseItem.contact_phone || caseItem.contactInfo || "n/a",
        latitude: caseItem.latitude,
        longitude: caseItem.longitude,
        // keep original case_id so we can correlate when Take Action is clicked
        _raw: caseItem,
      } as RescueCase & { _raw?: any };
    })
    .filter((rescue) => {
      // Filter by case type (all, ongoing, completed, adopted)
      if (caseType === "adopted") {
        // For adopted tab, only show if it has an adopted adoption status
        const adoptionInfo = adoptionStatusMap[rescue.id];
        if (!adoptionInfo || adoptionInfo.status !== "adopted") {
          return false;
        }
      } else if (caseType === "ongoing") {
        // Show only in-progress cases
        const status = rescue.status.toLowerCase();
        if (status === "completed" || status === "resolved" || status === "closed") {
          return false;
        }
      } else if (caseType === "completed") {
        // Show only completed cases
        const status = rescue.status.toLowerCase();
        if (status !== "completed" && status !== "resolved" && status !== "closed") {
          return false;
        }
        // Don't show adopted animals in completed tab
        const adoptionInfo = adoptionStatusMap[rescue.id];
        if (adoptionInfo && adoptionInfo.status === "adopted") {
          return false;
        }
      }
      
      const matchesStatus = filterStatus === "all" || rescue.status === filterStatus;
      const matchesSeverity = filterSeverity === "all" || rescue.severity === filterSeverity;
      const matchesSearch =
        searchQuery === "" ||
        rescue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rescue.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSeverity && matchesSearch;
    });

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      // ignore
    } finally {
      try { localStorage.removeItem("email"); localStorage.removeItem("ngo_id"); } catch (e) {}
      router.push('/login');
    }
  };

  const handleTrack = async (id: string) => {
    const c = cases.find((it) => (it.case_id || it.id) === id);
    if (!c) {
      toast.error("Case not found");
      return;
    }

    const caseLat = c.latitude;
    const caseLng = c.longitude;

    if (!caseLat || !caseLng) {
      toast.error("Case location not available");
      return;
    }

    if (!ngoCoords) {
      toast.error("NGO location not available");
      return;
    }

    // Navigate to tracking page with query params
    router.push(
      `/tracking?case_id=${encodeURIComponent(id)}&lat=${caseLat}&lng=${caseLng}&ngo_lat=${ngoCoords.lat}&ngo_lng=${ngoCoords.lng}`
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: THEME.primary }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: THEME.text }}>
              Rescue Dashboard
            </h1>
            <p className="text-sm" style={{ color: "#eaf7ff" }}>
              Manage and respond to active rescue cases in your area
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="NGO Email"
                value={editingNgoEmail}
                onChange={(e) => setEditingNgoEmail(e.target.value)}
                className="text-black"
                style={{ width: 220 }}
              />
              <Button onClick={saveNgoEmail}>Save</Button>
              <Button variant="outline" onClick={clearNgoEmail}>Clear</Button>
            </div>

            <div className="ml-4">
              <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.total}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>Total Cases</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.new}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>New</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.inProgress}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>In Progress</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.resolved}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Case Type Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={caseType === "all" ? "default" : "outline"}
            onClick={() => setCaseType("all")}
            className="flex-1 sm:flex-none"
          >
            All Cases
          </Button>
          <Button
            variant={caseType === "ongoing" ? "default" : "outline"}
            onClick={() => setCaseType("ongoing")}
            className="flex-1 sm:flex-none"
          >
            My Ongoing Cases
          </Button>
          <Button
            variant={caseType === "completed" ? "default" : "outline"}
            onClick={() => setCaseType("completed")}
            className="flex-1 sm:flex-none"
          >
            Completed Cases
          </Button>
          <Button
            variant={caseType === "adopted" ? "default" : "outline"}
            onClick={() => setCaseType("adopted")}
            className="flex-1 sm:flex-none"
          >
            Adopted Animals
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6" style={{ background: "#eaf7ff" }}>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                <Input
                  placeholder="Search by location or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-black"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48 text-black">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-full md:w-48 text-black">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "map" ? "default" : "outline"} size="icon" onClick={() => setViewMode("map")}>
                  <Map className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (ngoEmail) fetchNearbyCases(ngoEmail);
                    else toast.error("NGO email not set");
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-white">Loading nearby cases…</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRescues.length > 0 ? (
              filteredRescues.map((rescue) => {
                const adoptionInfo = adoptionStatusMap[rescue.id];
                const adoptedAnimal = adoptedAnimals[rescue.id];
                
                if (caseType === "completed" || caseType === "adopted") {
                  console.log(`[Dashboard] Rendering case ${rescue.id}:`, {
                    hasAdoptionInfo: !!adoptionInfo,
                    hasAdoptedAnimal: !!adoptedAnimal,
                    adoptionStatus: adoptionInfo?.status,
                    caseType
                  });
                }
                
                // In adopted tab, show all adopted animals with adoption card
                if (caseType === "adopted" && adoptedAnimal && adoptionInfo?.status === "adopted") {
                  return (
                    <AdoptionCard
                      key={rescue.id}
                      animal={adoptedAnimal}
                      onAdopt={undefined}
                      buttonText="Adopted"
                    />
                  );
                }
                
                // If case is pushed for adoption and available, show AdoptionCard with Mark as Adopted button
                if (caseType === "completed" && adoptedAnimal && adoptionInfo?.status === "available") {
                  return (
                    <AdoptionCard
                      key={rescue.id}
                      animal={adoptedAnimal}
                      onAdopt={() => handleMarkAsAdopted(adoptionInfo.adoption_id, rescue.id)}
                      buttonText="Mark as Adopted"
                    />
                  );
                }
                
                // Otherwise show regular RescueCard
                return (
                  <RescueCard
                    key={rescue.id}
                    rescue={rescue}
                    onTakeAction={caseType === "all" ? (id) => handleTakeAction(id) : undefined}
                    onTrack={caseType === "ongoing" ? (id) => handleTrack(id) : undefined}
                    showTrackButton={caseType === "ongoing"}
                    onPushForAdoption={caseType === "completed" && !adoptedAnimal ? (id) => handlePushForAdoption(id) : undefined}
                    showAdoptionButton={caseType === "completed" && !adoptedAnimal}
                    onMarkAsAdopted={undefined}
                    adoptionStatus={adoptionInfo?.status}
                  />
                );
              })
            ) : (
              <div className="col-span-full">
                <Card style={{ background: "#eaf7ff" }}>
                  <CardContent className="py-12 text-center ">
                    <p style={{ color: THEME.primary }}>
                      No rescue cases found nearby. Make sure your NGO location and service radius are set.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <MapView rescues={filteredRescues} />
        )}
      </div>

      {/* Adoption Modal */}
      <Dialog open={showAdoptionModal} onOpenChange={setShowAdoptionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Push Animal for Adoption</DialogTitle>
            <DialogDescription>
              Fill in the details to post this rescued animal for adoption
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name *</Label>
              <Input
                id="name"
                value={adoptionForm.name}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Max"
              />
            </div>

            {/* Animal Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="animal_type" className="text-right">Animal Type *</Label>
              <Select value={adoptionForm.animal_type} onValueChange={(v) => setAdoptionForm(prev => ({ ...prev, animal_type: v }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dog">Dog</SelectItem>
                  <SelectItem value="Cat">Cat</SelectItem>
                  <SelectItem value="Bird">Bird</SelectItem>
                  <SelectItem value="Rabbit">Rabbit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="age" className="text-right">Age *</Label>
              <Input
                id="age"
                value={adoptionForm.age}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, age: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., 2 years, 6 months"
              />
            </div>

            {/* Gender */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">Gender</Label>
              <Select value={adoptionForm.gender} onValueChange={(v) => setAdoptionForm(prev => ({ ...prev, gender: v }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Breed */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breed" className="text-right">Breed</Label>
              <Input
                id="breed"
                value={adoptionForm.breed}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, breed: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Labrador, Persian"
              />
            </div>

            {/* Size */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="size" className="text-right">Size</Label>
              <Select value={adoptionForm.size} onValueChange={(v) => setAdoptionForm(prev => ({ ...prev, size: v }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Health Info</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="neutered"
                    checked={adoptionForm.neutered}
                    onCheckedChange={(checked) => setAdoptionForm(prev => ({ ...prev, neutered: checked as boolean }))}
                  />
                  <label htmlFor="neutered" className="text-sm">Neutered/Spayed</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="vaccinated"
                    checked={adoptionForm.vaccinated}
                    onCheckedChange={(checked) => setAdoptionForm(prev => ({ ...prev, vaccinated: checked as boolean }))}
                  />
                  <label htmlFor="vaccinated" className="text-sm">Vaccinated</label>
                </div>
              </div>
            </div>

            {/* Temperament Checkboxes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Temperament</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="good_with_kids"
                    checked={adoptionForm.good_with_kids}
                    onCheckedChange={(checked) => setAdoptionForm(prev => ({ ...prev, good_with_kids: checked as boolean }))}
                  />
                  <label htmlFor="good_with_kids" className="text-sm">Good with kids</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="good_with_pets"
                    checked={adoptionForm.good_with_pets}
                    onCheckedChange={(checked) => setAdoptionForm(prev => ({ ...prev, good_with_pets: checked as boolean }))}
                  />
                  <label htmlFor="good_with_pets" className="text-sm">Good with other pets</label>
                </div>
              </div>
            </div>

            {/* Health Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="health_status" className="text-right">Health Status</Label>
              <Input
                id="health_status"
                value={adoptionForm.health_status}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, health_status: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Healthy, Recovering"
              />
            </div>

            {/* Temperament Text */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperament" className="text-right">Temperament</Label>
              <Input
                id="temperament"
                value={adoptionForm.temperament}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, temperament: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Friendly, Shy, Playful"
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                value={adoptionForm.description}
                onChange={(e) => setAdoptionForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Tell potential adopters about this animal..."
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">Photo *</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdoptionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdoption} disabled={submittingAdoption}>
              {submittingAdoption ? "Submitting..." : "Post for Adoption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}// "use client";
// import { useEffect, useState, useCallback } from "react";
// import { Filter, Map, List, Search, RefreshCw } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { RescueCard, RescueCase } from "@/components/RescueCard";
// import { MapView } from "@/components/MapView";
// import { Card, CardContent } from "@/components/ui/card";
// import { toast } from "sonner";
// import { getAuth, signOut } from "firebase/auth";
// import { useRouter } from "next/navigation";

// /**
//  * Dashboard page for NGOs: includes Sign out button
//  */

// const THEME = {
//   primary: "#19C2E6",
//   accent: "#FED801",
//   cta: "#FF5A1F",
//   text: "#fff",
// };

// const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || "http://127.0.0.1:3000";
// const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "nivaran-animal-image";
// const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1";

// function s3UrlForKey(key: string | null) {
//   if (!key) return "";
//   return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
// }

// export default function DashboardPage({ onNavigate }: { onNavigate?: (p: string) => void }) {
//   const [viewMode, setViewMode] = useState<"list" | "map">("list");
//   const [filterStatus, setFilterStatus] = useState<string>("all");
//   const [filterSeverity, setFilterSeverity] = useState<string>("all");
//   const [searchQuery, setSearchQuery] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [cases, setCases] = useState<any[]>([]);
//   const [ngoId, setNgoId] = useState<string | null>(null);
//   const [editingNgoId, setEditingNgoId] = useState<string>("");

//   const router = useRouter();

//   const stats = {
//     total: cases.length,
//     new: cases.filter((c) => (c.status || "New") === "New").length,
//     inProgress: cases.filter((c) => (c.status || "New") === "In Progress").length,
//     resolved: cases.filter((c) => (c.status || "New") === "Resolved").length,
//   };

//   function mapCaseToRescue(caseItem: any): RescueCase {
//     const id = caseItem.case_id || caseItem.id || Math.random().toString(36).slice(2, 9);
//     const imageUrl =
//       caseItem.image_presigned_url ||
//       (caseItem.s3_key ? s3UrlForKey(caseItem.s3_key) : caseItem.imageUrl || "");
//     const location =
//       caseItem.location ||
//       (caseItem.latitude && caseItem.longitude ? `${caseItem.latitude}, ${caseItem.longitude}` : "Unknown");
//     return {
//       id,
//       title: caseItem.description ? (caseItem.description as string).slice(0, 60) : `Case ${id}`,
//       description: caseItem.description || "",
//       location,
//       severity: caseItem.severity || "Unknown",
//       status: caseItem.status || "New",
//       imageUrl,
//       reportedAt: caseItem.created_at || caseItem.reportedAt || "recent",
//       contactInfo: caseItem.contact_phone || caseItem.contactInfo || "n/a",
//     };
//   }

//   const fetchPresignedForCase = useCallback(async (caseId: string) => {
//     try {
//       const res = await fetch(`${BACKEND_API}/cases/${encodeURIComponent(caseId)}/image-url`);
//       if (!res.ok) {
//         const txt = await res.text().catch(() => "");
//         console.warn(`Presign fetch failed for ${caseId}`, res.status, txt);
//         return undefined;
//       }
//       const body = await res.json().catch(() => null);
//       if (body && body.url) return body.url as string;
//       return undefined;
//     } catch (err) {
//       console.warn("Presign request error", err);
//       return undefined;
//     }
//   }, []);

// Legacy ngo_id-based logic removed. Dashboard now uses email for fetching.

//   const handleTakeAction = (id: string) => {
//     toast.success(`You've taken responsibility for case #${id}`);
//   };

//   // inside this file update handleSignOut to clear localStorage before redirecting:
//   const handleSignOut = async () => {
//     try {
//       const auth = getAuth();
//       await signOut(auth);
//     } catch (e) {
//       // ignore
//     } finally {
//       try { localStorage.removeItem("email"); localStorage.removeItem("ngo_id"); } catch (e) {}
//       router.push('/login');
//     }
//   };

//   const filteredRescues = cases
//     .map(mapCaseToRescue)
//     .filter((rescue) => {
//       const matchesStatus = filterStatus === "all" || rescue.status === filterStatus;
//       const matchesSeverity = filterSeverity === "all" || rescue.severity === filterSeverity;
//       const matchesSearch =
//         searchQuery === "" ||
//         rescue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         rescue.location.toLowerCase().includes(searchQuery.toLowerCase());
//       return matchesStatus && matchesSeverity && matchesSearch;
//     });

//   return (
//     <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: THEME.primary }}>
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-6 flex items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: THEME.text }}>
//               Rescue Dashboard
//             </h1>
//             <p className="text-sm" style={{ color: "#eaf7ff" }}>
//               Manage and respond to active rescue cases in your area
//             </p>
//           </div>

//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-2">
//               <Input
//                 placeholder="NGO id (dev)"
//                 value={editingNgoId}
//                 onChange={(e) => setEditingNgoId(e.target.value)}
//                 className="text-black"
//                 style={{ width: 220 }}
//               />
//               <Button onClick={saveNgoId}>Save</Button>
//               <Button variant="outline" onClick={clearNgoId}>Clear</Button>
//             </div>

//             <div className="ml-4">
//               <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
//             </div>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//           <Card style={{ background: "#eaf7ff" }}>
//             <CardContent className="pt-6">
//               <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.total}</div>
//               <p className="text-sm" style={{ color: THEME.primary }}>Total Cases</p>
//             </CardContent>
//           </Card>
//           <Card style={{ background: "#eaf7ff" }}>
//             <CardContent className="pt-6">
//               <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.new}</div>
//               <p className="text-sm" style={{ color: THEME.primary }}>New</p>
//             </CardContent>
//           </Card>
//           <Card style={{ background: "#eaf7ff" }}>
//             <CardContent className="pt-6">
//               <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.inProgress}</div>
//               <p className="text-sm" style={{ color: THEME.primary }}>In Progress</p>
//             </CardContent>
//           </Card>
//           <Card style={{ background: "#eaf7ff" }}>
//             <CardContent className="pt-6">
//               <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.resolved}</div>
//               <p className="text-sm" style={{ color: THEME.primary }}>Resolved</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Filters */}
//         <Card className="mb-6" style={{ background: "#eaf7ff" }}>
//           <CardContent className="pt-4">
//             <div className="flex flex-col md:flex-row gap-4 items-center">
//               <div className="flex-1 relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
//                 <Input
//                   placeholder="Search by location or title..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10 text-black"
//                 />
//               </div>

//               <Select value={filterStatus} onValueChange={setFilterStatus}>
//                 <SelectTrigger className="w-full md:w-48 text-black">
//                   <SelectValue placeholder="Status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Status</SelectItem>
//                   <SelectItem value="New">New</SelectItem>
//                   <SelectItem value="In Progress">In Progress</SelectItem>
//                   <SelectItem value="Resolved">Resolved</SelectItem>
//                 </SelectContent>
//               </Select>

//               <Select value={filterSeverity} onValueChange={setFilterSeverity}>
//                 <SelectTrigger className="w-full md:w-48 text-black">
//                   <SelectValue placeholder="Severity" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Severity</SelectItem>
//                   <SelectItem value="Low">Low</SelectItem>
//                   <SelectItem value="Medium">Medium</SelectItem>
//                   <SelectItem value="High">High</SelectItem>
//                   <SelectItem value="Critical">Critical</SelectItem>
//                 </SelectContent>
//               </Select>

//               <div className="flex gap-2">
//                 <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
//                   <List className="w-4 h-4" />
//                 </Button>
//                 <Button variant={viewMode === "map" ? "default" : "outline"} size="icon" onClick={() => setViewMode("map")}>
//                   <Map className="w-4 h-4" />
//                 </Button>
//                 <Button
//                   variant="outline"
//                   size="icon"
//                   onClick={() => {
//                     if (ngoId) fetchNearbyCases(ngoId);
//                     else toast.error("NGO id not set");
//                   }}
//                 >
//                   <RefreshCw className="w-4 h-4" />
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Content */}
//         {loading ? (
//           <div className="text-center py-12">
//             <p className="text-white">Loading nearby cases…</p>
//           </div>
//         ) : viewMode === "list" ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredRescues.length > 0 ? (
//               filteredRescues.map((rescue) => (
//                 <RescueCard key={rescue.id} rescue={rescue} onTakeAction={handleTakeAction} />
//               ))
//             ) : (
//               <div className="col-span-full">
//                 <Card style={{ background: "#eaf7ff" }}>
//                   <CardContent className="py-12 text-center ">
//                     <p style={{ color: THEME.primary }}>
//                       No rescue cases found nearby. Make sure your NGO location and service radius are set.
//                     </p>
//                   </CardContent>
//                 </Card>
//               </div>
//             )}
//           </div>
//         ) : (
//           <MapView rescues={filteredRescues} />
//         )}
//       </div>
//     </div>
//   );
// }