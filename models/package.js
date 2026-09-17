const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Package name is required'],
            trim: true,
            index: true,
        },

        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            // no `required: true` — backend generates it
        },

        category: {
            type: String,
            enum: [
                'Trekking',
                'Hiking',
                'Tour',
                'Expedition',
                'Adventure'
            ],
            required: true,
        },

        price: {
            usd: {
                type: Number,
                required: [true, 'Price in USD is required'],
                min: 0,
            },

            npr: {
                type: Number,
                min: 0,
            },

            currency: {
                type: String,
                default: 'USD',
                enum: ['USD', 'NPR', 'EUR', 'GBP'],
            },
        },

        duration: {
            days: {
                type: Number,
                required: [true, 'Number of days is required'],
                min: 1,
            },

            nights: {
                type: Number,
                min: 0,
            },

            displayText: {
                type: String,
            },
        },

        country: {
            type: String,
            required: true,
            default: 'Nepal',
        },

        region: {
            type: String,
            required: true,
        },

        maxAltitude: {
            meters: {
                type: Number,
                min: 0,
            },

            feet: {
                type: Number,
                min: 0,
            },

            displayText: {
                type: String,
            },
        },

        difficulty: {
            type: String,
            enum: [
                'Easy',
                'Moderate',
                'Strenuous',
                'Challenging',
                'Extreme'
            ],
            required: true,
        },

        activity: {
            type: String,
            enum: [
                'Trekking/Hiking',
                'Climbing',
                'Sightseeing',
                'Cultural Tour',
                'Wildlife Safari'
            ],
            required: true,
        },

        bestSeasons: [
            {
                type: String,
                enum: [
                    'Jan', 'Feb', 'Mar', 'Apr',
                    'May', 'Jun', 'Jul', 'Aug',
                    'Sep', 'Oct', 'Nov', 'Dec'
                ],
            },
        ],

        seasonDisplay: {
            type: String,
        },

        accommodation: {
            type: String,
        },

        mealsIncluded: {
            type: String,
        },

        highlights: [
            {
                type: String,
                maxlength: 200,
            },
        ],

        overview: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        route: {
            startPoint: String,
            endPoint: String,
            mapImage: String,
            gpxFile: String,
        },

        inclusions: [
            {
                category: {
                    type: String,
                    enum: [
                        'Accommodation',
                        'Meals',
                        'Transportation',
                        'Guide',
                        'Permits',
                        'Equipment',
                        'Other'
                    ],
                },

                items: [String],

                description: String,
            },
        ],

        exclusions: [
            {
                type: String,
            },
        ],

        groupPricing: [
            {
                groupSize: {
                    min: Number,
                    max: Number,
                },

                pricePerPerson: {
                    type: Number,
                },
            },
        ],

        departureDates: [
            {
                date: {
                    type: Date,
                    required: true,
                },

                status: {
                    type: String,
                    enum: [
                        'Available',
                        'Limited',
                        'Full',
                        'Cancelled'
                    ],
                    default: 'Available',
                },

                spotsAvailable: {
                    type: Number,
                    min: 0,
                },

                maxSpots: {
                    type: Number,
                },

                isGuaranteed: {
                    type: Boolean,
                    default: false,
                },
            },
        ],

        isPrivateTrip: {
            type: Boolean,
            default: false,
        },

        minGroupSize: {
            type: Number,
            default: 2,
        },

        maxGroupSize: {
            type: Number,
            default: 12,
        },

        permits: [
            {
                name: String,

                cost: {
                    type: Number,
                },

                included: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        whatToBring: [
            {
                type: String,
            },
        ],

        faqs: [
            {
                question: {
                    type: String,
                    required: true,
                },

                answer: {
                    type: String,
                    required: true,
                },
            },
        ],

        metaTitle: {
            type: String,
        },

        metaDescription: {
            type: String,
        },

        keywords: [
            {
                type: String,
            },
        ],

        status: {
            type: String,
            enum: ['Draft', 'Published', 'Archived'],
            default: 'Draft',
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        isPopular: {
            type: Boolean,
            default: false,
        },

        views: {
            type: Number,
            default: 0,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);


// Indexes
packageSchema.index({
    name: 'text',
    description: 'text',
    overview: 'text'
});

packageSchema.index({
    category: 1,
    difficulty: 1,
    'price.usd': 1
});

packageSchema.index({
    'departureDates.date': 1
});

packageSchema.index({
    status: 1,
    isFeatured: 1
});

// Virtuals
packageSchema.virtual('durationDisplay').get(function () {
    if (this.duration.nights) {
        return `${this.duration.days} Days / ${this.duration.nights} Nights`;
    }

    return `${this.duration.days} Days`;
});

packageSchema.virtual('availableDepartures').get(function () {
    if (!this.departureDates || !Array.isArray(this.departureDates)) {
        return [];
    }
    return this.departureDates.filter(
        d => d.status === 'Available' && d.spotsAvailable > 0
    );
});

// Pre-save
packageSchema.pre('save', function () {

    if (
        this.maxAltitude &&
        this.maxAltitude.meters &&
        this.maxAltitude.feet
    ) {
        this.maxAltitude.displayText =
            `${this.maxAltitude.meters.toLocaleString()} m/${this.maxAltitude.feet.toLocaleString()} ft`;
    }

    if (this.duration && this.duration.days) {
        this.duration.displayText =
            `${this.duration.days} Days`;
    }

    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
});


// Static methods
packageSchema.statics.getFeatured = function (limit = 6) {
    return this.find({
        status: 'Published',
        isFeatured: true
    })
        .sort({ createdAt: -1 })
        .limit(limit);
};


packageSchema.statics.getPopular = function (limit = 4) {
    return this.find({
        status: 'Published',
        isPopular: true
    })
        .sort({ views: -1 })
        .limit(limit);
};

// Instance methods
packageSchema.methods.checkAvailability = function (date) {
    const departure = this.departureDates.find(
        d => d.date.toDateString() === new Date(date).toDateString()
    );

    if (!departure) return false;

    return (
        departure.status === 'Available' &&
        departure.spotsAvailable > 0
    );
};

packageSchema.methods.incrementViews = async function () {
    this.views += 1;
    await this.save();

    return this.views;
};

const Package =
    mongoose.models.Package ||
    mongoose.model('Package', packageSchema);

module.exports = Package;