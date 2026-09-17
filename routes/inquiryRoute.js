const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
// const { protectAdmin, protectCustomer } = require('../middleware/auth');

const {
    protect,
    adminOnly
} = require('../middleware/auth');
// Create inquiry - Anyone can submit
router.post('/', inquiryController.createInquiry);

// ============================================
// CUSTOMER ROUTES
// ============================================

// Get customer's own inquiries
router.get('/customer/:customerId', inquiryController.getCustomerInquiries);


// Get all inquiries with filters
router.get('/', protect,
    adminOnly, inquiryController.getAllInquiries);

// Get single inquiry
router.get('/:id', inquiryController.getInquiry);

// Update inquiry status
router.put('/:id/status', inquiryController.updateInquiryStatus);

// Respond to inquiry
router.put('/:id/respond', inquiryController.respondToInquiry);

// Delete inquiry
router.delete('/:id', protect,
    adminOnly, inquiryController.deleteInquiry);

// Get statistics
router.get('/stats/overview', inquiryController.getInquiryStats);

// Bulk update status
router.put('/bulk/status', inquiryController.bulkUpdateStatus);

module.exports = router;