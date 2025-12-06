"use client";

import { Heart, Shield, MapPin, Users, ArrowRight, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const theme = {
    primary: "#19C2E6",    // Blue
    accent: "#FED801",     // Yellow
    cta: "#FF5A1F",        // Orange
    text: "#fff",
    muted: "#eaf7ff"
  };
   const handleNavigate = (page: string) => {
    router.push(`/${page}`);
  };

  const highlights = [
    {
      icon: Zap,
      title: "AI Detection",
      description: "Advanced AI-powered image recognition to identify animal species, injuries, and urgency levels automatically.",
      color: theme.accent,
      iconColor: theme.cta,
    },
    {
      icon: MapPin,
      title: "Nearby Help",
      description: "Real-time location mapping connects you with the closest NGOs, volunteers, and rescue services instantly.",
      color: theme.accent,
      iconColor: theme.primary,
    },
    {
      icon: Shield,
      title: "Verified NGOs",
      description: "Partner with trusted, verified animal welfare organizations and experienced volunteers nationwide.",
      color: "#60C437",
      iconColor: "#fff",
    },
  ];

  const stats = [
    { value: "2,500+", label: "Animals Rescued" },
    { value: "150+", label: "NGO Partners" },
    { value: "5,000+", label: "Active Volunteers" },
    { value: "98%", label: "Success Rate" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: theme.primary }}>
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 w-full" style={{ background: theme.primary }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div
                className="inline-flex items-center px-4 py-2 rounded-full"
                style={{
                  background: theme.accent,
                  color: theme.primary,
                  fontWeight: 600
                }}
              >
                <Heart className="w-4 h-4 mr-2" fill={theme.primary} />
                <span className="text-sm font-semibold">AI-Powered Rescue Platform</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                style={{ color: theme.text }}
              >
                Rescue. Connect. Care.
              </h1>
              <p className="text-xl mb-2" style={{ color: theme.muted }}>
                Join thousands of compassionate citizens, NGOs, and volunteers in saving
                lives. Report emergencies, adopt animals, and make a real difference in
                your community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="text-lg px-8"
                  style={{
                    background: theme.cta,
                    color: theme.text,
                    fontWeight: 600,
                    borderRadius: "1.5rem"
                  }}
                  onClick={() => handleNavigate("report")}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Report Rescue
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8"
                  style={{
                    background: theme.text,
                    color: theme.primary,
                    fontWeight: 600,
                    borderRadius: "1.5rem",
                    border: "none"
                  }}
                  onClick={() => handleNavigate("adoption")}
                >
                  Adopt Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
            <div className="relative flex justify-center">
             <div
              className="overflow-hidden shadow-2xl flex items-center justify-center rounded-[60%_40%_70%_30%_/_30%_60%_40%_70%]"
              style={{
                border: `5px solid ${theme.accent}`,
                width: "600px",
                height: "380px",
                background: theme.accent,
              }}
            >
                <img
                  src="/landing-page-dog.png"
                  alt="Animal rescue hero"
                  style={{
                    width: "600px",
                    height: "400px",
                    objectFit: "cover",
                    borderRadius: "5%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12" style={{ background: "#FED801" }}>
        {/* Changed from bg-primary to a yellow background (#FED801) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "#FF5A1F" }}>
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base" style={{ color: "#19C2E6" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 w-full" style={{ background: theme.primary }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: theme.accent }}>
              How Nivaran Makes a Difference
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: theme.muted }}>
              Leveraging cutting-edge technology to create a seamless rescue ecosystem
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <Card key={highlight.title} className="border-2 hover:border-orange-400 transition-colors bg-white">
                  <CardHeader>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: highlight.color + "22" }}
                    >
                      <Icon className="w-6 h-6" style={{ color: highlight.iconColor }} />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ color: theme.primary }}>{highlight.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">{highlight.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 w-full" style={{ background: theme.cta }}>
        <div className="max-w-4xl mx-auto text-center w-full">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join our community of compassionate volunteers and help save lives today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8"
              style={{
                backgroundColor: theme.primary,
                color: "#fff",
                fontWeight: 600,
                borderRadius: "999px",
              }}
              onClick={() => handleNavigate("volunteer")}
            >
              <Users className="w-5 h-5 mr-2" />
              Join as Volunteer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white"
              style={{
                background: "#fff",
                color: theme.cta,
                fontWeight: 600,
                borderRadius: "999px",
                borderColor: "#fff"
              }}
              onClick={() => handleNavigate("dashboard")}
            >
              View Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 w-full" style={{ background: theme.primary }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: theme.accent }}>
              Simple, Fast, Effective
            </h2>
            <p className="text-xl" style={{ color: theme.muted }}>
              Three easy steps to help save a life
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Report",
                description: "Take a photo and share the location of an animal in need",
              },
              {
                step: "2",
                title: "AI Analysis",
                description: "Our AI detects species, injuries, and notifies nearby helpers",
              },
              {
                step: "3",
                title: "Rescue",
                description: "Verified volunteers and NGOs respond and provide care",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
                  style={{ background: theme.accent, color: theme.primary }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: "#fff" }}>{item.title}</h3>
                <p style={{ color: theme.muted }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}