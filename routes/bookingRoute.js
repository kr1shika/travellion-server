const express = require('express');

const router = express.Router();

const bookingController =
    require('../controllers/bookingController');

const {
    protect,
    adminOnly
} = require('../middleware/auth');
// ============================================
// BOOKINGS
// ============================================

// Create booking
router.post(
    '/',
    bookingController.createBooking
);

// Get all bookings
router.get(
    '/',
    protect,
    adminOnly,
    bookingController.getAllBookings
);

// Get customer's bookings
router.get(
    '/customer/:customerId',
    bookingController.getCustomerBookings
);

// Get single booking
router.get(
    '/:id',
    protect,
    adminOnly,
    bookingController.getBooking
);

// Update booking
router.put(
    '/:id',
    protect,
    adminOnly,
    bookingController.updateBooking
);

// Update booking status
router.patch(
    '/:id/status',
    protect,
    adminOnly,
    bookingController.updateBookingStatus
);

// Delete booking
router.delete(
    '/:id', protect,
    adminOnly,
    bookingController.deleteBooking
);


module.exports = router;