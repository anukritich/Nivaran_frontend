import { Heart, Mail, Phone, MapPin } from "lucide-react";

// Theme colors
const THEME = {
  primary: "#19C2E6",
  accent: "#FED801",
  cta: "#FF5A1F",
};

export function Footer() {
  return (
    <footer style={{ background: THEME.primary }} className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: THEME.cta }}
              >
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-xl font-semibold" style={{ color: "#fff" }}>
                Nivaran
              </span>
            </div>
            <p className="mb-4" style={{ color: "#e0ecfa" }}>
              AI-powered rescue and welfare platform connecting citizens, NGOs, and
              volunteers to respond to emergencies involving stray animals and
              vulnerable beings.
            </p>
            <p className="text-sm" style={{ color: "#e0ecfa" }}>
              © 2025 Nivaran. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: THEME.accent }}>
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" style={{ color: "#e0ecfa" }} className="hover:text-yellow-300 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" style={{ color: "#e0ecfa" }} className="hover:text-yellow-300 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" style={{ color: "#e0ecfa" }} className="hover:text-yellow-300 transition-colors">
                  Join as NGO
                </a>
              </li>
              <li>
                <a href="#" style={{ color: "#e0ecfa" }} className="hover:text-yellow-300 transition-colors">
                  Volunteer
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: THEME.accent }}>
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center" style={{ color: "#e0ecfa" }}>
                <Mail className="w-5 h-5 mr-2" style={{ color: THEME.cta }} />
                <span>help@nivaran.org</span>
              </li>
              <li className="flex items-center" style={{ color: "#e0ecfa" }}>
                <Phone className="w-5 h-5 mr-2" style={{ color: THEME.cta }} />
                <span>+91 0123456789</span>
              </li>
              <li className="flex items-center" style={{ color: "#e0ecfa" }}>
                <MapPin className="w-5 h-5 mr-2" style={{ color: THEME.cta }} />
                <span>Dehradun, India</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}