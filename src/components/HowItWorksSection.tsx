import { motion } from "framer-motion";
import { MessageSquare, ClipboardList, Calendar, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Décrivez votre besoin",
    description: "Le patient explique son motif de consultation ou sa question via le chatbot.",
  },
  {
    icon: ClipboardList,
    number: "02",
    title: "Questions guidées",
    description: "Le système pose des questions : nom, téléphone, email, motif, degré d'urgence.",
  },
  {
    icon: Calendar,
    number: "03",
    title: "Créneaux disponibles",
    description: "Le système propose les créneaux disponibles adaptés à votre situation.",
  },
  {
    icon: CheckCircle2,
    number: "04",
    title: "Confirmation",
    description: "Le rendez-vous est confirmé et un récapitulatif vous est envoyé.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Comment ça <span className="text-gradient">fonctionne</span> ?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Un processus simple en 4 étapes pour obtenir votre rendez-vous.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-hero opacity-20" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-5 relative z-10">
                <step.icon size={28} className="text-primary-foreground" />
              </div>
              <div className="text-xs font-bold text-primary mb-2">ÉTAPE {step.number}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
