const Project = require("../../models/Project");
const Task    = require("../../models/Task");
const User    = require("../../models/User");

/**
 * 📊 Get Overview Data (Real-Time Summary)
 * - Filters data based on `companyId`, `startDate`, and `endDate`
 */
const getOverviewData = async (companyId, startDate, endDate) => {
  try {
    const cid        = companyId?.toString();
    const baseFilter = { companyId: cid };
    const dateFilter = {};

    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const totalProjects = await Project.countDocuments({
      ...baseFilter,
      isDeleted: false,
      ...dateFilter,
    });

    const totalStaff = await User.countDocuments({
      companyId: cid,
      isDeleted: false,
      isActive:  true,
      role:      { $ne: "admin" },
      ...dateFilter,
    });

    const totalTasks = await Task.countDocuments({
      companyId: cid,
      ...dateFilter,
    });

    const ongoingTasks = await Task.countDocuments({
      companyId: cid,
      status:    "Ongoing",
      ...dateFilter,
    });

    const completedTasks = await Task.countDocuments({
      companyId: cid,
      status:    "Completed",
      ...dateFilter,
    });

    const toDoTasks = await Task.countDocuments({
      companyId: cid,
      status:    "To Do",
      ...dateFilter,
    });

    const overdueTasks = await Task.countDocuments({
      companyId: cid,
      status:    { $ne: "Completed" },
      dueDate:   { $lt: new Date() },
      ...dateFilter,
    });

    return {
      totalProjects,
      totalStaff,
      totalTasks,
      ongoingTasks,
      completedTasks,
      toDoTasks,
      overdueTasks,
    };
  } catch (error) {
    console.error("❌ Error in getOverviewData:", error);
    throw new Error("Failed to fetch overview data.");
  }
};

/**
 * 📈 Get Chart Data (Trends)
 */
const getChartData = async (companyId, startDate, endDate) => {
  try {
    const cid        = companyId?.toString();
    const baseFilter = { companyId: cid };
    const dateFilter = {};

    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const taskStatusData = await Task.aggregate([
      { $match: { ...baseFilter, ...dateFilter } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const projectStatusData = await Project.aggregate([
      { $match: { ...baseFilter, isDeleted: false, ...dateFilter } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const staffByRoleData = await User.aggregate([
      {
        $match: {
          companyId: cid,
          isDeleted: false,
          isActive:  true,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id:   "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      taskStatusData:    formatChartData(taskStatusData,    "Tasks by Status"),
      projectStatusData: formatChartData(projectStatusData, "Projects by Status"),
      staffByRoleData:   formatChartData(staffByRoleData,   "Staff by Role"),
    };
  } catch (error) {
    console.error("❌ Error in getChartData:", error);
    throw new Error("Failed to fetch chart data.");
  }
};

/**
 * 🛠️ Format Chart Data
 */
const formatChartData = (data, label) => ({
  labels:   data.map(d => d._id || "N/A"),
  datasets: [
    {
      label,
      data: data.map(d => d.count || 0),
      backgroundColor: generateChartColors(data.length),
    },
  ],
});

/**
 * 🎨 Generate HSL Colors
 */
const generateChartColors = (count) =>
  Array.from({ length: count }, (_, i) => `hsl(${(i * 40) % 360}, 70%, 50%)`);

module.exports = {
  getOverviewData,
  getChartData,
};
