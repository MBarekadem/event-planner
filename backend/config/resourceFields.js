export const resourceFields = {

    // 🏢 SALLE (service)
    salle: [
        { name: "capacity", type: "number", required: true },
        { name: "surface", type: "number" },
        { name: "location", type: "text", required: true },
        { name: "parking", type: "boolean" },
        { name: "wifi", type: "boolean" },
        { name: "climatisation", type: "boolean" },
        { name: "nombreChaises", type: "number" },
        { name: "nombreTables", type: "number" }
    ],

    // 🎤 MATERIEL (product/service)
    materiel: [
        { name: "quantite", type: "number", required: true },
        { name: "etat", type: "text" },                       // neuf, bon état
        { name: "couleur", type: "text" },
        { name: "matiere", type: "text" },
        { name: "dimensions", type: "text" }
    ],

    // 🎨 DECORATION (product)
    decoration: [
        { name: "type", type: "text" }, // naturel, artificiel
        { name: "couleur", type: "text" },
        { name: "quantite", type: "number" },
        { name: "matiere", type: "text" },


    ],

    // 🍽️ TRAITEUR (service)
    traiteur: [
        { name: "typeCuisine", type: "text", required: true }, // tunisien, italien...
        { name: "nombrePersonnes", type: "number", required: true },
        { name: "serveursInclus", type: "boolean" }
    ],
    dj: [
        { name: "styleMusique", type: "text", required: true },
        { name: "duree", type: "number" },
        { name: "materielInclus", type: "boolean" }
    ],

    photographe: [
        { name: "typePhoto", type: "text" },
        { name: "nombrePhotos", type: "number" },
        { name: "videoInclus", type: "boolean" }
    ],
    serveur: [
        { name: "nombreServeurs", type: "number", required: true },
        { name: "tenue", type: "text" }, // classique, moderne...
        { name: "experience", type: "number" }, // en années
        { name: "langues", type: "text" }
    ]

};