import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export default (Course, CourseProgress, Enrollment) => {
  const router = express.Router();

  // Configure Multer for video uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/videos';
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `course-${req.params.id}-${Date.now()}${ext}`);
    },
  });

  const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp4', '.avi', '.mov', '.mkv'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

  // CREATE course
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { title, description, instructor, videoLinks } = req.body;
      const course = await Course.create({ title, description, instructor, videoLinks : videoLinks || [] });
      res.status(201).json(course);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all courses
  router.get('/', async (req, res) => {
    try {
      const courses = await Course.findAll();
      res.json(courses);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// POST /:id/enroll
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  console.log(req.user);
  try {
    const userId = req.user.userId;
    const courseId = parseInt(req.params.id, 10);

    // Check if enrollment already exists
    const existing = await Enrollment.findOne({ where: { userId, courseId } });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });

    const name = req.user.name || '';
    const email = req.user.email || '';

    const enrollment = await Enrollment.create({ userId, courseId, name, email });
    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
  

  // GET single course
  router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const courseId = parseInt(req.params.id, 10);

    // Check if user is enrolled
    const enrolled = await Enrollment.findOne({ where: { userId, courseId } });
    if (!enrolled) return res.status(403).json({ error: 'You must enroll to view this course' });

    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

  router.get('/:id/students', authMiddleware, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const students = await Enrollment.findAll({
      where: { courseId },
      attributes: ['userId', 'name', 'email']
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

  // UPDATE course
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { title, description, instructor, videoLinks } = req.body;
      const course = await Course.findByPk(req.params.id);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      await course.update({ title, description, instructor, videoLinks });
      res.json(course);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE course
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id, 10); 
      const course = await Course.findByPk(courseId);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      await CourseProgress.destroy({ where: { courseId } });
      await Enrollment.destroy({ where: { courseId } });
      
      await course.destroy();
      res.json({ message: 'Course deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload video
  router.post('/:id/upload-video', authMiddleware, upload.single('video'), async (req, res) => {
    console.log(req.file);

    try {
      const course = await Course.findByPk(req.params.id);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const videoUrl = `/uploads/videos/${req.file.filename}`;
      let updatedVideos = course.videoLinks ? [...course.videoLinks] : [];
      updatedVideos.push(videoUrl);

      console.log(updatedVideos);
      course.videoLinks = updatedVideos;
      course.changed('videoLinks', true); 
      await course.save();
      res.status(200).json({ message: 'Video uploaded successfully', videoUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add external video link
  router.post('/:id/add-link', authMiddleware, async (req, res) => {
    try {
      const { link } = req.body;
      if (!link) return res.status(400).json({ error: "Video link is required" });

      const course = await Course.findByPk(req.params.id);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const updatedVideos = [...(course.videoLinks || []), link];
      await course.update({ videoLinks: updatedVideos });

      res.json({ message: "Video link added", updatedVideos });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /progress (update watched percent)
router.post('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const courseId = parseInt(req.params.id, 10);
    const { videoIndex, percent } = req.body;

    if (videoIndex === undefined || percent === undefined) {
      return res.status(400).json({ error: 'videoIndex and percent are required' });
    }

    let progress = await CourseProgress.findOne({ where: { userId, courseId } });

    if (!progress) {
      // Create new progress
      progress = await CourseProgress.create({
        userId,
        courseId,
        completedVideos: [{ index: videoIndex, percent }],
      });
      return res.json({ message: 'Progress created', completedVideos: progress.completedVideos });
    }

    // Make a fresh copy of completedVideos
    const updatedVideos = [...(progress.completedVideos || [])];

    const existingIndex = updatedVideos.findIndex(v => v.index === videoIndex);

    if (existingIndex >= 0) {
      updatedVideos[existingIndex].percent = Math.max(updatedVideos[existingIndex].percent, percent);
    } else {
      updatedVideos.push({ index: videoIndex, percent });
    }

    // Set and mark changed explicitly for Sequelize
    progress.set('completedVideos', updatedVideos);
    progress.changed('completedVideos', true);

    await progress.save();

    res.json({ message: 'Progress updated', completedVideos: progress.completedVideos });
  } catch (err) {
    console.error('Error in POST /progress:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /progress (fetch user progress)
router.get('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const courseId = parseInt(req.params.id, 10);

    const progress = await CourseProgress.findOne({ where: { userId, courseId } });

    if (!progress) {
      return res.json({ completedVideos: [] });
    }

    res.json({ completedVideos: progress.completedVideos });
  } catch (err) {
    console.error('Error in GET /progress:', err);
    res.status(500).json({ error: err.message });
  }
});

  return router;
};
