// models/courseProgress.js
import { DataTypes } from 'sequelize';

const defineCourseProgress = (sequelize) => {
  const CourseProgress = sequelize.define('CourseProgress', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Store progress per video: [{ index: 0, percent: 100 }, { index: 1, percent: 50 }]
    completedVideos: {
      type: DataTypes.JSONB, // Use DataTypes.JSON if using MySQL
      allowNull: false,
      defaultValue: [],
    },
  });

  CourseProgress.associate = (models) => {
    CourseProgress.belongsTo(models.Course, { foreignKey: 'courseId' });
  };

  return CourseProgress;
};

export default defineCourseProgress;