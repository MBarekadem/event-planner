import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "patente") {
      cb(null, "uploads/patentes/");
    } else if (file.fieldname === "termsFile") {
      cb(null, "uploads/contracts/");
    }


    else {
      cb(null, "uploads/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "image") {
    const allowed = /jpg|jpeg|png|webp/;
    return allowed.test(file.mimetype) ? cb(null, true) : cb("Images seulement !");
  }


  if (file.fieldname === "patente") {
    const allowed = /jpg|jpeg|png|webp|pdf/;
    return allowed.test(file.mimetype) ? cb(null, true) : cb("PDF ou image seulement !");
  }
  if (file.fieldname === "termsFile") {
    const allowed = /pdf/;
    return allowed.test(file.mimetype)
      ? cb(null, true)
      : cb("Seulement PDF pour le contrat !");
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter
});

export default upload;