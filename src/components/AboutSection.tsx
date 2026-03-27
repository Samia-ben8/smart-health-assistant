import { motion } from "framer-motion";
import { Shield, Clock, Heart } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Temps d'attente réduit",
    description: "Notre système intelligent gère les rendez-vous automatiquement, éliminant les files d'attente téléphoniques.",
  },
  {
    icon: Shield,
    title: "Disponibilité permanente",
    description: "Accédez à l'assistance médicale à tout moment, même en dehors des heures d'ouverture du cabinet.",
  },
  {
    icon: Heart,
    title: "Expérience patient améliorée",
    description: "Un parcours simplifié et personnalisé pour chaque patient, du premier contact au suivi.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Un cabinet médical <span className="text-gradient">nouvelle génération</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Nous utilisons l'intelligence artificielle pour transformer l'expérience patient
            et rendre les soins de santé plus accessibles et efficaces.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-background rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
