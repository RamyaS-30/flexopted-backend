// models/enrollment.js
import { DataTypes } from 'sequelize';

const defineEnrollment = (sequelize) => {
  const Enrollment = sequelize.define('Enrollment', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: { type: DataTypes.STRING, allowNull: false, defaultValue:'' },
    email: { type: DataTypes.STRING, allowNull: false, defaultValue:'' },
  });

  Enrollment.associate = (models) => {
    Enrollment.belongsTo(models.Course, { foreignKey: 'courseId' });
  };

  return Enrollment;
};

export default defineEnrollment;