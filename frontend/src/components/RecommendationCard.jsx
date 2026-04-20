import { MapPin, Users, Heart, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ResourceCard({ resource = {}, eventId, onBook, isLiked }) {
    const navigate = useNavigate();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [liked, setLiked] = useState(false);
    const [loadingLike, setLoadingLike] = useState(false);

    // ✅ Extraction sécurisée des images
    // Supporte plusieurs structures possibles de l'API :
    // 1. resource.media = [{ img_vd: ["url1", "url2"] }]
    // 2. resource.media = ["url1", "url2"]  (tableau de strings directement)
    // 3. resource.images = ["url1"]         (clé alternative)
    const extractImages = () => {
        if (!resource.media) return [];

        return resource.media.flatMap(m =>
            (m.img_vd || []).map(img =>
                img.startsWith("http")
                    ? img
                    : `http://localhost:5000/${img}`
            )
        );
    };
    const images = extractImages();
    const isAvailable = resource.availability?.length > 0;





    // ✅ Debug : affiche la structure reçue (à retirer en prod)
    useEffect(() => {
        console.log("ResourceCard — resource reçu :", resource);

    }, [resource]);

    // ✅ Initialiser le like depuis localStorage
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const adore = user?.adore || [];
        setLiked(adore.includes(resource._id));
    }, [resource._id]);

    // ✅ Sync avec prop isLiked si fournie
    useEffect(() => {
        if (isLiked !== undefined) setLiked(isLiked);
    }, [isLiked]);

    // ✅ Toggle Like
    const toggleLike = async (e) => {
        e.stopPropagation();
        if (loadingLike) return;

        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (!token || !user) {
            alert("Vous devez être connecté !");
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

            if (!res.ok) {
                if (data.message === "Déjà dans les favoris") {
                    setLiked(true);
                    return;
                }
                throw new Error(data.message);
            }

            const updatedAdore = liked
                ? (user.adore || []).filter(id => id !== resource._id)
                : [...(user.adore || []), resource._id];

            setLiked(!liked);
            localStorage.setItem("user", JSON.stringify({ ...user, adore: updatedAdore }));

        } catch (err) {
            console.error("Erreur like :", err);
            alert(err.message);
        } finally {
            setLoadingLike(false);
        }
    };

    // ✅ Animation carrousel au hover
    useEffect(() => {
        if (!isHovering || images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
        }, 700);
        return () => clearInterval(interval);
    }, [isHovering, images.length]);

    // ✅ Nom du prestataire — supporte plusieurs clés possibles
    const prestataireNom =
        resource.prestataire?.nomSociete ||
        "Inconnu";

    return (
        <div
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                setCurrentIndex(0);
            }}
            className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border cursor-pointer"
        >
            {/* Image */}
            <div className="relative h-52 overflow-hidden bg-gray-100">
                {images.length > 0 ? (
                    <img
                        src={images[currentIndex]}
                        alt={resource.name || "Ressource"}
                        className="w-full h-full object-cover transition-opacity duration-500"
                        onError={(e) => {
                            // Si l'image échoue à charger, on affiche un placeholder
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                        }}
                    />
                ) : null}

                {/* Placeholder si pas d'image ou erreur */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100"
                    style={{ display: images.length > 0 ? "none" : "flex" }}
                >
                    <ImageOff size={36} className="mb-2 text-gray-300" />
                    <span className="text-xs text-gray-400">Pas d'image</span>
                </div>

                {/* Indicateur de slides */}
                {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                            <span
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? "bg-white scale-125" : "bg-white/50"}`}
                            />
                        ))}
                    </div>
                )}

                {/* Bouton Like */}
                <div
                    onClick={toggleLike}
                    className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full cursor-pointer hover:scale-110 transition z-10"
                >
                    <Heart
                        size={18}
                        className={`transition-all ${liked ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                    />
                </div>

                {/* Badge indisponible */}
                {!isAvailable && (
                    <span className="absolute top-3 left-3 px-3 py-1 text-xs text-white bg-red-600 rounded-full z-10">
                        Indisponible
                    </span>
                )}
            </div>

            {/* Contenu */}
            <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-800 truncate">
                    {resource.name || "Sans nom"}
                </h3>

                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {resource.description || "Aucune description"}
                </p>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {resource.location && (
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-blue-500 shrink-0" />
                            <span className="truncate">{resource.locationname || "Chargement..."}</span>
                        </div>
                    )}
                    {resource.capacity && (
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-blue-500 shrink-0" />
                            {resource.capacity} personnes
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-6">
                    <p className="text-xl font-bold text-slate-800">
                        {resource.price != null ? `${resource.price.toFixed(2)} DT` : "—"}
                    </p>

                    <button
                        disabled={!isAvailable}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/RessourceDetail/${resource._id}`);
                        }}
                        className={`px-5 py-2 rounded-xl text-sm font-medium transition ${isAvailable
                            ? "bg-black text-white hover:bg-slate-800"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        Voir plus
                    </button>
                </div>

                <p className="text-xs mt-3 text-gray-400">
                    Proposé par <span className="font-medium text-gray-500">{prestataireNom}</span>
                </p>
            </div>
        </div>
    );
}