"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

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

export default function UserRegisterCleanPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (!getApps().length) initializeApp(FIREBASE_CONFIG);
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // initialize editable name field from Firebase displayName when available
      setName(u?.displayName || "");
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setStatusMsg("Signing in...");
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setStatusMsg(null);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setStatusMsg("Sign-in failed: " + (err?.message || err));
    }
  };

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    setStatusMsg("Signed out");
  };

  const handleEmailRegister = async () => {
    try {
      setStatusMsg("Creating account...");
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      setStatusMsg(null);
    } catch (err: any) {
      console.error("Signup error:", err);
      setStatusMsg("Signup failed: " + (err?.message || err));
    }
  };

  const handleEmailSignIn = async () => {
    try {
      setStatusMsg("Signing in...");
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      setStatusMsg(null);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setStatusMsg("Sign-in failed: " + (err?.message || err));
    }
  };

  const registerProfile = async () => {
    if (!user) {
      setStatusMsg("You must sign in first.");
      return;
    }
    if (!phone || !address) {
      setStatusMsg("Phone and address are required.");
      return;
    }

    setSubmitting(true);
    setStatusMsg("Sending profile to backend...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      console.log("Registering profile for user:", user.uid);
      const idToken = await user.getIdToken();

      const res = await fetch(`${BACKEND_API}/users/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          phone,
          address,
          name: name || user.displayName || "",
          email: user?.email || email || "",
          uid: user.uid,
          role: "user",
        }),
        signal: controller.signal,
      });
      console.log("Profile registration response status:", res.status);

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({ message: "no-json", status: res.status }));
      if (!res.ok) {
        console.error("Backend returned error:", res.status, data);
        setStatusMsg(
          `Failed to save profile (status ${res.status}). Server response: ${JSON.stringify(data)}`
        );
        return;
      }


      setStatusMsg("Profile saved: " + (data.message || JSON.stringify(data)));
      
      // Store user role in localStorage for immediate navbar update
      try {
        localStorage.setItem("userRole", "user");
      } catch (e) {}
      
      // Redirect to profile and reload to load new data
      setTimeout(() => {
        router.push("/profile");
      }, 500);
    } catch (err: any) {
      console.error("Register profile request failed:", err);
      if (err.name === "AbortError") {
        setStatusMsg("Request timed out. Backend did not respond in time.");
      } else {
        setStatusMsg(
          "Network or CORS error: could not reach backend. Make sure sam local is running and FrontendOrigin matches (http://localhost:3001). See backend logs."
        );
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
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
      <div style={{ width: "100%", maxWidth: 520, padding: 16 }}>
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
            }}>Create Account</h1>
            <p style={{ 
              marginTop: 8, 
              color: "#6b7280", 
              fontSize: 15,
              fontWeight: 400
            }}>Join Nivaran to help animals in need</p>
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
            <div>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                  margin: "0 auto 12px",
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
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>{user.email}</p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
                  <button onClick={handleSignOut} style={btnSecondaryStyle}>Sign Out</button>
                  <button onClick={showIdToken} style={btnOutlineStyle}>Show Token</button>
                </div>
              </div>

              <div style={{ 
                borderTop: "1px solid #e5e7eb", 
                paddingTop: 24,
                marginBottom: 24
              }}>
                <h3 style={{ 
                  margin: "0 0 20px 0", 
                  fontSize: 18, 
                  fontWeight: 700, 
                  color: "#111827",
                  letterSpacing: "-0.3px"
                }}>Complete Your Profile</h3>

                <label style={labelStyle}>Full Name</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  style={inputStyle} 
                  placeholder="Enter your full name" 
                />

                <label style={labelStyle}>Phone Number</label>
                <input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  style={inputStyle} 
                  placeholder="+1 (555) 000-0000" 
                />

                <label style={labelStyle}>Address</label>
                <textarea 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  style={{ ...textareaStyle }} 
                  placeholder="Enter your full address" 
                  rows={3}
                />

                <button 
                  onClick={registerProfile} 
                  style={btnPrimaryStyle} 
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Complete Registration"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  style={inputStyle} 
                  placeholder="you@example.com" 
                />

                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{ ...inputStyle, marginBottom: 0, paddingRight: 80 }} 
                    placeholder="Create a strong password" 
                  />
                  <button 
                    onClick={() => setShowPassword((s) => !s)} 
                    style={toggleBtnStyle}
                    aria-label="toggle password"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button 
                  onClick={handleEmailRegister} 
                  style={btnPrimaryStyle}
                >
                  Create Account
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 80,
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
  padding: "8px 16px",
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
  padding: "8px 16px",
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

const toggleBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "#f3f4f6",
  color: "#374151",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  transition: "all 0.2s ease",
  fontFamily: "inherit"
};
