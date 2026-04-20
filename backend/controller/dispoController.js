import Dispo from "../model/disponibilite.js";

// CREATE
export const createDispo = async (req, res) => {
    try {
        const { date_deb, date_fin, satut_disp } = req.body;

        const newDispo = new Dispo({ date_deb, date_fin, satut_disp });
        await newDispo.save();

        res.status(201).json(newDispo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET ALL
export const getAllDispo = async (req, res) => {
    try {
        const dispos = await Dispo.find();
        res.status(200).json(dispos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET BY ID
export const getDispoById = async (req, res) => {
    try {
        const dispo = await Dispo.findById(req.params.id);

        if (!dispo) {
            return res.status(404).json({ message: "Disponibilité non trouvée" });
        }

        res.status(200).json(dispo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE
export const updateDispo = async (req, res) => {
    try {
        const dispo = await Dispo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!dispo) {
            return res.status(404).json({ message: "Disponibilité non trouvée" });
        }

        res.status(200).json(dispo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE
export const deleteDispo = async (req, res) => {
    try {
        const dispo = await Dispo.findByIdAndDelete(req.params.id);

        if (!dispo) {
            return res.status(404).json({ message: "Disponibilité non trouvée" });
        }

        res.status(200).json({ message: "Disponibilité supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};