const express = require('express');

const router = express.Router();

const packageController =
    require('../controllers/packageController');

const {
    protect,
    adminOnly
} = require('../middleware/auth');

const {
    upload
} = require('../config/cloudinary');


// ============================================
// PUBLIC ROUTES
// ============================================

router.get(
    '/',
    packageController.getAllPackages
);

router.get(
    '/admin/all',
    protect,
    adminOnly,
    packageController.getAdminPackages
);

router.get(
    '/featured',
    packageController.getFeaturedPackages
);

router.get(
    '/popular',
    packageController.getPopularPackages
);

router.get(
    '/:packageId/availability/:date',
    packageController.checkAvailability
);

router.get(
    '/:id',
    packageController.getPackage
);


// ============================================
// ADMIN ROUTES
// ============================================

// Create package + images
router.post(
    '/',
    protect,
    adminOnly,
    upload.array('images', 10),
    packageController.createPackage
);


router.put(
    '/:id',
    protect,
    adminOnly,
    packageController.updatePackage
);


router.delete(
    '/:id',
    protect,
    adminOnly,
    packageController.deletePackage
);


module.exports = router;