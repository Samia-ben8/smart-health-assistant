import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";

const contacts = [
  { icon: Phone, label: "Téléphone", value: "+213 XX XXX XXXX" },
  { icon: Mail, label: "Email", value: "contact@cabinetmed-ai.dz" },
  { icon: MapPin, label: "Adresse", value: "Alger, Algérie" },
];

const ContactSection = () => {
  return (
    <section id="contact" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Nous <span className="text-gradient">contacter</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Une question ? N'hésitez pas à nous joindre.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {contacts.map((contact, i) => (
            <motion.div
              key={contact.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                <contact.icon size={24} className="text-primary" />
              </div>
              <div className="text-sm text-muted-foreground mb-1">{contact.label}</div>
              <div className="font-semibold">{contact.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
