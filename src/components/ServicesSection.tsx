import { motion } from "framer-motion";
import { CalendarCheck, Bot, AlertTriangle, Pencil, Headphones } from "lucide-react";

const services = [
  {
    icon: CalendarCheck,
    title: "Prise de rendez-vous automatique",
    description: "Réservez un créneau en quelques messages, sans appel téléphonique.",
  },
  {
    icon: Bot,
    title: "Assistance par chatbot",
    description: "Un assistant intelligent répond à vos questions médicales courantes.",
  },
  {
    icon: AlertTriangle,
    title: "Priorisation des urgences",
    description: "Le système détecte les cas urgents et les oriente rapidement.",
  },
  {
    icon: Pencil,
    title: "Modification de rendez-vous",
    description: "Modifiez ou annulez votre rendez-vous facilement via le chat.",
  },
  {
    icon: Headphones,
    title: "Disponibilité 24h/24",
    description: "Accédez au service par chat ou téléphone à tout moment.",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Nos <span className="text-gradient">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Des services pensés pour simplifier votre parcours de soins.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 border border-border/50"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                <service.icon size={20} className="text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
