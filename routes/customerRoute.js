const express = require('express');

const router = express.Router();

const customerController =
    require('../controllers/customerController');


// Create customer
router.post(
    '/',
    customerController.createCustomer
);

// Get all customers
router.get(
    '/',
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