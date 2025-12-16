const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const verifyToken = require('../../middleware/verifyJwt');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, `${timestamp}-${safeOriginalName}`);
    }
});

function fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'));
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

// POST /api/upload (auth required)
router.post('/upload', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    return res.status(201).json({
        message: 'Upload successful',
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: filePath
    });
});

module.exports = router; 