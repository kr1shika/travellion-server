const Package = require('../models/package');
const Itinerary = require('../models/itinerary');
const Image = require('../models/images');
const mongoose = require('mongoose');

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


        // Get images for all packages
        const packageIds = packages.map(
            pkg => pkg._id
        );

        const images = await Image.find({
            packageId: {
                $in: packageIds
            }
        }).sort({
            order: 1
        });


        // Attach images to each package
        const packagesWithImages = packages.map(pkg => {

            const packageImages = images.filter(
                image =>
                    image.packageId.toString() ===
                    pkg._id.toString()
            );

            return {
                ...pkg.toObject(),
                images: packageImages
            };
        });

        const total =
            await Package.countDocuments(query);

        res.status(200).json({
            success: true,
            data: packagesWithImages,
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

        // ========================================
        // Get package data from request body
        // ========================================

        const {
            itinerary = [],
            images = [],
            ...packageData
        } = req.body;


        // ========================================
        // Validate required fields
        // ========================================

        if (!packageData.name || !packageData.category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, category',
            });
        }

        if (!Array.isArray(itinerary)) {
            return res.status(400).json({
                success: false,
                message: 'itinerary must be an array',
            });
        }

        if (!Array.isArray(images)) {
            return res.status(400).json({
                success: false,
                message: 'images must be an array',
            });
        }

        if (images.length > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 images allowed',
            });
        }


        // ========================================
        // Auto-generate unique slug
        // ========================================

        const generateSlug = (name) =>
            (name || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

        let baseSlug = generateSlug(packageData.name);

        if (!baseSlug) {
            return res.status(400).json({
                success: false,
                message: 'Name is required to generate a slug',
            });
        }

        // Ensure uniqueness by appending -1, -2, etc.
        let slug = baseSlug;
        let counter = 1;

        while (await Package.exists({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        packageData.slug = slug;


        // ========================================
        // Admin ID
        // (fallback for development without auth)
        // ========================================

        packageData.createdBy =
            req.admin?._id ||
            new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');


        // ========================================
        // Create package
        // ========================================

        const newPackage = await Package.create(packageData);


        // ========================================
        // Create itinerary records
        // ========================================

        let createdItinerary = [];

        if (itinerary.length > 0) {

            const itineraryDocs = itinerary.map(item => ({
                ...item,
                packageId: newPackage._id,
            }));

            createdItinerary = await Itinerary.insertMany(itineraryDocs);
        }


        // ========================================
        // Create / link image records
        // ========================================

        let createdImages = [];

        if (images.length > 0) {

            // Images may have `_id` (already uploaded via /images/upload-multiple)
            // or be new (with just url, caption, etc.)
            const existingIds = images
                .filter(img => img._id)
                .map(img => img._id);

            // Link orphan images to the new package
            if (existingIds.length > 0) {
                await Image.updateMany(
                    { _id: { $in: existingIds } },
                    { packageId: newPackage._id }
                );

                // Also update caption / alt / order / isFeatured if provided
                for (const img of images.filter(i => i._id)) {
                    await Image.findByIdAndUpdate(img._id, {
                        caption: img.caption || '',
                        alt: img.alt || '',
                        isFeatured: img.isFeatured || false,
                        order: img.order !== undefined ? img.order : 0,
                    });
                }
            }

            // Create brand-new images (no _id)
            const newImages = images.filter(img => !img._id);

            if (newImages.length > 0) {
                const imageDocs = newImages.map((image, index) => ({
                    url: image.url,
                    caption: image.caption || '',
                    alt: image.alt || '',
                    isFeatured: image.isFeatured || false,
                    order: image.order !== undefined ? image.order : index,
                    packageId: newPackage._id,
                }));

                await Image.insertMany(imageDocs);
            }

            // Fetch final list of images for this package
            createdImages = await Image.find({
                packageId: newPackage._id,
            }).sort({ order: 1 });

            // Ensure at least one featured image
            const hasFeatured = createdImages.some(img => img.isFeatured);
            if (!hasFeatured && createdImages.length > 0) {
                await Image.findByIdAndUpdate(createdImages[0]._id, {
                    isFeatured: true,
                });
                createdImages = await Image.find({
                    packageId: newPackage._id,
                }).sort({ order: 1 });
            }
        }


        // ========================================
        // Response
        // ========================================

        res.status(201).json({
            success: true,
            data: {
                package: newPackage,
                itinerary: createdItinerary,
                images: createdImages,
            },
            message: 'Package created successfully',
        });


    } catch (error) {

        console.error('Create package error:', error);

        // Duplicate key (very unlikely now since slug is unique)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            const value = error.keyValue?.[field];

            return res.status(400).json({
                success: false,
                message: `Duplicate value for '${field}': "${value}". Please use a different value.`,
                field,
            });
        }

        // Mongoose validation
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors,
            });
        }

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// =====================================================
// UPDATE PACKAGE
// =====================================================
// =====================================================
// UPDATE PACKAGE
// =====================================================
exports.updatePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            itinerary,
            images,
            ...packageUpdates
        } = req.body;

        // Admin ID
        packageUpdates.updatedBy =
            req.admin?._id ||
            new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

        // ----------------------------------------
        // Update package
        // ----------------------------------------
        const updatedPackage = await Package.findByIdAndUpdate(
            id,
            packageUpdates,
            { new: true, runValidators: true }
        );

        if (!updatedPackage) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // ----------------------------------------
        // Update itinerary (replace-all)
        // ----------------------------------------
        let updatedItinerary = [];

        if (Array.isArray(itinerary)) {
            await Itinerary.deleteMany({ packageId: id });

            if (itinerary.length > 0) {
                const docs = itinerary.map((item, index) => ({
                    ...item,
                    day: item.day || index + 1,
                    packageId: id,
                }));
                updatedItinerary = await Itinerary.insertMany(docs);
            }
        } else {
            // Not sent → keep existing
            updatedItinerary = await Itinerary
                .find({ packageId: id })
                .sort({ day: 1 });
        }

        // ----------------------------------------
        // Update images (replace-all)
        // ----------------------------------------
        let updatedImages = [];

        if (Array.isArray(images)) {
            // Delete Cloudinary files for images that were removed
            const existingImages = await Image.find({ packageId: id });
            const keptIds = images
                .filter(img => img._id)
                .map(img => img._id.toString());

            const toDelete = existingImages.filter(
                img => !keptIds.includes(img._id.toString())
            );

            // Optional: delete from Cloudinary
            // for (const img of toDelete) { ... }

            await Image.deleteMany({
                packageId: id,
                _id: { $nin: images.filter(i => i._id).map(i => i._id) }
            });

            // Update existing images (caption, alt, isFeatured, order)
            for (const img of images.filter(i => i._id)) {
                await Image.findByIdAndUpdate(img._id, {
                    caption: img.caption || '',
                    alt: img.alt || '',
                    isFeatured: img.isFeatured || false,
                    order: img.order !== undefined ? img.order : 0,
                });
            }

            // Insert brand-new images (no _id)
            const newImages = images.filter(img => !img._id);
            if (newImages.length > 0) {
                const docs = newImages.map((img, index) => ({
                    url: img.url,
                    caption: img.caption || '',
                    alt: img.alt || '',
                    isFeatured: img.isFeatured || false,
                    order: img.order !== undefined ? img.order : index,
                    packageId: id,
                }));
                await Image.insertMany(docs);
            }

            // Refetch final list
            updatedImages = await Image
                .find({ packageId: id })
                .sort({ order: 1 });

            // Ensure at least one is featured
            const hasFeatured = updatedImages.some(img => img.isFeatured);
            if (!hasFeatured && updatedImages.length > 0) {
                await Image.findByIdAndUpdate(updatedImages[0]._id, {
                    isFeatured: true
                });
                updatedImages = await Image
                    .find({ packageId: id })
                    .sort({ order: 1 });
            }
        } else {
            updatedImages = await Image
                .find({ packageId: id })
                .sort({ order: 1 });
        }

        // ----------------------------------------
        // Response
        // ----------------------------------------
        res.status(200).json({
            success: true,
            data: {
                package: updatedPackage,
                itinerary: updatedItinerary,
                images: updatedImages,
            },
            message: 'Package updated successfully'
        });

    } catch (error) {
        console.error('Update package error:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(400).json({
                success: false,
                message: `Duplicate value for '${field}'`
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =====================================================
// DELETE PACKAGE
// =====================================================
const { cloudinary } = require('../config/cloudinary');

// =====================================================
// DELETE PACKAGE
// =====================================================
exports.deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        // ----------------------------------------
        // 1. Find package first (needed for existence check)
        // ----------------------------------------
        const packageData = await Package.findById(id);
        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: 'Package not found',
            });
        }

        // ----------------------------------------
        // 2. Delete related images from Cloudinary
        // ----------------------------------------
        const images = await Image.find({ packageId: id });

        for (const img of images) {
            try {
                const urlParts = img.url.split('/');
                const filename = urlParts[urlParts.length - 1];
                const folderIndex = urlParts.indexOf('trektravel');

                // Rebuild the public_id: "trektravel/packages/abc123"
                const publicId =
                    folderIndex !== -1
                        ? urlParts
                            .slice(folderIndex)
                            .join('/')
                            .split('.')[0]
                        : filename.split('.')[0];

                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error(
                    'Cloudinary delete failed for',
                    img.url,
                    cloudinaryError.message
                );
                // keep going — don't block DB cleanup
            }
        }

        // ----------------------------------------
        // 3. Delete DB records (order matters for safety)
        // ----------------------------------------
        await Image.deleteMany({ packageId: id });
        await Itinerary.deleteMany({ packageId: id });
        await Package.findByIdAndDelete(id);

        // ----------------------------------------
        // 4. Response
        // ----------------------------------------
        res.status(200).json({
            success: true,
            message:
                'Package, itinerary, and images deleted successfully',
        });

    } catch (error) {
        console.error('Delete package error:', error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
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

        const packageIds = packages.map(
            pkg => pkg._id
        );

        const images = await Image.find({
            packageId: {
                $in: packageIds
            }
        }).sort({
            order: 1
        });


        const packagesWithImages =
            packages.map(pkg => {

                const packageImages =
                    images.filter(
                        image =>
                            image.packageId.toString() ===
                            pkg._id.toString()
                    );

                return {
                    ...pkg.toObject(),
                    images: packageImages
                };

            });


        res.status(200).json({
            success: true,
            data: packagesWithImages
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

        const packageIds = packages.map(
            pkg => pkg._id
        );

        const images = await Image.find({
            packageId: {
                $in: packageIds
            }
        }).sort({
            order: 1
        });


        const packagesWithImages =
            packages.map(pkg => {

                const packageImages =
                    images.filter(
                        image =>
                            image.packageId.toString() ===
                            pkg._id.toString()
                    );

                return {
                    ...pkg.toObject(),
                    images: packageImages
                };

            });


        res.status(200).json({
            success: true,
            data: packagesWithImages
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

// =====================================================
// GET ALL PACKAGES (ADMIN - shows all statuses)
// =====================================================
exports.getAdminPackages = async (req, res) => {
    try {
        const {
            category,
            difficulty,
            status,
            search,
            sort,
            page = 1,
            limit = 100,
        } = req.query;

        const query = {};
        if (category) query.category = category;
        if (difficulty) query.difficulty = difficulty;
        if (status) query.status = status;
        if (search) query.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let sortOption = {};
        if (sort === 'price-asc') sortOption['price.usd'] = 1;
        else if (sort === 'price-desc') sortOption['price.usd'] = -1;
        else if (sort === 'popular') sortOption.views = -1;
        else sortOption.createdAt = -1;

        const packages = await Package.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const packageIds = packages.map(p => p._id);

        // Images
        const images = await Image.find({
            packageId: { $in: packageIds }
        }).sort({ order: 1 });

        // Itinerary counts
        const itineraryCounts = await Itinerary.aggregate([
            { $match: { packageId: { $in: packageIds } } },
            { $group: { _id: '$packageId', count: { $sum: 1 } } },
        ]);

        const itineraryCountMap = {};
        itineraryCounts.forEach(item => {
            itineraryCountMap[item._id.toString()] = item.count;
        });

        const packagesWithDetails = packages.map(pkg => ({
            ...pkg.toObject(),
            images: images.filter(
                img => img.packageId.toString() === pkg._id.toString()
            ),
            itineraryCount: itineraryCountMap[pkg._id.toString()] || 0,
        }));

        const total = await Package.countDocuments(query);

        res.status(200).json({
            success: true,
            data: packagesWithDetails,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};