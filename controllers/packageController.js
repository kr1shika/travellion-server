const Package = require('../models/package');
const Itinerary = require('../models/itinerary');
const Image = require('../models/images');
const mongoose = require('mongoose');

// =====================================================
// GET ALL PACKAGES
// =====================================================

exports.getAllPackages = async (req, res) => {
    try {
        const {
            category,
            difficulty,
            minPrice,
            maxPrice,
            duration,
            search,
            sort,
            page = 1,
            limit = 10,
        } = req.query;

        const query = { status: 'Published' };

        // Filters
        if (category) query.category = category;

        if (difficulty) {
            query.difficulty = difficulty;
        }

        if (duration) {
            query['duration.days'] = {
                $lte: parseInt(duration)
            };
        }

        // Price filter
        if (minPrice || maxPrice) {
            query['price.usd'] = {};

            if (minPrice) {
                query['price.usd'].$gte = parseFloat(minPrice);
            }

            if (maxPrice) {
                query['price.usd'].$lte = parseFloat(maxPrice);
            }
        }

        // Search
        if (search) {
            query.$text = {
                $search: search
            };
        }

        // Pagination
        const skip =
            (parseInt(page) - 1) * parseInt(limit);

        // Sorting
        let sortOption = {};

        if (sort === 'price-asc') {
            sortOption['price.usd'] = 1;
        } else if (sort === 'price-desc') {
            sortOption['price.usd'] = -1;
        } else if (sort === 'popular') {
            sortOption.views = -1;
        } else {
            sortOption.createdAt = -1;
        }

        const packages = await Package.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-faqs -whatToBring');

        const total =
            await Package.countDocuments(query);

        res.status(200).json({
            success: true,
            data: packages,

            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(
                    total / parseInt(limit)
                ),
            },
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// GET SINGLE PACKAGE
// =====================================================

exports.getPackage = async (req, res) => {
    try {
        const { id } = req.params;

        let packageData;

        if (mongoose.Types.ObjectId.isValid(id)) {
            packageData = await Package.findById(id);
        } else {
            packageData = await Package.findOne({
                slug: id,
                status: 'Published'
            });
        }

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Increment views
        await packageData.incrementViews();

        // Get itinerary
        const itinerary =
            await Itinerary.find({
                packageId: packageData._id
            }).sort({ day: 1 });

        // Get images
        const images =
            await Image.find({
                packageId: packageData._id
            }).sort({ order: 1 });

        res.status(200).json({
            success: true,

            data: {
                ...packageData.toObject(),
                itinerary,
                images
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// CREATE PACKAGE
// =====================================================

exports.createPackage = async (req, res) => {
    try {
        const {
            itinerary = [],
            images = [],
            ...packageData
        } = req.body;

        // Validate package
        if (
            !packageData.name ||
            !packageData.slug ||
            !packageData.category
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Missing required fields: name, slug, category are required'
            });
        }

        // Validate itinerary
        if (!Array.isArray(itinerary)) {
            return res.status(400).json({
                success: false,
                message: 'itinerary must be an array'
            });
        }

        // Validate images
        if (!Array.isArray(images)) {
            return res.status(400).json({
                success: false,
                message: 'images must be an array'
            });
        }

        if (images.length > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 images allowed'
            });
        }

        // Temporary admin ID
        packageData.createdBy =
            new mongoose.Types.ObjectId(
                '507f1f77bcf86cd799439011'
            );

        // Create package
        const newPackage =
            await Package.create(packageData);

        // Create itinerary separately
        let createdItinerary = [];

        if (itinerary.length > 0) {
            const itineraryData = itinerary.map(item => ({
                ...item,
                packageId: newPackage._id
            }));

            createdItinerary =
                await Itinerary.insertMany(
                    itineraryData
                );
        }

        // Create images separately
        let createdImages = [];

        if (images.length > 0) {
            const imageData = images.map(
                (image, index) => ({
                    ...image,
                    packageId: newPackage._id,
                    order:
                        image.order !== undefined
                            ? image.order
                            : index
                })
            );

            // Make first image featured
            const hasFeatured =
                imageData.some(
                    image =>
                        image.isFeatured === true
                );

            if (!hasFeatured) {
                imageData[0].isFeatured = true;
            }

            createdImages =
                await Image.insertMany(
                    imageData
                );
        }

        res.status(201).json({
            success: true,

            data: {
                package: newPackage,
                itinerary: createdItinerary,
                images: createdImages
            },

            message:
                'Package created successfully'
        });

    } catch (error) {

        console.error(
            'Create package error:',
            error
        );

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message:
                    'Package with this slug already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const errors =
                Object.values(error.errors)
                    .map(e => e.message);

            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors
            });
        }

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// UPDATE PACKAGE
// =====================================================

exports.updatePackage = async (req, res) => {
    try {

        const { id } = req.params;

        const updates = {
            ...req.body
        };


        // Remove related entities from package updates
        // because they have their own collections

        delete updates.itinerary;
        delete updates.images;


        // Admin ID
        updates.updatedBy =
            req.admin?.id ||
            new mongoose.Types.ObjectId(
                '507f1f77bcf86cd799439011'
            );


        const updatedPackage =
            await Package.findByIdAndUpdate(
                id,
                updates,
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!updatedPackage) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }


        res.status(200).json({

            success: true,

            data: updatedPackage,

            message:
                'Package updated successfully'
        });


    } catch (error) {

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message:
                    'Package with this slug already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// DELETE PACKAGE
// =====================================================

exports.deletePackage = async (req, res) => {

    const session = await mongoose.startSession();

    try {

        const { id } = req.params;

        session.startTransaction();


        const deletedPackage =
            await Package.findByIdAndDelete(
                id,
                { session }
            );


        if (!deletedPackage) {

            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }


        // Delete related itinerary
        await Itinerary.deleteMany(
            { packageId: id },
            { session }
        );


        // Delete related images
        await Image.deleteMany(
            { packageId: id },
            { session }
        );


        await session.commitTransaction();


        res.status(200).json({

            success: true,

            message:
                'Package and related data deleted successfully'
        });


    } catch (error) {

        await session.abortTransaction();

        res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {

        await session.endSession();
    }
};


// =====================================================
// FEATURED PACKAGES
// =====================================================

exports.getFeaturedPackages = async (req, res) => {

    try {

        const { limit = 6 } = req.query;

        const packages =
            await Package.getFeatured(
                parseInt(limit)
            );

        res.status(200).json({
            success: true,
            data: packages
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// POPULAR PACKAGES
// =====================================================

exports.getPopularPackages = async (req, res) => {

    try {

        const { limit = 4 } = req.query;

        const packages =
            await Package.getPopular(
                parseInt(limit)
            );

        res.status(200).json({
            success: true,
            data: packages
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================================
// CHECK AVAILABILITY
// =====================================================

exports.checkAvailability = async (req, res) => {

    try {

        const {
            packageId,
            date
        } = req.params;


        const packageData =
            await Package.findById(packageId);


        if (!packageData) {

            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }


        const isAvailable =
            packageData.checkAvailability(
                new Date(date)
            );


        const departure =
            packageData.departureDates.find(
                d =>
                    d.date.toDateString() ===
                    new Date(date).toDateString()
            );


        res.status(200).json({

            success: true,

            available: isAvailable,

            details: departure || null
        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};