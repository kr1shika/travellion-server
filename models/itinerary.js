const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema(
    {
        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Package',
            required: true,
            index: true,
        },

        day: {
            type: Number,
            required: true,
            min: 1,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
        },

        distance: {
            type: String,
        },

        altitude: {
            meters: Number,
            feet: Number,
        },

        accommodation: {
            type: String,
        },

        meals: {
            breakfast: {
                type: Boolean,
                default: false,
            },

            lunch: {
                type: Boolean,
                default: false,
            },

            dinner: {
                type: Boolean,
                default: false,
            },
        },

        image: {
            type: String,
        },
    },

    {
        timestamps: true,
    }
);


// Prevent duplicate days for the same package
itinerarySchema.index(
    { packageId: 1, day: 1 },
    { unique: true }
);


const Itinerary = mongoose.model(
    'Itinerary',
    itinerarySchema
);

module.exports = Itinerary;