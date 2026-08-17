const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
    {
        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Package',
            required: true,
            index: true,
        },

        url: {
            type: String,
            required: true,
        },

        caption: {
            type: String,
            maxlength: 100,
        },

        alt: {
            type: String,
            maxlength: 100,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        order: {
            type: Number,
            default: 0,
        },
    },

    {
        timestamps: true,
    }
);


imageSchema.index({
    packageId: 1,
    order: 1,
});


const Image = mongoose.model('Image', imageSchema);

module.exports = Image;