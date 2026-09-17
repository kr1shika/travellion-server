const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Package = require('../models/package');

// ============================================
// CREATE BOOKING
// ============================================

exports.createBooking = async (req, res) => {
    try {
        const {
            customerId,
            packageId,
            travelDate,
            numberOfPeople,
            specialRequests,
            paymentMethod
        } = req.body;
        // Validate required fields
        if (!customerId || !packageId || !travelDate || !numberOfPeople) {
            return res.status(400).json({
                success: false,
                message: 'customerId, packageId, travelDate and numberOfPeople are required'
            });
        }
        // Check customer
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Check package
        const packageData = await Package.findById(packageId);
        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Check package status
        if (packageData.status !== 'Published') {
            return res.status(400).json({
                success: false,
                message: 'This package is not currently available for booking'
            });
        }

        // Calculate total price
        const totalAmount = packageData.price.usd * Number(numberOfPeople);
        // Create booking - using correct field names
        const booking = await Booking.create({
            customerId,           // Matches schema
            packageId,            // Matches schema
            travelDate,           // Matches schema
            numberOfPeople,       // Matches schema
            totalAmount,
            specialRequests,
            paymentStatus: 'Pending',
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            data: booking,
            message: 'Booking created successfully'
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET ALL BOOKINGS
// ============================================

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('customerId', 'name email phone country')  // Use customerId
            .populate('packageId', 'name price duration')        // Use packageId
            .populate('managedBy', 'name email')                 // For admin
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET SINGLE BOOKING
// ============================================

exports.getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('customerId', 'name email phone address country')
            .populate('packageId', 'name slug price duration country region')
            .populate('managedBy', 'name email');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET CUSTOMER BOOKINGS
// ============================================

exports.getCustomerBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({
            customerId: req.params.customerId
        })
            .populate('packageId', 'name price duration images')
            .populate('managedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE BOOKING
// ============================================

exports.updateBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )
            .populate('customerId', 'name email')
            .populate('packageId', 'name');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: booking,
            message: 'Booking updated successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE BOOKING STATUS
// ============================================

exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            'Pending',
            'Confirmed',
            'Cancelled',
            'Completed'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking status'
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true
            }
        )
            .populate('customerId', 'name email')
            .populate('packageId', 'name');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: booking,
            message: 'Booking status updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE PAYMENT STATUS
// ============================================

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        const allowedStatuses = [
            'Pending',
            'Paid',
            'Partially Paid',
            'Refunded'
        ];

        if (!allowedStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { paymentStatus },
            {
                new: true,
                runValidators: true
            }
        )
            .populate('customerId', 'name email')
            .populate('packageId', 'name');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: booking,
            message: 'Payment status updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// DELETE BOOKING
// ============================================

exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET BOOKINGS BY DATE RANGE
// ============================================

exports.getBookingsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }

        const bookings = await Booking.find({
            travelDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        })
            .populate('customerId', 'name email phone')
            .populate('packageId', 'name price')
            .sort({ travelDate: 1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET BOOKING STATISTICS
// ============================================

exports.getBookingStats = async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();
        const totalRevenue = await Booking.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const statusStats = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const monthlyStats = await Booking.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalBookings,
                totalRevenue: totalRevenue[0]?.total || 0,
                statusStats,
                monthlyStats
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};