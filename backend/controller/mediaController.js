import Media from "../model/media_ressources.js";

// CREATE
export const createMedia = async (req, res) => {
    try {
        const newMedia = await Media.create(req.body);
        res.status(201).json(newMedia);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET ALL
export const getAllMedia = async (req, res) => {
    try {
        const medias = await Media.find();
        res.status(200).json(medias);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET BY ID
export const getMediaById = async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);

        if (!media) {
            return res.status(404).json({ message: "Media non trouvé" });
        }

        res.status(200).json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE
export const updateMedia = async (req, res) => {
    try {
        const updatedMedia = await Media.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedMedia) {
            return res.status(404).json({ message: "Media non trouvé" });
        }

        res.status(200).json(updatedMedia);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE
export const deleteMedia = async (req, res) => {
    try {
        const deletedMedia = await Media.findByIdAndDelete(req.params.id);

        if (!deletedMedia) {
            return res.status(404).json({ message: "Media non trouvé" });
        }

        res.status(200).json({ message: "Media supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};