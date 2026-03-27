import { motion } from "framer-motion";
import { BrainCircuit, ShieldCheck, Zap, Mic } from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Conversation intelligente",
    description: "Notre IA comprend le langage naturel et s'adapte à chaque patient.",
  },
  {
    icon: ShieldCheck,
    title: "Aucun double réservation",
    description: "Le système vérifie en temps réel la disponibilité des créneaux.",
  },
  {
    icon: Zap,
    title: "Réponse instantanée",
    description: "Obtenez une réponse en moins de 2 secondes, à toute heure.",
  },
  {
    icon: Mic,
    title: "Voix et texte",
    description: "Interagissez par message texte ou par commande vocale.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Fonctionnalités <span className="text-gradient">avancées</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Une technologie de pointe au service de votre santé.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-11 h-11 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                <feature.icon size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
