const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { upload } = require('../config/cloudinary');
// const { protectAdmin } = require('../middleware/auth');

// ============================================
// UPLOAD ROUTES
// ============================================

// Upload single image
router.post(
    '/upload',
    upload.single('image'),
    imageController.uploadImage
);

// Upload multiple images
router.post(
    '/upload-multiple',
    upload.array('images', 5),
    imageController.uploadMultipleImages
);

// ============================================
// GET ROUTES
// ============================================

// Get all images for a package
router.get('/package/:packageId', imageController.getImagesByPackage);

// Get featured image for a package
router.get('/package/:packageId/featured', imageController.getFeaturedImage);

// Get single image
router.get('/:id', imageController.getImage);

// ============================================
// UPDATE ROUTES
// ============================================

// Update image details
router.put('/:id', imageController.updateImage);

// Set featured image
router.put('/:id/featured', imageController.setFeaturedImage);

// Reorder images
router.put('/package/:packageId/reorder', imageController.reorderImages);

// ============================================
// DELETE ROUTES
// ============================================

// Delete single image
router.delete('/:id', imageController.deleteImage);

// Delete all images for a package
router.delete('/package/:packageId/all', imageController.deletePackageImages);

module.exports = router;