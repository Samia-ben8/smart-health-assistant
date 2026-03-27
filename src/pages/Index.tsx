import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection onOpenChat={() => setChatOpen(true)} />
      <AboutSection />
      <ServicesSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ContactSection />
      <Footer />
      <Chatbot isOpen={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
    </div>
  );
};

export default Index;
