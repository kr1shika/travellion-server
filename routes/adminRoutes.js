const express = require('express');

const router = express.Router();

const adminController =
    require('../controllers/adminController');

const {
    protect,
    adminOnly,
    superAdminOnly
} = require('../middleware/auth');

// ============================================
// LOGIN
// Public route
// ============================================

router.post(
    '/login',
    adminController.loginAdmin
);


// ============================================
// ADMIN MANAGEMENT
// ============================================

// Only SuperAdmin can create another admin
router.post(
    '/',
    // protect,
    // superAdminOnly,
    adminController.createAdmin
);


// Only authenticated admins can view admins
router.get(
    '/',
    protect,
    adminOnly,
    adminController.getAllAdmins
);


// Authenticated admins can view an admin
router.get(
    '/:id',
    protect,
    adminOnly,
    adminController.getAdmin
);


// Only SuperAdmin can update admin accounts
router.put(
    '/:id',
    // protect,
    // superAdminOnly,
    adminController.updateAdmin
);


// Only SuperAdmin can activate/deactivate
router.patch(
    '/:id/status',
    // protect,
    // superAdminOnly,
    adminController.updateAdminStatus
);


// Only SuperAdmin can delete
router.delete(
    '/:id',
    // protect,
    // superAdminOnly,
    adminController.deleteAdmin
);


module.exports = router;