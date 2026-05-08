import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "patente") {
      cb(null, "uploads/patentes/");
    } else if (file.fieldname === "termsFile") {
      cb(null, "uploads/contracts/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  console.log("📁 fieldname:", file.fieldname);
  console.log("📁 mimetype reçu:", file.mimetype);
  if (file.fieldname === "image") {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/octet-stream"  // ← Flutter web
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type non supporté: ${file.mimetype}`), false);
    }
    return;
  }
  if (file.fieldname === "patente") {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("PDF ou image seulement !"), false);
    }
    return;
  }

  if (file.fieldname === "termsFile") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seulement PDF pour le contrat !"), false);
    }
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter
});

export default upload;