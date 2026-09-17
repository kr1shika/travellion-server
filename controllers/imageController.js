const Image = require('../models/images');
const Package = require('../models/package');
const { cloudinary } = require('../config/cloudinary');

// ============================================
// UPLOAD SINGLE IMAGE
// ============================================
exports.uploadImage = async (req, res) => {
    try {
        const { packageId, caption, alt, isFeatured, order } = req.body;

        // Check if package exists
        const packageData = await Package.findById(packageId);
        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        // Check if package already has 5 images
        const imageCount = await Image.countDocuments({ packageId });
        if (imageCount >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 images allowed per package'
            });
        }

        // If this is the first image, make it featured
        const isFirstImage = imageCount === 0;
        const shouldBeFeatured = isFeatured === 'true' || isFeatured === true || isFirstImage;

        // Create image record
        const image = await Image.create({
            packageId,
            url: req.file.path,
            caption: caption || '',
            alt: alt || '',
            isFeatured: shouldBeFeatured,
            order: order || imageCount
        });

        // If this image is featured, unfeature others
        if (shouldBeFeatured) {
            await Image.updateMany(
                { packageId, _id: { $ne: image._id } },
                { isFeatured: false }
            );
        }

        res.status(201).json({
            success: true,
            data: image,
            message: 'Image uploaded successfully'
        });

    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPLOAD MULTIPLE IMAGES
// ============================================
exports.uploadMultipleImages = async (req, res) => {
    try {
        const { packageId, captions, altTexts } = req.body;

        // packageId is optional now
        // If provided, verify it exists
        if (packageId) {
            const packageData = await Package.findById(packageId);
            if (!packageData) {
                return res.status(404).json({
                    success: false,
                    message: 'Package not found'
                });
            }
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please upload at least one image'
            });
        }

        // If packageId provided, enforce 5-image limit
        if (packageId) {
            const currentCount = await Image.countDocuments({ packageId });
            if (currentCount + req.files.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum 5 images allowed. You already have ${currentCount}.`
                });
            }
        }

        const captionsArray = captions ? JSON.parse(captions) : [];
        const altArray = altTexts ? JSON.parse(altTexts) : [];

        const images = [];
        for (let i = 0; i < req.files.length; i++) {
            const image = await Image.create({
                packageId: packageId || null,
                url: req.files[i].path,
                caption: captionsArray[i] || '',
                alt: altArray[i] || '',
                isFeatured: false,
                order: i,
            });
            images.push(image);
        }

        res.status(201).json({
            success: true,
            data: images,
            message: `${images.length} images uploaded successfully`
        });

    } catch (error) {
        console.error('Upload multiple images error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET IMAGES BY PACKAGE
// ============================================
exports.getImagesByPackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const images = await Image.find({ packageId })
            .sort({ order: 1, createdAt: 1 });

        res.status(200).json({
            success: true,
            count: images.length,
            data: images
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET SINGLE IMAGE
// ============================================
exports.getImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id)
            .populate('packageId', 'name slug');

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        res.status(200).json({
            success: true,
            data: image
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// UPDATE IMAGE
// ============================================
exports.updateImage = async (req, res) => {
    try {
        const { caption, alt, isFeatured, order } = req.body;

        const image = await Image.findById(req.params.id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Update fields
        if (caption !== undefined) image.caption = caption;
        if (alt !== undefined) image.alt = alt;
        if (order !== undefined) image.order = order;

        // Handle featured update
        if (isFeatured !== undefined) {
            const isFeaturedBool = isFeatured === 'true' || isFeatured === true;
            image.isFeatured = isFeaturedBool;

            // If setting this as featured, unfeature others in same package
            if (isFeaturedBool) {
                await Image.updateMany(
                    { packageId: image.packageId, _id: { $ne: image._id } },
                    { isFeatured: false }
                );
            }
        }

        await image.save();

        res.status(200).json({
            success: true,
            data: image,
            message: 'Image updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// SET FEATURED IMAGE
// ============================================
exports.setFeaturedImage = async (req, res) => {
    try {
        const { id } = req.params;

        const image = await Image.findById(id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Unfeature all images in this package
        await Image.updateMany(
            { packageId: image.packageId },
            { isFeatured: false }
        );

        // Set this image as featured
        image.isFeatured = true;
        await image.save();

        res.status(200).json({
            success: true,
            data: image,
            message: 'Featured image set successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// REORDER IMAGES
// ============================================
exports.reorderImages = async (req, res) => {
    try {
        const { packageId } = req.params;
        const { imageOrders } = req.body; // Array of { id, order }

        if (!imageOrders || !Array.isArray(imageOrders)) {
            return res.status(400).json({
                success: false,
                message: 'imageOrders array is required'
            });
        }

        // Update each image's order
        const updates = imageOrders.map(({ id, order }) =>
            Image.findByIdAndUpdate(id, { order }, { new: true })
        );

        const updatedImages = await Promise.all(updates);

        res.status(200).json({
            success: true,
            data: updatedImages,
            message: 'Images reordered successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// DELETE IMAGE
// ============================================
exports.deleteImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Extract public_id from Cloudinary URL
        const urlParts = image.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = `trektravel/packages/${filename.split('.')[0]}`;

        // Delete from Cloudinary
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
            console.error('Cloudinary delete error:', cloudinaryError);
            // Continue even if Cloudinary delete fails
        }

        // Delete from database
        await Image.findByIdAndDelete(req.params.id);

        // If this was featured, set another image as featured
        if (image.isFeatured) {
            const nextImage = await Image.findOne({ packageId: image.packageId })
                .sort({ order: 1 });
            if (nextImage) {
                nextImage.isFeatured = true;
                await nextImage.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// DELETE ALL IMAGES FOR A PACKAGE
// ============================================
exports.deletePackageImages = async (req, res) => {
    try {
        const { packageId } = req.params;

        const images = await Image.find({ packageId });

        // Delete all from Cloudinary
        for (const image of images) {
            try {
                const urlParts = image.url.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = `trektravel/packages/${filename.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Cloudinary delete error:', error);
            }
        }

        // Delete all from database
        await Image.deleteMany({ packageId });

        res.status(200).json({
            success: true,
            message: 'All images deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET FEATURED IMAGE
// ============================================
exports.getFeaturedImage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const image = await Image.findOne({ packageId, isFeatured: true });

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'No featured image found for this package'
            });
        }

        res.status(200).json({
            success: true,
            data: image
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};