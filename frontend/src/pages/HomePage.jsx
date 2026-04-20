import { Calendar, Clock, Shield, Sparkles, ChevronRight, MapPinned, Mail, Phone, ChevronDown, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import about from "../assets/about.png";
import mariageImg from "../assets/mariage.jpg";
import conferenceImg from "../assets/conference.jpg";
import anniversaireImg from "../assets/anniversaire.jpg";
import seminaireImg from "../assets/seminaire.jpg";
import reunionImg from "../assets/reunion.jpg";
import festivalImg from "../assets/festival.jpg";
import Footer from "../components/footer";
import DomeGallery from "../components/DomeGallery";
import Navbar from "../components/Navbar"; 
import axios from "axios";

const events = [
  { title: "Mariage", image: mariageImg, category: "Célébration" },
  { title: "Conférence", image: conferenceImg, category: "Professionnel" },
  { title: "Anniversaire", image: anniversaireImg, category: "Privé" },
  { title: "Séminaire", image: seminaireImg, category: "Formation" },
  { title: "Réunion d'entreprise", image: reunionImg, category: "Corporate" },
  { title: "Festival", image: festivalImg, category: "Culturel" },
];

const slides = [
  { image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200" },
  { image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200" },
  { image: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1200" },
  { image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200" },
];

const faqData = [
  { question: "Comment créer un événement sur YallaEvents ?", answer: "C'est simple ! Cliquez sur 'Créer un événement', remplissez les informations de base (type d'événement, date, lieu), et notre système vous guidera pas à pas pour ajouter les détails et ressources nécessaires." },
  { question: "Les paiements sont-ils sécurisés ?", answer: "Absolument ! Nous utilisons un système de paiement crypté de niveau bancaire. Toutes vos transactions sont protégées et nous ne stockons jamais vos informations de paiement sensibles." },
  { question: "Comment devenir prestataire partenaire ?", answer: "Pour devenir prestataire, cliquez sur 'Devenir prestataire' dans la section CTA. Vous devrez créer un compte professionnel et fournir vos informations d'identification. Notre équipe validera votre profil sous 48h." },
  { question: "Puis-je modifier mon événement après l'avoir créé ?", answer: "Oui, vous pouvez modifier les détails de votre événement à tout moment depuis votre tableau de bord. Les prestataires seront automatiquement notifiés des changements importants." },
  { question: "Quels types d'événements puis-je organiser ?", answer: "Notre plateforme supporte tous types d'événements : mariages, conférences, séminaires, anniversaires, réunions d'entreprise, festivals, et bien plus encore !" },
  { question: "Y a-t-il des frais d'utilisation ?", answer: "L'inscription est gratuite ! Nous proposons différents forfaits selon vos besoins. Le forfait de base est gratuit avec des fonctionnalités essentielles, et nos forfaits premium offrent des options avancées." },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [formStatus, setFormStatus] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus("sending");
    try {
      await axios.post("http://localhost:5000/api/send-mail", formData);
      setFormStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      setFormStatus("error");
    }
    setTimeout(() => setFormStatus(""), 3000);
  };

  const features = [
    { icon: Calendar, title: "Réservation intelligente", description: "Réservez vos salles, traiteurs et décorateurs en un clic grâce à notre système intuitif.", color: "from-blue-500 to-cyan-500" },
    { icon: Sparkles, title: "Recommandation AI", description: "Notre IA vous suggère les meilleures ressources selon votre budget et localisation.", color: "from-purple-500 to-pink-500" },
    { icon: Clock, title: "Agenda interactif", description: "Visualisez les disponibilités en temps réel et évitez les conflits de planning.", color: "from-orange-500 to-red-500" },
    { icon: Shield, title: "Paiement sécurisé", description: "Transactions 100% sécurisées avec protection des données et confirmation instantanée.", color: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans antialiased">

      {/* ── Navbar partagé ─────────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              initial={{
                x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
              }}
              animate={{
                x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
                scale: [0, 1, 0],
                opacity: [0, 0.5, 0],
              }}
              transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
        <motion.div
          animate={{ background: ["radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%)", "radial-gradient(circle at 80% 50%, rgba(168,85,247,0.15) 0%, transparent 50%)", "radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%)"] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0"
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-center lg:text-left">
              {user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border mb-8 ${isAdmin ? "bg-red-500/20 border-red-400/30" : "bg-white/10 border-white/20"}`}
                >
                  {isAdmin ? <Shield className="w-4 h-4 text-red-300" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
                  <span className="text-sm font-medium text-white">
                    {isAdmin ? "Bienvenue, Administrateur " : `Bienvenue, ${user.firstname} 👋`}
                  </span>
                </motion.div>
              )}

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="block">Planifiez vos</motion.span>
                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Événements</motion.span>
                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }} className="block">en toute simplicité</motion.span>
              </h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.2 }} className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto lg:mx-0">
                {!user && "Créez, gérez et organisez des événements mémorables avec notre plateforme intelligente."}
                {isAdmin && "Gérez la plateforme, les utilisateurs, les ressources et les documents depuis votre panel."}
                {role === "organisateur" && "Accédez à toutes les ressources nécessaires pour organiser vos événements."}
                {role === "prestataire" && "Publiez vos services et gérez vos réservations facilement."}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.4 }} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {!user && (<>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/signup")} className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">Commencer maintenant <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600" initial={{ x: "100%" }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/login")} className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all">Se connecter</motion.button>
                </>)}
                {isAdmin && (<>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard-admin")} className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"><Shield className="w-5 h-5" /> Panel Administrateur</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/les_ressources")} className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all">🔍 Voir la plateforme</motion.button>
                </>)}
                {role === "organisateur" && (<>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/les_ressources")} className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-all">Explorer</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/CreerEvenement")} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg">Créer votre événement</motion.button>
                </>)}
                {role === "prestataire" && (<>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/les_ressources")} className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-all">Explorer</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/add-resource")} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg">+ Publier une ressource</motion.button>
                </>)}
              </motion.div>
            </motion.div>

            {/* Slideshow */}
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="relative hidden lg:block">
              <div className="relative h-[600px]">
                <AnimatePresence mode="wait">
                  <motion.div key={currentSlide} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5 }} className="absolute inset-0">
                    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
                      <img src={slides[currentSlide].image} alt="Event" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                  {slides.map((_, index) => (
                    <motion.button key={index} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setCurrentSlide(index)} className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentSlide ? "w-8 bg-white" : "bg-white/50 hover:bg-white/80"}`} />
                  ))}
                </div>
              </div>
              <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/30 rounded-full blur-2xl" />
              <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 bg-white rounded-full mt-2" />
          </div>
        </motion.div>
      </section>

      {/* ── À propos ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              À propos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">YallaEvents</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Une plateforme intelligente qui révolutionne l'organisation d'événements</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="space-y-6">
                <p className="text-lg text-gray-600 leading-relaxed">Smart YallaEvents est une application web intelligente conçue pour simplifier et moderniser l'organisation des événements. Elle offre une plateforme centralisée permettant aux organisateurs de planifier efficacement leurs projets tout en collaborant avec des prestataires qualifiés.</p>
                <p className="text-lg text-gray-600 leading-relaxed">Grâce à une gestion des disponibilités en temps réel et une interface intuitive, notre solution réduit les conflits, optimise les ressources et améliore l'expérience utilisateur.</p>
                <div className="flex gap-4 pt-4">
                  {["Innovation", "Fiabilité", "Simplicité"].map((tag, i) => (
                    <span key={i} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl transform rotate-3 scale-105 opacity-10" />
              <img src={about} alt="Smart YallaEvents" className="relative rounded-3xl shadow-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pourquoi choisir <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">EventPlanner ?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Des fonctionnalités puissantes pour une organisation sans stress</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -5 }} className="group">
                <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Événements ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Types <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">d'Événements</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Explorez les différents types d'événements que vous pouvez organiser</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -10 }} className="group relative h-80 rounded-3xl overflow-hidden shadow-xl cursor-pointer">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-sm rounded-full mb-2">{item.category}</span>
                  <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
          {role === "organisateur" && (
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/CreerEvenement")} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                Créer votre événement
              </motion.button>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Dome Gallery ───────────────────────────────────────────────────── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Ressources</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Découvrez notre sélection de ressources pour tous vos événements</p>
          </motion.div>
        </div>
        <div style={{ width: "100vw", height: "80vh" }}>
          <DomeGallery fit={0.8} minRadius={600} maxVerticalRotationDeg={0} segments={34} dragDampening={2} grayscale={false} />
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      {!user && (
        <section className="py-24 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="relative max-w-5xl mx-auto text-center text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Prêt à commencer ?</h2>
              <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">Rejoignez des centaines d'organisateurs et prestataires satisfaits</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/signup")} className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all">Devenir organisateur</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/signup")} className="px-8 py-4 bg-blue-700 text-white rounded-xl font-semibold text-lg backdrop-blur-md border border-white/20 hover:bg-blue-800 transition-all">Devenir prestataire</motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Questions <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Fréquentes</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Tout ce que vous devez savoir sur Smart YallaEvents</p>
          </motion.div>
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                <button onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} className="w-full px-6 py-4 flex items-center justify-between text-left">
                  <span className="font-semibold text-gray-900 text-lg">{faq.question}</span>
                  <motion.div animate={{ rotate: openFaqIndex === index ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="px-6 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Contactez-<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Nous</span>
            </h2>
            <p className="text-xl text-gray-600">Une question ? Notre équipe est là pour vous répondre</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-3xl shadow-xl p-10 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nom complet" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Sujet" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              <textarea name="message" value={formData.message} onChange={handleInputChange} rows="5" placeholder="Votre message..." required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={formStatus === "sending"} className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition">
                {formStatus === "sending" ? "Envoi en cours..." : formStatus === "success" ? "✓ Message envoyé !" : "Envoyer le message"}
              </motion.button>
              <div className="pt-6 border-t border-gray-100">
                <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                  <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-xl hover:shadow-md transition">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <a href="mailto:contact@smarteventplanner.com" className="text-gray-700 font-medium hover:text-blue-600">contact@smarteventplanner.com</a>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-xl hover:shadow-md transition">
                    <Phone className="w-5 h-5 text-purple-600" />
                    <a href="tel:+21654809630" className="text-gray-700 font-medium hover:text-purple-600">+216 54 809 630</a>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-xl hover:shadow-md transition">
                    <MapPinned className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700 font-medium">Sousse, Tunisie</span>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}