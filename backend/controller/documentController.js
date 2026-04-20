import Document from "../model/documents.js";

/* ================= CREATE DOCUMENT ================= */
export const createDocument = async (req, res) => {
    try {
        const { documentType, resource } = req.body;

        const userId = req.user.id; // via auth middleware

        // Génération automatique du titre
        const generatedTitle = `${documentType}_${userId}`;

        const newDocument = new Document({
            user: userId,
            resource: documentType === "Contract" ? resource : [],
            documentType,
            title: generatedTitle,
            fileUrl: req.file?.path || req.body.fileUrl // si multer ou cloud
        });

        await newDocument.save();

        res.status(201).json({
            success: true,
            message: "Document créé avec succès",
            data: newDocument
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/* ================= GET USER DOCUMENTS ================= */
export const getUserDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ user: req.user.id }).populate("user")
            .populate("resource");

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/* ================= GET SINGLE DOCUMENT ================= */
export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id).populate("user")
            .populate("resource");

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            data: document
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


/*================= DELETE DOCUMENT =================*/
export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document non trouvé"
            });
        }

        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: "Document supprimé avec succès"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/* ================= GET ALL DOCUMENTS (ADMIN) ================= */
export const getAllDocuments = async (req, res) => {
    try {
        const documents = await Document.find()
            .populate("user", "firstname lastname email role")
            .populate("resource")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
