const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const connectDB = async (retries = 5) => {
    const url = process.env.MONGO_URL;
    
    if (!url) {
        console.error('MONGO_URL not found in environment variables');
        process.exit(1);
    }

    const options = {
        // Removed deprecated options: useNewUrlParser and useUnifiedTopology
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(url, options);
            console.log('MongoDB connection successful');
            
            // Add connection event listeners
            mongoose.connection.on('error', err => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected. Attempting to reconnect...');
                setTimeout(() => connectDB(1), 5000);
            });

            mongoose.connection.on('reconnected', () => {
                console.log('MongoDB reconnected');
            });

            // Handle process termination
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);

            return;
        } catch (error) {
            console.error(`MongoDB connection attempt ${i + 1} failed:`, error.message);
            
            if (i === retries - 1) {
                console.error('All connection attempts failed. Exiting...');
                process.exit(1);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Cleanup function for graceful shutdown
const cleanup = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB cleanup:', err);
        process.exit(1);
    }
};

// Initialize connection
connectDB();

module.exports = mongoose;
