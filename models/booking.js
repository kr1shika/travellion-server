const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
            index: true,
        },

        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Package',
            required: true,
            index: true,
        },

        travelDate: {
            type: Date,
            required: true,
        },

        numberOfPeople: {
            type: Number,
            required: true,
            min: 1,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            enum: ['USD', 'NPR', 'EUR', 'GBP'],
            default: 'USD',
        },

        specialRequests: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            enum: [
                'Pending',
                'Confirmed',
                'Cancelled',
                'Completed'
            ],
            default: 'Pending',
        },

        paymentStatus: {
            type: String,
            enum: [
                'Pending',
                'Paid',
                'Partially Paid',
                'Refunded'
            ],
            default: 'Pending',
        },

        managedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },

    {
        timestamps: true,
    }
);


bookingSchema.index({
    packageId: 1,
    travelDate: 1,
});

bookingSchema.index({
    customerId: 1,
    createdAt: -1,
});


const Booking = mongoose.model(
    'Booking',
    bookingSchema
);

module.exports = Booking;