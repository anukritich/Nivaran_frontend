"use client";
import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult,
  User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* Hardcoded Firebase config for dev only */
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API!;

const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
  text: "#fff",
};

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (!getApps().length) initializeApp(FIREBASE_CONFIG);
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingAuth(false);
      // If user is present, determine role, store to localStorage and redirect appropriately
      if (u) {
        await determineAndRedirectAndStore(u);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function determineRole(u: User): Promise<"ngo" | "user" | "unknown"> {
    // 1) custom claims
    try {
      const idTokenRes = await getIdTokenResult(u);
      const claimRole = idTokenRes?.claims?.role;
      if (claimRole === "ngo") return "ngo";
      if (claimRole === "user") return "user";
    } catch (e) {
      // ignore and fallback
    }

    // 2) backend user profile (user-table)
    try {
      const idToken = await u.getIdToken();
      const res = await fetch(`${BACKEND_API}/users/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const prof = data.profile || {};
        if (prof.role === "ngo") return "ngo";
        // treat presence in users table as user
        if (prof.email) return "user";
      }
    } catch (e) {
      // ignore
    }

    // 3) backend NGO list lookup (ngo-table) - fallback: match by email
    try {
      const email = (u && u.email) || "";
      if (email) {
        // call /ngos (existing endpoint) and match locally
        const ngosResp = await fetch(`${BACKEND_API}/ngos`, { method: "GET" });
        if (ngosResp.ok) {
          const ngos = await ngosResp.json().catch(() => []);
          if (Array.isArray(ngos)) {
            const match = ngos.find((n: any) => String(n.email || "").toLowerCase() === email.toLowerCase());
            if (match) return "ngo";
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return "unknown";
  }

  // Helper: store email (always) and if NGO also fetch & store ngo_id
  async function storeIdentityInLocalStorage(u: User, role: "ngo" | "user" | "unknown") {
    try {
      if (typeof window === "undefined") return;
      const email = u.email || "";
      if (email) {
        localStorage.setItem("email", email);
      }
      // default: remove any previous ngo_id
      localStorage.removeItem("ngo_id");

      if (role === "ngo") {
        // Try to find ngo_id via backend /ngos endpoint (match by email)
        try {
          const ngosResp = await fetch(`${BACKEND_API}/ngos`, { method: "GET" });
          if (ngosResp.ok) {
            const ngos = await ngosResp.json().catch(() => []);
            if (Array.isArray(ngos)) {
              const match = ngos.find((n: any) => String(n.email || "").toLowerCase() === email.toLowerCase());
              if (match && match.ngo_id) {
                localStorage.setItem("ngo_id", String(match.ngo_id));
              }
            }
          }
        } catch (e) {
          // ignore - storing email is enough if ngo_id lookup fails
        }
      }
    } catch (e) {
      // ignore storage errors (e.g. private mode)
    }
  }

  async function determineAndRedirectAndStore(u: User) {
    try {
      const role = await determineRole(u);
      await storeIdentityInLocalStorage(u, role);
      if (role === "ngo") {
        router.push("/dashboard");
        return;
      }
      // if user or unknown, go to profile page (default)
      router.push("/profile");
    } catch (e) {
      // on error, store email only and fallback to profile
      try { localStorage.setItem("email", u.email || ""); } catch (e) {}
      router.push("/profile");
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setStatusMsg("Signing in...");
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      // If user returned from signInWithPopup, redirect based on role immediately and store identity
      if (credential && credential.user) {
        await determineAndRedirectAndStore(credential.user);
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setStatusMsg("Sign-in failed: " + (err?.message || err));
    } finally {
      setStatusMsg(null);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      setStatusMsg("Signing in...");
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      if (cred && cred.user) {
        await determineAndRedirectAndStore(cred.user);
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setStatusMsg("Sign-in failed: " + (err?.message || err));
    } finally {
      setStatusMsg(null);
    }
  };

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    // clear localStorage identity keys
    try {
      localStorage.removeItem("email");
      localStorage.removeItem("ngo_id");
    } catch (e) {
      // ignore
    }
    setStatusMsg("Signed out");
    // onAuthStateChanged will update UI; navigate to login
    router.push("/login");
  };

  const showIdToken = async () => {
    if (!user) {
      setStatusMsg("Not signed in");
      return;
    }
    const idToken = await user.getIdToken();
    setStatusMsg("ID token (truncated): " + idToken.slice(0, 80) + "...");
  };

  if (!mounted) return <div />;

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: `linear-gradient(135deg, ${THEME.primary} 0%, #0EA5C9 100%)`,
      padding: 24, 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    }}>
      <div style={{ width: "100%", maxWidth: 440, padding: 16 }}>
        <div style={{ 
          background: "#fff", 
          borderRadius: 16, 
          padding: 48, 
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)" 
        }}>
          <header style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{ 
              margin: 0, 
              color: "#111827", 
              fontSize: 28, 
              fontWeight: 700,
              letterSpacing: "-0.5px"
            }}>Welcome Back</h1>
            <p style={{ 
              marginTop: 8, 
              color: "#6b7280", 
              fontSize: 15,
              fontWeight: 400
            }}>Sign in to your Nivaran account</p>
          </header>

          {loadingAuth ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ 
                display: "inline-block",
                width: 40,
                height: 40,
                border: "3px solid #f3f4f6",
                borderTopColor: THEME.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
              <p style={{ color: "#6b7280", marginTop: 16, fontSize: 14 }}>Loading...</p>
              <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
            </div>
          ) : user ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "#fff",
                fontWeight: 600
              }}>
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                {user.displayName || "User"}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>{user.email}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: "center", flexDirection: "column" }}>
                <button onClick={handleSignOut} style={btnSecondaryStyle}>Sign Out</button>
                <button onClick={showIdToken} style={btnOutlineStyle}>Show Token</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email"
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  style={inputStyle} 
                  placeholder="you@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSignIn()}
                />

                <label style={labelStyle}>Password</label>
                <input 
                  type="password" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  style={inputStyle} 
                  placeholder="Enter your password"
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSignIn()}
                />

                <button 
                  onClick={handleEmailSignIn} 
                  style={btnPrimaryStyle} 
                  disabled={submitting}
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </button>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                margin: "24px 0",
                gap: 12
              }}>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              </div>

              <button onClick={handleGoogleSignIn} style={googleBtnStyle}>
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 12 }}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <p style={{ 
                marginTop: 28, 
                textAlign: "center", 
                color: "#6b7280",
                fontSize: 14
              }}>
                Don't have an account?{" "}
                <Link href="/register" style={{ 
                  color: THEME.primary, 
                  fontWeight: 600, 
                  textDecoration: "none",
                  transition: "color 0.2s"
                }}>
                  Sign up
                </Link>
              </p>
            </div>
          )}

          {statusMsg && (
            <div style={{ 
              marginTop: 20, 
              padding: 14, 
              background: "#f9fafb",
              border: "1px solid #e5e7eb", 
              borderRadius: 10, 
              color: "#374151",
              fontSize: 14
            }}>
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* inline styles */
const inputStyle: React.CSSProperties = { 
  width: "100%", 
  padding: "12px 16px", 
  borderRadius: 10, 
  border: "2px solid #e5e7eb", 
  boxSizing: "border-box", 
  marginBottom: 16, 
  fontSize: 15,
  color: "#111827",
  transition: "border-color 0.2s, box-shadow 0.2s",
  outline: "none",
  fontFamily: "inherit"
};

const labelStyle: React.CSSProperties = { 
  display: "block", 
  marginBottom: 8, 
  fontWeight: 600, 
  color: "#374151",
  fontSize: 14,
  letterSpacing: "0.2px"
};

const btnPrimaryStyle: React.CSSProperties = { 
  width: "100%",
  padding: "13px 24px", 
  borderRadius: 10, 
  border: "none", 
  background: THEME.primary,
  color: "#fff", 
  cursor: "pointer", 
  fontSize: 15,
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(25, 194, 230, 0.3)",
  transition: "all 0.2s ease",
  fontFamily: "inherit"
};

const googleBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 24px",
  borderRadius: 10,
  border: "2px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  fontFamily: "inherit"
};

const btnSecondaryStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: THEME.cta,
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s ease",
  fontFamily: "inherit"
};

const btnOutlineStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 20px",
  borderRadius: 10,
  border: "2px solid #e5e7eb",
  background: "transparent",
  color: "#374151",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s ease",
  fontFamily: "inherit"
};