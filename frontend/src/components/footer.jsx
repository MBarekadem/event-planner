import React from "react";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Mail, Phone } from "lucide-react";

const Footer = () => {

  /* Animation apparition */
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  const socialIcons = [Facebook, Instagram, Twitter];
  const links = ["Accueil", "Services", "Ressources", "Contact"];

  return (
    <footer className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-300 pt-20 pb-10 overflow-hidden">

      {/* Background animated glow */}
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute w-96 h-96 bg-blue-500/20 blur-3xl rounded-full -top-40 -left-40"
      />
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute w-96 h-96 bg-purple-500/20 blur-3xl rounded-full -bottom-40 -right-40"
      />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12"
      >

        {/* Logo / Description */}
        <motion.div variants={fadeUp} custom={1}>
          <h2 className="text-2xl font-bold text-white mb-4">
            YallaEvents
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Organisez vos événements facilement grâce à une plateforme moderne,
            intelligente et sécurisée.
          </p>
        </motion.div>

        {/* Liens rapides */}
        <motion.div variants={fadeUp} custom={2}>
          <h3 className="text-white font-semibold mb-4">
            Liens rapides
          </h3>

          <ul className="space-y-3 text-sm">
            {links.map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  className="relative group inline-block hover:text-white transition duration-300"
                >
                  {item}
                  <span className="absolute left-0 -bottom-1 w-0 h-[1px] bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div variants={fadeUp} custom={3}>
          <h3 className="text-white font-semibold mb-4">
            Contact
          </h3>

          <div className="space-y-4 text-sm">

            <div className="flex items-center gap-3 hover:text-white transition duration-300">
              <Mail size={18} className="text-blue-400" />
              <span>contact@smartevent.com</span>
            </div>

            <div className="flex items-center gap-3 hover:text-white transition duration-300">
              <Phone size={18} className="text-blue-400" />
              <span>+216 54809630</span>
            </div>

          </div>

          {/* Social Media */}
          <div className="flex gap-4 mt-6">
            {socialIcons.map((Icon, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.2, rotate: 8 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-gray-800 rounded-full cursor-pointer
                           hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/40
                           transition duration-300"
              >
                <Icon size={18} />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="border-t border-gray-700 mt-16 pt-6 text-center text-sm text-gray-500 relative"
      >
        © {new Date().getFullYear()} YallaEvents . Tous droits réservés.
      </motion.div>

    </footer>
  );
};

export default Footer;