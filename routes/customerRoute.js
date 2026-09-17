const express = require('express');

const router = express.Router();

const customerController =
    require('../controllers/customerController');


const {
    protect,
    adminOnly
} = require('../middleware/auth');
// Create customer
router.post(
    '/',
    customerController.createCustomer
);

// Get all customers
router.get(
    '/',
    protect,
    adminOnly,
    customerController.getAllCustomers
);

// Get single customer
router.get(
    '/:id',
    customerController.getCustomer
);

// Update customer
router.put(
    '/:id',
    customerController.updateCustomer
);

// Delete customer
router.delete(
    '/:id',
    customerController.deleteCustomer
);


module.exports = router;