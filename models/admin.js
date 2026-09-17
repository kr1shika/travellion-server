const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Admin name is required'],
            trim: true,
        },

        email: {
            type: String,
            required: [true, 'Admin email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, 'Admin password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
        },

        role: {
            type: String,
            enum: ['Admin', 'SuperAdmin'],
            default: 'Admin',
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

// ============================================
// HASH PASSWORD BEFORE SAVING
// ============================================

adminSchema.pre('save', async function () {

    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);

    this.password =
        await bcrypt.hash(
            this.password,
            salt
        );
});

// ============================================
// COMPARE PASSWORD
// ============================================

adminSchema.methods.comparePassword =
    async function (enteredPassword) {

        return bcrypt.compare(
            enteredPassword,
            this.password
        );
    };

// ============================================
// MODEL
// ============================================

const Admin =
    mongoose.models.Admin ||
    mongoose.model('Admin', adminSchema);

module.exports = Admin;