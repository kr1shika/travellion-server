const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // password: {
        //     type: String,
        //     required: true,
        //     minlength: 6,
        // },

        phone: {
            type: String,
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        country: {
            type: String,
            trim: true,
        },

        profileImage: {
            type: String,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        lastLogin: {
            type: Date,
        },
    },

    {
        timestamps: true,
    }
);


const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);


module.exports = Customer;