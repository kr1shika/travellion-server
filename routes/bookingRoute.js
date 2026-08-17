const express = require('express');

const router = express.Router();

const bookingController =
    require('../controllers/bookingController');

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
    bookingController.getBooking
);

// Update booking
router.put(
    '/:id',
    bookingController.updateBooking
);

// Update booking status
router.patch(
    '/:id/status',
    bookingController.updateBookingStatus
);

// Delete booking
router.delete(
    '/:id',
    bookingController.deleteBooking
);


module.exports = router;