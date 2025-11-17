import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from './routes/auth.js';
import { PrismaClient } from "@prisma/client";
import { Sequelize, DataTypes } from "sequelize";
import CourseModel from './models/course.js';
import courseRoutes from "./routes/course.js";
import CourseProgressModel from './models/courseProgress.js';
import EnrollmentModel from "./models/enrollment.js";

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(cors(
  {origin: 'https://flexopted-frontend.vercel.app/', // frontend URL
    credentials: true,
  }
));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Sequelize setup
const sequelize = new Sequelize(process.env.DATABASE_URL);

// Initialize Course model
const Course = CourseModel(sequelize, DataTypes);
const CourseProgress = CourseProgressModel(sequelize, DataTypes);
const Enrollment = EnrollmentModel(sequelize, DataTypes);

if (CourseProgress.associate) CourseProgress.associate({ Course });
if (Enrollment.associate) Enrollment.associate({ Course });

// Sync DB
sequelize.sync({ alter: true })
  .then(() => console.log("Database synced"))
  .catch(err => console.error("DB sync error:", err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes(Course, CourseProgress, Enrollment)); // Pass Course model to routes

// Test route
app.get("/", (req, res) => {
  res.send("Backend running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
