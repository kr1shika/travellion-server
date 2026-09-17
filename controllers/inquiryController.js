const Inquiry = require('../models/inquiry');
const Customer = require('../models/customer');

// ============================================
// CREATE INQUIRY
// ============================================
exports.createInquiry = async (req, res) => {
    try {
        const { name, email, phone, subject, message, customerId } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'name, email, subject and message are required'
            });
        }

        // If customerId is provided, check if customer exists
        if (customerId) {
            const customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
        }

        const inquiry = await Inquiry.create({
            customerId: customerId || null,
            name,
            email,
            phone,
            subject,
            message,
            status: 'New'
        });

        res.status(201).json({
            success: true,
            data: inquiry,
            message: 'Inquiry submitted successfully'
        });

    } catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET ALL INQUIRIES
// ============================================
exports.getAllInquiries = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const inquiries = await Inquiry.find(query)
            .populate('customerId', 'name email phone')
            .populate('respondedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Inquiry.countDocuments(query);

        res.status(200).json({
            success: true,
            count: inquiries.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: inquiries
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET SINGLE INQUIRY
// ============================================
exports.getInquiry = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id)
            .populate('customerId', 'name email phone')
            .populate('respondedBy', 'name email');

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            data: inquiry
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET CUSTOMER INQUIRIES
// ============================================
exports.getCustomerInquiries = async (req, res) => {
    try {
        const inquiries = await Inquiry.find({
            customerId: req.params.customerId
        })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: inquiries.length,
            data: inquiries
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE INQUIRY STATUS
// ============================================
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed: New, In Progress, Resolved, Closed'
            });
        }

        const inquiry = await Inquiry.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true
            }
        )
            .populate('customerId', 'name email')
            .populate('respondedBy', 'name email');

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            data: inquiry,
            message: 'Inquiry status updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// RESPOND TO INQUIRY
// ============================================
exports.respondToInquiry = async (req, res) => {
    try {
        const { response } = req.body;
        const adminId = req.admin ? req.admin.id : null; // Assuming admin auth middleware adds req.admin

        if (!response) {
            return res.status(400).json({
                success: false,
                message: 'Response message is required'
            });
        }

        const inquiry = await Inquiry.findByIdAndUpdate(
            req.params.id,
            {
                response,
                respondedBy: adminId,
                respondedAt: new Date(),
                status: 'Resolved'
            },
            {
                new: true,
                runValidators: true
            }
        )
            .populate('customerId', 'name email phone')
            .populate('respondedBy', 'name email');

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            data: inquiry,
            message: 'Response sent successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// DELETE INQUIRY
// ============================================
exports.deleteInquiry = async (req, res) => {
    try {
        const inquiry = await Inquiry.findByIdAndDelete(req.params.id);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Inquiry deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET INQUIRY STATISTICS
// ============================================
exports.getInquiryStats = async (req, res) => {
    try {
        const total = await Inquiry.countDocuments();

        const statusStats = await Inquiry.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayInquiries = await Inquiry.countDocuments({
            createdAt: { $gte: today }
        });

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekInquiries = await Inquiry.countDocuments({
            createdAt: { $gte: weekAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                today: todayInquiries,
                last7Days: weekInquiries,
                byStatus: statusStats
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// BULK UPDATE STATUS
// ============================================
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { inquiryIds, status } = req.body;

        if (!inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'inquiryIds array is required'
            });
        }

        const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const result = await Inquiry.updateMany(
            { _id: { $in: inquiryIds } },
            { status }
        );

        res.status(200).json({
            success: true,
            data: result,
            message: `${result.modifiedCount} inquiries updated successfully`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};