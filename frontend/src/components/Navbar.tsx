"use client";
import { Menu, X, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, getIdTokenResult, signOut } from "firebase/auth";

// Theme colors
const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
};

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const FIREBASE_CONFIG = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    };

    if (!getApps().length) {
      try {
        initializeApp(FIREBASE_CONFIG);
      } catch (e) {
        // ignore
      }
    }

    try {
      const auth = getAuth();
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setLoggedIn(false);
          setRole(null);
          // Clear role from localStorage when user logs out
          try {
            localStorage.removeItem("userRole");
          } catch (e) {}
          return;
        }

        setLoggedIn(true);

        // Check localStorage first for cached role
        try {
          const cachedRole = localStorage.getItem("userRole");
          if (cachedRole) {
            setRole(cachedRole);
          }
        } catch (e) {}

        // Fetch role from backend (nivaran-user-table via get_profile)
        if (BACKEND_API) {
          try {
            const idToken = await u.getIdToken();
            const userResp = await fetch(`${BACKEND_API}/users/profile`, {
              method: "GET",
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (userResp.ok) {
              const data = await userResp.json().catch(() => ({}));
              const prof = data.profile || {};
              const userRole = prof.role || 'user'; // default to 'user' if no role
              console.log('Fetched role from backend:', userRole);
              setRole(userRole);
              // Cache role in localStorage
              try {
                localStorage.setItem("userRole", userRole);
              } catch (e) {}
              return;
            } else {
              console.warn('Failed to fetch profile, status:', userResp.status);
            }
          } catch (e) {
            console.error('Error fetching profile:', e);
          }
        }

        // Default to user if backend fetch fails (but keep cached role if available)
        const cachedRole = localStorage.getItem("userRole");
        if (!cachedRole) {
          setRole("user");
        }
      });
      return () => unsub();
    } catch (e) {
      // firebase not configured
      console.error('Firebase error:', e);
      setLoggedIn(false);
      setRole(null);
    }
  }, [BACKEND_API]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Report Rescue", path: "/report" },
    { name: "Adopt", path: "/adoption" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Profile", path: "/profile" },
    { name: "Register", path: "/register" },
    { name: "Login", path: "/login" },
  ];

  // Check if user is on registration pages to show appropriate navbar
  const isOnNgoRegister = pathname === "/ngo-register";
  const isOnUserRegister = pathname === "/user-register";
  
  const visibleNavLinks = navLinks.filter((link) => {
    // If on NGO registration page, show NGO navbar even before login completes
    if (isOnNgoRegister) {
      if (link.name === "Login" || link.name === "Register") return false;
      return ["Home", "Report Rescue", "Dashboard"].includes(link.name);
    }
    
    // If on User registration page, show User navbar even before login completes
    if (isOnUserRegister) {
      if (link.name === "Login" || link.name === "Register") return false;
      return ["Home", "Report Rescue", "Adopt", "Profile"].includes(link.name);
    }
    
    if (!loggedIn) {
      // anonymous: only show Home, Report Rescue, Login
      return ["Home", "Report Rescue", "Login"].includes(link.name);
    }

    // logged in: hide Login and Register always
    if (link.name === "Login" || link.name === "Register") return false;

    // NGO role: Home, Report Rescue, Dashboard (no Adopt, no Profile)
    if (role === "ngo") {
      return ["Home", "Report Rescue", "Dashboard"].includes(link.name);
    }

    // User role: Home, Report Rescue, Adopt, Profile (no Dashboard)
    if (role === "user") {
      return ["Home", "Report Rescue", "Adopt", "Profile"].includes(link.name);
    }

    // fallback minimal (if role is still loading or unknown)
    return ["Home", "Report Rescue"].includes(link.name);
  });

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      // ignore
    } finally {
      // clear only our identity keys
      try {
        localStorage.removeItem("email");
        localStorage.removeItem("ngo_id");
        localStorage.removeItem("userRole");
      } catch (e) {}
      setLoggedIn(false);
      setRole(null);
      router.push('/login');
    }
  };

  return (
    <nav style={{ background: THEME.primary }} className="border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-accent transition-colors"
              style={{ background: THEME.cta }}
            >
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <span className="text-xl font-semibold" style={{ color: "#fff" }}>
              Nivaran
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`px-4 py-2 rounded-lg transition-colors ${isActive(link.path) ? "font-bold" : "hover:bg-yellow-300"}`}
                style={{
                  color: isActive(link.path) ? THEME.cta : "#fff",
                  background: isActive(link.path) ? THEME.accent : "transparent",
                  fontWeight: isActive(link.path) ? 700 : 400,
                }}
              >
                {link.name}
              </Link>
            ))}

            {loggedIn && (
              <button
                onClick={handleSignOut}
                className="ml-3 px-3 py-2 rounded-lg font-medium"
                style={{ background: THEME.accent, color: "#000" }}
              >
                Sign out
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg" style={{ background: THEME.accent }} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6 text-[#FF5A1F]" /> : <Menu className="w-6 h-6 text-[#FF5A1F]" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border" style={{ background: THEME.primary }}>
            <div className="flex flex-col space-y-2">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-left transition-colors ${isActive(link.path) ? "font-bold" : "hover:bg-yellow-300"}`}
                  style={{
                    color: isActive(link.path) ? THEME.cta : "#fff",
                    background: isActive(link.path) ? THEME.accent : "transparent",
                    fontWeight: isActive(link.path) ? 700 : 400,
                  }}
                >
                  {link.name}
                </Link>
              ))}

              {loggedIn && (
                <button onClick={() => { setIsMenuOpen(false); handleSignOut(); }} className="px-4 py-3 rounded-lg text-left" style={{ background: THEME.accent, color: "#000" }}>
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}