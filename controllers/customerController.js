const Customer = require('../models/Customer');


// ============================================
// CREATE CUSTOMER
// ============================================

exports.createCustomer = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            country
        } = req.body;

        // Required fields
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and phone are required'
            });
        }

        // Check existing customer
        const existingCustomer =
            await Customer.findOne({ email });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message:
                    'Customer with this email already exists'
            });
        }

        // Create customer
        const customer = await Customer.create({
            name,
            email,
            phone,
            address,
            country
        });

        res.status(201).json({
            success: true,
            data: customer,
            message: 'Customer created successfully'
        });

    } catch (error) {

        console.error(
            'Create customer error:',
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================
// GET ALL CUSTOMERS
// ============================================

exports.getAllCustomers = async (req, res) => {
    try {

        const customers =
            await Customer.find()
                .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: customers
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================
// GET SINGLE CUSTOMER
// ============================================

exports.getCustomer = async (req, res) => {
    try {

        const customer =
            await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================
// UPDATE CUSTOMER
// ============================================

exports.updateCustomer = async (req, res) => {
    try {

        const customer =
            await Customer.findByIdAndUpdate(
                req.params.id,
                req.body,
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer,
            message:
                'Customer updated successfully'
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================
// DELETE CUSTOMER
// ============================================

exports.deleteCustomer = async (req, res) => {
    try {

        const customer =
            await Customer.findByIdAndDelete(
                req.params.id
            );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            message:
                'Customer deleted successfully'
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};