import express from 'express';
import userRoutes from './routes/course_routes.js';
import scheduleRoutes from './routes/schedule_routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parses JSON requests
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded form data

// Routes
app.use('/courses', userRoutes);
app.use('/schedule', scheduleRoutes);


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
