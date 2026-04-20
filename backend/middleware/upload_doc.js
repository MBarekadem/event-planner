import multer from "multer";
import path from "path";

// Configuration stockage local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // dossier uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Filtrer type fichier
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb("Fichier non supporté (pdf, jpg, png uniquement)");
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter,
});

export default upload;