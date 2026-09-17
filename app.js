const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const packageRoutes = require('./routes/packageRoutes');
const customerRoutes =
    require('./routes/customerRoute');

const bookingRoutes =
    require('./routes/bookingRoute');
const inquiryRoutes = require('./routes/inquiryRoute');

const adminRoutes =
    require('./routes/adminRoutes');
const imageRoutes = require('./routes/imageRoute');

// Initialize express app
const app = express();

// Optional modules with fallbacks
let morgan, helmet, compression;

try {
    morgan = require('morgan');
    console.log('✅ Morgan loaded');
} catch (err) {
    console.log('⚠️ Morgan not installed - logging disabled');
}

try {
    helmet = require('helmet');
    console.log('✅ Helmet loaded');
} catch (err) {
    console.log('⚠️ Helmet not installed - security headers disabled');
}

try {
    compression = require('compression');
    console.log('✅ Compression loaded');
} catch (err) {
    console.log('⚠️ Compression not installed - response compression disabled');
}

const connectDB = async () => {
    try {
        const mongoURI =
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/trektravel';

        console.log('MongoDB URI:', mongoURI);

        const conn = await mongoose.connect(mongoURI, {
            retryWrites: false,
            retryReads: false,
            directConnection: true
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(
            `🔗 Connection String: ${mongoURI.replace(
                /\/\/.*@/,
                '//<credentials>@'
            )}`
        );

    } catch (error) {
        console.error(
            `❌ MongoDB Connection Error: ${error.message}`
        );

        console.log(
            '\n⚠️ Server running without database connection.'
        );
    }
};

// Connect to database
connectDB();

// Middleware
if (helmet) {
    app.use(helmet()); // Security headers
}

app.use(cors()); // Enable CORS

if (compression) {
    app.use(compression()); // Compress responses
}

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

if (morgan && process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
    console.log(' Morgan logging enabled');
} else if (morgan) {
    app.use(morgan('combined'));
    console.log(' Morgan logging enabled (combined)');
}

if (!morgan) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: ' TrekTravel API is running',
        version: '1.0.0',
        endpoints: {
            packages: '/api/packages',
            bookings: '/api/bookings',
            customers: '/api/customers',
            admins: '/api/admins',
        },
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    });
});

// Health check route
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting'
    }[dbStatus] || 'Unknown';

    res.json({
        success: true,
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mongodb: {
            status: dbStatusText,
            readyState: dbStatus,
        },
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
    });
});

// API Routes
app.use('/api/packages', packageRoutes);
app.use(
    '/api/customers',
    customerRoutes
);

app.use('/api/inquiries', inquiryRoutes);


app.use(
    '/api/bookings',
    bookingRoutes
);

app.use(
    '/api/admins',
    adminRoutes
);

app.use('/api/images', imageRoutes);


// 404 handler - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        method: req.method,
        availableRoutes: {
            root: [
                'GET /',
                'GET /health'
            ],
            packages: [
                'GET /api/packages',
                'POST /api/packages',
                'GET /api/packages/:id',
                'PUT /api/packages/:id',
                'DELETE /api/packages/:id',
                'GET /api/packages/featured',
                'GET /api/packages/popular',
                'GET /api/packages/:id/images',
                'PUT /api/packages/:id/images',
                'GET /api/packages/:packageId/availability/:date'
            ]
        }
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack || err.message);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: errors,
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            message: `Duplicate value for ${field}. Please use a unique value.`,
        });
    }

    // Cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `Invalid ${err.path}: ${err.value}`,
        });
    }

    // Default error
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        }),
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    console.log('💡 Server will continue running...');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.log('💡 Server will continue running...');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(' SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log(' SIGINT received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed.');
        process.exit(0);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log('\n=================================');
    console.log(` Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Package API: http://localhost:${PORT}/api/packages`);
    console.log(` Health Check: http://localhost:${PORT}/health`);
    console.log('=================================\n');
});

module.exports = app;