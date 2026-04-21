import { MapPin, Users, Heart, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ResourceCard({ resource = {}, eventId, onBook, isLiked, onLikeUpdate, toast }) {
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);

  // ✅ Extraction des images
  const extractImages = () => {
    const media = resource.media;
    if (!media || media.length === 0) {
      return (resource.images || []).map(img =>
        img?.startsWith("http") ? img : `http://localhost:5000/${img}`
      );
    }
    if (typeof media[0] === "object" && media[0]?.img_vd) {
      return media.flatMap(m =>
        (m.img_vd || []).map(img =>
          img?.startsWith("http") ? img : `http://localhost:5000/${img}`
        )
      );
    }
    if (typeof media[0] === "string") {
      return media.map(img =>
        img?.startsWith("http") ? img : `http://localhost:5000/${img}`
      );
    }
    return [];
  };

  const images = extractImages();
  const isAvailable = resource.availability?.length > 0;

  // ✅ Init like
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const adore = user?.adore || [];
    setLiked(adore.includes(resource._id));
  }, [resource._id]);

  useEffect(() => {
    if (isLiked !== undefined) setLiked(isLiked);
  }, [isLiked]);

  // ✅ Toggle like — plus d'alert(), on utilise toast
  const toggleLike = async (e) => {
    e.stopPropagation();
    if (loadingLike) return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user) {
      // ✅ Toast au lieu de alert()
      toast?.info(
        "Connectez-vous pour ajouter des ressources à vos favoris",
        "Connexion requise 🔒"
      );
      return;
    }

    setLoadingLike(true);

    try {
      const url = liked
        ? "http://localhost:5000/api/users/remove"
        : "http://localhost:5000/api/users/like";

      const res = await fetch(url, {
        method: liked ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resourceId: resource._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const updatedAdore = liked
        ? (user.adore || []).filter(id => id !== resource._id)
        : [...(user.adore || []), resource._id];

      setLiked(!liked);
      localStorage.setItem("user", JSON.stringify({ ...user, adore: updatedAdore }));

      // ✅ Toast succès like/unlike
      if (!liked) {
        toast?.success(
          `"${resource.name}" ajouté à vos favoris`,
          "Favori ajouté ❤️"
        );
      } else {
        toast?.warning(
          `"${resource.name}" retiré de vos favoris`,
          "Favori retiré"
        );
      }

      if (onLikeUpdate) onLikeUpdate(resource._id, !liked);

    } catch (err) {
      console.error("Erreur like :", err);
      toast?.error(
        err.message || "Une erreur est survenue, réessayez.",
        "Erreur"
      );
    } finally {
      setLoadingLike(false);
    }
  };

  // ✅ Carrousel auto au survol
  useEffect(() => {
    if (!isHovering || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    }, 700);
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  const prestataireNom =
    resource.prestataire?.lastname ||
    resource.prestataire?.name ||
    resource.provider_name ||
    resource.provider?.name ||
    "Inconnu";

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setCurrentIndex(0); }}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {images.length > 0 ? (
          <img
            src={images[currentIndex]}
            alt={resource.name || "Ressource"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <ImageOff size={36} />
            <span className="text-xs">Pas d'image</span>
          </div>
        )}

        {/* Bouton like */}
        <div
          onClick={toggleLike}
          className={`absolute top-3 right-3 bg-white/80 p-2 rounded-full cursor-pointer transition-transform duration-200
            ${loadingLike ? "opacity-50 scale-90" : "hover:scale-110"}`}
        >
          <Heart
            size={18}
            className={liked
              ? "fill-red-500 text-red-500 transition-all"
              : "text-gray-600 transition-all"}
          />
        </div>

        {/* Indicateur chargement like */}
        {loadingLike && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 border-red-300 border-t-red-500 animate-spin" />
        )}
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="text-lg font-semibold truncate">
          {resource.name || "Sans nom"}
        </h3>

        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {resource.description || "Aucune description"}
        </p>

        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {resource.location && (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" />
              <span>{resource.locationname || "Inconnue"}</span>
            </div>
          )}
          {resource.capacity && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              {resource.capacity} personnes
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <p className="text-xl font-bold">
            {resource.price != null ? `${resource.price.toFixed(2)} DT` : "—"}
          </p>
          <button
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/RessourceDetail/${resource._id}`);
            }}
            className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            Voir plus
          </button>
        </div>

        <p className="text-xs mt-3 text-gray-400">
          Proposé par <span className="font-medium text-gray-600">{prestataireNom}</span>
        </p>
      </div>
    </div>
  );
}