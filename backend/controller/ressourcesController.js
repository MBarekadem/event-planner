import Resource from "../model/ressources.js";
import Media from "../model/media_ressources.js";
import Dispo from "../model/disponibilite.js";
import User from "../model/user.js";

// ================= AJOUTER RESSOURCE =================
const addResource = async (req, res) => {
  try {
    const termsFile = req.files?.termsFile?.[0];
    const mediaFiles = req.files?.media || [];

    const pdfPath = termsFile ? termsFile.path : null;
    const mediaPaths = mediaFiles.map(f => f.path);

    const availabilityData = JSON.parse(req.body.availability || "[]");

    const dispoDocs = await Dispo.create(
      availabilityData.map(({ start, end, type }) => ({
        date_deb: new Date(start),
        date_fin: new Date(end),
        satut_disp: type === "available"
      }))
    );

    const mediaDoc = await Media.create({
      img_vd: mediaPaths
    });

    let resourceLocation = null;

    if (req.body.location) {
      const parsedLocation =
        typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location;

      if (
        parsedLocation?.coordinates &&
        parsedLocation.coordinates.length === 2
      ) {
        const [lng, lat] = parsedLocation.coordinates;
        resourceLocation = {
          type: "Point",
          coordinates: [lng, lat]
        };
      }
    }

    const locationName = req.body.locationname || "";

    const newResource = new Resource({
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      price: Number(req.body.price),
      location: resourceLocation,
      locationname: locationName,
      stock: req.body.stock ? Number(req.body.stock) : 1,
      category: req.body.categoryName,
      prestataire: req.user.id,
      attributes: JSON.parse(req.body.attributes || "{}"),
      customAttributes: JSON.parse(req.body.customAttributes || "[]"),
      availability: dispoDocs.map(d => d._id),
      media: [mediaDoc._id],
      terms: {
        text: req.body.terms || null,
        file: pdfPath || null
      }
    });

    await newResource.save();

    const populatedResource = await Resource.findById(newResource._id)
      .populate("prestataire", "firstname email")
      .populate("media")
      .populate("availability");

    res.status(201).json(populatedResource);

  } catch (err) {
    console.error("❌ ADD RESOURCE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ================= GET ALL =================
const getAllResources = async (req, res) => {
  try {
    let userLocation = null;
    let userLikes = [];

    if (req.user) {
      const user = await User.findById(req.user.id);

      if (user?.location?.coordinates?.length === 2) {
        userLocation = user.location.coordinates;
      }

      userLikes = user.adore?.map(id => id.toString()) || [];
    }

    let resources;

    if (userLocation) {
      resources = await Resource.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: userLocation
            },
            distanceField: "distance",
            spherical: true
          }
        }
      ]);
    } else {
      resources = await Resource.find();
    }

    resources = await Resource.populate(resources, [
      { path: "media" },
      { path: "availability" },
      { path: "prestataire" }
    ]);

    const scored = resources.map(r => {
      let score = 0;

      if (r.distance) {
        score += 1000 / (r.distance + 1);
      }

      if (userLikes.includes(r._id.toString())) {
        score += 50;
      }

      return { ...r._doc, score };
    });

    scored.sort((a, b) => b.score - a.score);

    res.status(200).json(scored);

  } catch (error) {
    console.error("❌ GET ALL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= GET BY ID =================
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("media")
      .populate("availability")
      .populate("prestataire");

    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    res.status(200).json(resource);

  } catch (error) {
    console.error("❌ GET BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= USER RESOURCES =================
const getResourcesByUser = async (req, res) => {
  try {
    const resources = await Resource.find({
      prestataire: req.user.id
    })
      .populate("media")
      .populate("availability");

    res.status(200).json(resources);

  } catch (error) {
    console.error("❌ USER RESOURCES ERROR:", error);
    res.status(500).json({
      message: "Erreur récupération ressources",
      error: error.message
    });
  }
};

// ================= UPDATE =================
const updateResource = async (req, res) => {
  try {
    if (req.user.role !== "prestataire") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    resource.name = req.body.name || resource.name;
    resource.description = req.body.description || resource.description;
    resource.type = req.body.type || resource.type;
    resource.price = req.body.price || resource.price;

    // ✅ MISE À JOUR DES MÉDIAS
    if (req.files && req.files.length > 0) {
      const newPaths = req.files.map(f => f.path);
      if (resource.media && resource.media.length > 0) {
        await Media.findByIdAndUpdate(resource.media[0], { img_vd: newPaths });
      } else {
        const mediaDoc = await Media.create({ img_vd: newPaths });
        resource.media = [mediaDoc._id];
      }
    }

    // 🔥 UPDATE LOCATION
    if (req.body.location) {
      const parsedLocation =
        typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location;

      if (parsedLocation?.coordinates?.length === 2) {
        const [lng, lat] = parsedLocation.coordinates;
        resource.location = {
          type: "Point",
          coordinates: [lng, lat]
        };
      }
    }

    if (req.body.locationname) {
      resource.locationname = req.body.locationname;
    }

    if (req.body.stock !== undefined) {
      resource.stock = Number(req.body.stock);
    }

    await resource.save();

    const populated = await Resource.findById(resource._id)
      .populate("media")
      .populate("availability")
      .populate("prestataire");

    res.status(200).json(populated);

  } catch (error) {
    console.error("❌ UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE =================
const deleteResource = async (req, res) => {
  try {
    if (req.user.role !== "prestataire") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Ressource supprimée" });

  } catch (error) {
    console.error("❌ DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  addResource,
  getAllResources,
  getResourceById,
  getResourcesByUser,
  updateResource,
  deleteResource
};