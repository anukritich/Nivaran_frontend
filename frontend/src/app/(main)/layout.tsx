import '@/styles/globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Nivaran',
  description: 'Your app description',
}

// This is your theme color. Use your Tailwind config or inline style.
const MAIN_BLUE = "#19C2E6";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: MAIN_BLUE, color: "#fff" }}>
        <Navbar />
        <main className="min-h-screen w-full">
          {children} {/* All pages render here */}
        </main>
        <Footer />
      </body>
    </html>
  )
}