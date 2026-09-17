const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');


// ============================================
// PROTECT ROUTES
// ============================================

exports.protect = async (req, res, next) => {
    try {

        // ----------------------------------------
        // Get Authorization header
        // ----------------------------------------

        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith('Bearer ')
        ) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }


        // ----------------------------------------
        // Extract token
        // ----------------------------------------

        const token =
            authHeader.split(' ')[1];


        // ----------------------------------------
        // Verify token
        // ----------------------------------------

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // ----------------------------------------
        // Find admin
        // ----------------------------------------

        const admin =
            await Admin.findById(
                decoded.id
            ).select('-password');


        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Admin account not found'
            });
        }


        // ----------------------------------------
        // Check active status
        // ----------------------------------------

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is inactive'
            });
        }


        // ----------------------------------------
        // Attach admin to request
        // ----------------------------------------

        req.admin = admin;

        next();

    } catch (error) {

        console.error(
            'Authentication error:',
            error
        );


        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }


        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }


        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};


// ============================================
// ADMIN ONLY
// ============================================

exports.adminOnly = (req, res, next) => {

    if (!req.admin) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }


    if (
        !['Admin', 'SuperAdmin']
            .includes(req.admin.role)
    ) {
        return res.status(403).json({
            success: false,
            message: 'Admin permission required'
        });
    }


    next();
};


// ============================================
// SUPER ADMIN ONLY
// ============================================

exports.superAdminOnly = (req, res, next) => {

    if (!req.admin) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }


    if (req.admin.role !== 'SuperAdmin') {
        return res.status(403).json({
            success: false,
            message:
                'SuperAdmin permission required'
        });
    }


    next();
};