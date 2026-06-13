import multer from "multer";

const storage = multer.diskStorage({
    destination: './public/temp',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

export default upload;

