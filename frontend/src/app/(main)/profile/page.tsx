"use client"

import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  Heart,
  Award,
  Calendar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RescueCard, RescueCase } from "@/components/RescueCard";
import { toast } from "sonner";

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
  text: "#fff"
};
// color used for text displayed on white/light cards (dark for contrast)
const CONTENT_TEXT = "#042f3a";

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const router = useRouter();
  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API!;
  const FIREBASE_CONFIG = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
  };
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    joinedDate: "",
  });
  const [loading, setLoading] = useState(true);

  const stats = {
    rescues: 12,
    adoptions: 2,
    volunteering: "8 months",
    points: 450,
  };

  const achievements = [
    { icon: Heart, title: "Life Saver", description: "Rescued 10+ animals", earned: true, color: "text-red-500" },
    { icon: Award, title: "Early Responder", description: "First to respond 5 times", earned: true, color: "text-yellow-500" },
    { icon: Shield, title: "Guardian Angel", description: "Active volunteer for 6+ months", earned: true, color: "text-blue-500" },
    { icon: Calendar, title: "Consistent Helper", description: "Helped every week for a month", earned: false, color: "text-gray-400" },
  ];

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully!");
    setIsEditing(false);
  };

  // Fetch profile: prefer authenticated idToken, but if none and localStorage.email exists (dev),
  // send X-EMAIL header so backend in LOCAL_DEV mode can return profile.
  async function fetchProfileWithToken(idToken?: string, devEmail?: string, userId?: string) {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
        
        // In local development, also send X-UID and X-EMAIL headers for easier testing
        if (BACKEND_API && (BACKEND_API.includes('localhost') || BACKEND_API.includes('127.0.0.1'))) {
          if (userId) headers['X-UID'] = userId;
          if (devEmail) headers['X-EMAIL'] = devEmail;
        }
      } else if (devEmail && userId) {
        // Dev mode without auth token
        headers["X-EMAIL"] = devEmail;
        headers["X-UID"] = userId;
      }

      const res = await fetch(`${BACKEND_API}/users/profile`, { method: "GET", headers });
      if (!res.ok) {
        console.error("Failed fetching profile", res.status);
        return null;
      }
      const data = await res.json().catch(() => ({}));
      const p = data.profile || {};
      return {
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        address: p.address || p.location || "",
        bio: p.bio || "",
        joinedDate: p.joinedDate || ""
      };
    } catch (e) {
      console.error("Error fetching profile", e);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getApps().length) initializeApp(FIREBASE_CONFIG);
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // If a developer left an email and uid in localStorage, try to use them in LOCAL_DEV mode
        const devEmail = typeof window !== "undefined" ? localStorage.getItem("email") : null;
        const devUid = typeof window !== "undefined" ? localStorage.getItem("uid") : null;
        if (devEmail && devUid && BACKEND_API) {
          const profile = await fetchProfileWithToken(undefined, devEmail, devUid);
          if (profile) {
            setProfileData(profile);
            return;
          }
        }
        router.push("/login");
        return;
      }

      try {
        const idToken = await u.getIdToken();
        const profile = await fetchProfileWithToken(idToken, u.email || undefined, u.uid);
        if (profile) {
          setProfileData(profile);
          // ensure localStorage email and uid are set for easy reference elsewhere
          try { 
            localStorage.setItem("email", profile.email || u.email || "");
            localStorage.setItem("uid", u.uid);
          } catch (e) {}
        } else {
          // fallback: populate from firebase user fields
          setProfileData({
            name: u.displayName || "",
            email: u.email || "",
            phone: "",
            address: "",
            bio: "",
            joinedDate: ""
          });
        }
      } catch (e) {
        console.error("Error loading profile", e);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      console.error("Sign out failed", e);
    } finally {
      try {
        localStorage.removeItem("email");
        localStorage.removeItem("ngo_id");
      } catch (e) {}
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: THEME.primary }}>
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileData.name || "User")}`} />
                <AvatarFallback>{(profileData.name || "U").slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" style={{ color: CONTENT_TEXT }}>Name</Label>
                        <Input id="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                      </div>
                      <div className="space-y-2 ">
                        <Label htmlFor="email" style={{ color: CONTENT_TEXT }}>Email</Label>
                        <Input id="email" type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" style={{ color: CONTENT_TEXT }}>Phone</Label>
                        <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" style={{ color: CONTENT_TEXT }}>Address</Label>
                        <Input id="address" value={profileData.address} onChange={(e) => setProfileData({ ...profileData, address: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: CONTENT_TEXT }}>{profileData.name}</h2>
                    <p className="mb-4" style={{ color: CONTENT_TEXT }}>{profileData.bio}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center" style={{ color: CONTENT_TEXT }}>
                        <Mail className="w-4 h-4 mr-2" style={{ color: THEME.accent }} />
                        {profileData.email}
                      </div>

                      <div className="flex items-center" style={{ color: CONTENT_TEXT }}>
                        <Phone className="w-4 h-4 mr-2" style={{ color: THEME.accent }} />
                        {profileData.phone || "—"}
                      </div>

                      <div className="flex items-center" style={{ color: CONTENT_TEXT }}>
                        <MapPin className="w-4 h-4 mr-2" style={{ color: THEME.accent }} />
                        {profileData.address || "—"}
                      </div>

                      <div className="flex items-center" style={{ color: CONTENT_TEXT }}>
                        <Calendar className="w-4 h-4 mr-2" style={{ color: THEME.accent }} />
                        Joined {profileData.joinedDate || "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: THEME.cta }} />
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.rescues}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>Rescues</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6 text-center">
              {/* <User className="w-8 h-8 mx-auto mb-2" style={{ color: "#60C437" }} /> */}
              <div className="text-2xl font-bold" style={{ color: "#60C437" }}>{stats.adoptions}</div>
              <p className="text-sm" style={{ color: "#60C437" }}>Adoptions</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: THEME.primary }} />
              <div className="text-2xl font-bold" style={{ color: THEME.primary }}>{stats.volunteering}</div>
              <p className="text-sm" style={{ color: THEME.primary }}>Volunteering</p>
            </CardContent>
          </Card>
          <Card style={{ background: "#eaf7ff" }}>
            <CardContent className="pt-6 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: THEME.accent }} />
              <div className="text-2xl font-bold" style={{ color: THEME.accent }}>{stats.points}</div>
              <p className="text-sm" style={{ color: THEME.accent }}>Points</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: keep layout but show only profile-related info for now */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Profile</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold" style={{ color: THEME.primary }}>Your Details</h3>
                <p className="text-sm" style={{ color: THEME.primary }}>Loaded from the users table in DynamoDB</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: CONTENT_TEXT }}>Name</p>
                    <p style={{ color: CONTENT_TEXT }}>{profileData.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: CONTENT_TEXT }}>Email</p>
                    <p style={{ color: CONTENT_TEXT }}>{profileData.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: CONTENT_TEXT }}>Phone</p>
                    <p style={{ color: CONTENT_TEXT }}>{profileData.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: CONTENT_TEXT }}>Address</p>
                    <p style={{ color: CONTENT_TEXT }}>{profileData.address || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold" style={{ color: THEME.primary }}>Your Achievements</h3>
                <p className="text-sm" style={{ color: THEME.primary }}>Earn badges by helping animals and contributing to the community</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {achievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <Card key={achievement.title} style={{ background: "#eaf7ff", opacity: achievement.earned ? 1 : 0.5 }}>
                        <CardContent className="pt-6 text-center">
                          <Icon className={`w-12 h-12 mx-auto mb-3 ${achievement.color}`} />
                          <h4 className="font-semibold mb-1" style={{ color: THEME.primary }}>{achievement.title}</h4>
                          <p className="text-xs" style={{ color: THEME.primary }}>{achievement.description}</p>
                          {achievement.earned && <Badge className="mt-3" variant="secondary">Earned</Badge>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader><h3 className="text-xl font-semibold" style={{ color: THEME.primary }}>Privacy & Security</h3></CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">Change Password</Button>
                <Button variant="outline" className="w-full justify-start">Privacy Settings</Button>
                <Button variant="destructive" className="w-full justify-start" onClick={handleSignOut}>Sign out</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}