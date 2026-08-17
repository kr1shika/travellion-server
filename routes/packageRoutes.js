const express = require('express');
const router = express.Router();

const packageController = require('../controllers/packageController');


// ===============================
// PUBLIC ROUTES
// ===============================

router.get(
    '/',
    packageController.getAllPackages
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


// ===============================
// ADMIN ROUTES
// ===============================

router.post(
    '/',
    packageController.createPackage
);

router.put(
    '/:id',
    packageController.updatePackage
);

router.delete(
    '/:id',
    packageController.deletePackage
);


module.exports = router;