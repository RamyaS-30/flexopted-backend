export default (sequelize, DataTypes) => {
  const Course = sequelize.define('Course', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    instructor: { type: DataTypes.STRING, allowNull: false },
    videoLinks: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] }
  });

  return Course;
};