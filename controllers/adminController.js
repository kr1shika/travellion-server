const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateToken = (adminId) => {

    return jwt.sign(
        {
            id: adminId
        },
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};

// ============================================
// CREATE ADMIN
// ============================================

exports.createAdmin = async (req, res) => {
    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // ----------------------------------------
        // Validate required fields
        // ----------------------------------------

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    'Name, email and password are required'
            });
        }


        // ----------------------------------------
        // Check if admin already exists
        // ----------------------------------------

        const existingAdmin =
            await Admin.findOne({
                email: email.toLowerCase()
            });


        if (existingAdmin) {
            return res.status(409).json({
                success: false,
                message:
                    'An admin with this email already exists'
            });
        }


        // ----------------------------------------
        // Validate role
        // ----------------------------------------

        if (
            role &&
            !['Admin', 'SuperAdmin'].includes(role)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Role must be Admin or SuperAdmin'
            });
        }


        // ----------------------------------------
        // Create admin
        // ----------------------------------------

        const admin =
            await Admin.create({
                name,
                email: email.toLowerCase(),
                password,
                role: role || 'Admin'
            });


        // ----------------------------------------
        // Remove password from response
        // ----------------------------------------

        const adminResponse =
            admin.toObject();

        delete adminResponse.password;


        // ----------------------------------------
        // Response
        // ----------------------------------------

        res.status(201).json({

            success: true,

            data: adminResponse,

            message:
                'Admin created successfully'
        });


    } catch (error) {

        console.error(
            'Create admin error:',
            error
        );


        // Duplicate email
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    'An admin with this email already exists'
            });
        }


        // Validation error
        if (error.name === 'ValidationError') {

            const errors =
                Object.values(error.errors)
                    .map(error => error.message);

            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors
            });
        }


        res.status(500).json({
            success: false,
            message:
                'Failed to create admin'
        });
    }
};


// ============================================
// ADMIN LOGIN
// ============================================

exports.loginAdmin = async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;


        // ----------------------------------------
        // Validate
        // ----------------------------------------

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    'Email and password are required'
            });
        }


        // ----------------------------------------
        // Find admin
        // ----------------------------------------

        const admin =
            await Admin.findOne({
                email: email.toLowerCase()
            });


        if (!admin) {
            return res.status(401).json({
                success: false,
                message:
                    'Invalid email or password'
            });
        }


        // ----------------------------------------
        // Check active status
        // ----------------------------------------

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message:
                    'This admin account is inactive'
            });
        }


        // ----------------------------------------
        // Check password
        // ----------------------------------------

        const passwordMatch =
            await admin.comparePassword(
                password
            );


        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message:
                    'Invalid email or password'
            });
        }


        // ----------------------------------------
        // Update last login
        // ----------------------------------------

        admin.lastLogin = new Date();

        await admin.save();


        // ----------------------------------------
        // Generate JWT
        // ----------------------------------------

        const token =
            generateToken(admin._id);


        // ----------------------------------------
        // Remove password
        // ----------------------------------------

        const adminResponse =
            admin.toObject();

        delete adminResponse.password;


        // ----------------------------------------
        // Response
        // ----------------------------------------

        res.status(200).json({

            success: true,

            data: {
                admin: adminResponse,
                token
            },

            message:
                'Admin login successful'
        });


    } catch (error) {

        console.error(
            'Admin login error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Admin login failed'
        });
    }
};


// ============================================
// GET ALL ADMINS
// ============================================

exports.getAllAdmins = async (req, res) => {
    try {

        const admins =
            await Admin.find()
                .select('-password')
                .sort({
                    createdAt: -1
                });


        res.status(200).json({

            success: true,

            data: admins
        });


    } catch (error) {

        console.error(
            'Get admins error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch admins'
        });
    }
};


// ============================================
// GET SINGLE ADMIN
// ============================================

exports.getAdmin = async (req, res) => {
    try {

        const admin =
            await Admin.findById(
                req.params.id
            ).select('-password');


        if (!admin) {
            return res.status(404).json({
                success: false,
                message:
                    'Admin not found'
            });
        }


        res.status(200).json({

            success: true,

            data: admin
        });


    } catch (error) {

        console.error(
            'Get admin error:',
            error
        );


        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid admin ID'
            });
        }


        res.status(500).json({
            success: false,
            message:
                'Failed to fetch admin'
        });
    }
};


// ============================================
// UPDATE ADMIN
// ============================================

exports.updateAdmin = async (req, res) => {
    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // ----------------------------------------
        // Find admin
        // ----------------------------------------

        const admin =
            await Admin.findById(
                req.params.id
            );


        if (!admin) {
            return res.status(404).json({
                success: false,
                message:
                    'Admin not found'
            });
        }


        // ----------------------------------------
        // Update fields
        // ----------------------------------------

        if (name !== undefined) {
            admin.name = name;
        }


        if (email !== undefined) {

            const emailExists =
                await Admin.findOne({
                    email: email.toLowerCase(),
                    _id: {
                        $ne: req.params.id
                    }
                });


            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    message:
                        'Another admin already uses this email'
                });
            }


            admin.email =
                email.toLowerCase();
        }


        if (password !== undefined) {

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Password must be at least 6 characters'
                });
            }

            admin.password = password;
        }


        if (role !== undefined) {

            if (
                !['Admin', 'SuperAdmin']
                    .includes(role)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Role must be Admin or SuperAdmin'
                });
            }

            admin.role = role;
        }


        // ----------------------------------------
        // Save
        // ----------------------------------------

        await admin.save();


        // ----------------------------------------
        // Response
        // ----------------------------------------

        const adminResponse =
            admin.toObject();

        delete adminResponse.password;


        res.status(200).json({

            success: true,

            data: adminResponse,

            message:
                'Admin updated successfully'
        });


    } catch (error) {

        console.error(
            'Update admin error:',
            error
        );


        if (error.name === 'ValidationError') {

            const errors =
                Object.values(error.errors)
                    .map(error => error.message);

            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors
            });
        }


        res.status(500).json({
            success: false,
            message:
                'Failed to update admin'
        });
    }
};


// ============================================
// UPDATE ADMIN STATUS
// ============================================

exports.updateAdminStatus = async (req, res) => {
    try {

        const {
            isActive
        } = req.body;


        // ----------------------------------------
        // Validate
        // ----------------------------------------

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message:
                    'isActive must be true or false'
            });
        }


        // ----------------------------------------
        // Update
        // ----------------------------------------

        const admin =
            await Admin.findByIdAndUpdate(
                req.params.id,
                {
                    isActive
                },
                {
                    new: true,
                    runValidators: true
                }
            )
            .select('-password');


        if (!admin) {
            return res.status(404).json({
                success: false,
                message:
                    'Admin not found'
            });
        }


        // ----------------------------------------
        // Response
        // ----------------------------------------

        res.status(200).json({

            success: true,

            data: admin,

            message:
                isActive
                    ? 'Admin activated successfully'
                    : 'Admin deactivated successfully'
        });


    } catch (error) {

        console.error(
            'Update admin status error:',
            error
        );


        res.status(500).json({
            success: false,
            message:
                'Failed to update admin status'
        });
    }
};


// ============================================
// DELETE ADMIN
// ============================================

exports.deleteAdmin = async (req, res) => {
    try {

        // ----------------------------------------
        // Find admin
        // ----------------------------------------

        const admin =
            await Admin.findByIdAndDelete(
                req.params.id
            );


        if (!admin) {
            return res.status(404).json({
                success: false,
                message:
                    'Admin not found'
            });
        }


        res.status(200).json({

            success: true,

            message:
                'Admin deleted successfully'
        });


    } catch (error) {

        console.error(
            'Delete admin error:',
            error
        );


        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid admin ID'
            });
        }


        res.status(500).json({
            success: false,
            message:
                'Failed to delete admin'
        });
    }
};