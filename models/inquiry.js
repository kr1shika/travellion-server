const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: [
                'New',
                'In Progress',
                'Resolved',
                'Closed'
            ],
            default: 'New',
        },
        response: {
            type: String,
        },
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },

        respondedAt: {
            type: Date,
        },
    },

    {
        timestamps: true,
    }
);


inquirySchema.index({
    status: 1,
    createdAt: -1,
});


const Inquiry = mongoose.model(
    'Inquiry',
    inquirySchema
);

module.exports = Inquiry;