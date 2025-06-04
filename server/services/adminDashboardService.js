const Task    = require("../models/Task");
const Project = require("../models/Project");
const User    = require("../models/User");

/**
 * ✅ Get Dashboard Summary Overview (Multi-Tenant Scoped)
 */
const getOverviewData = async (companyId) => {
  const cid = companyId?.toString();

  // Projects and users still use soft‐delete
  const totalProjects = await Project.countDocuments({
    companyId: cid,
    isDeleted: false,
  });

  const totalStaff = await User.countDocuments({
    companyId: cid,
    isDeleted: false,
    role: { $ne: "admin" },
  });

  // Tasks are now hard‐deleted, so no isDeleted filter
  const totalTasks = await Task.countDocuments({
    companyId: cid,
  });

  const completedTasks = await Task.countDocuments({
    companyId: cid,
    status: "Completed",
  });

  const ongoingTasks = await Task.countDocuments({
    companyId: cid,
    status: "Ongoing",
  });

  return {
    totalProjects,
    totalStaff,
    totalTasks,
    completedTasks,
    ongoingTasks,
  };
};

/**
 * ✅ Get Bar and Pie Chart Data (Multi-Tenant Scoped)
 */
const getChartData = async (companyId) => {
  const cid = companyId?.toString();
  const overview = await getOverviewData(cid);

  const barData = [
    { name: "Total Projects",  value: overview.totalProjects  },
    { name: "Total Staff",     value: overview.totalStaff     },
    { name: "Total Tasks",     value: overview.totalTasks     },
    { name: "Completed Tasks", value: overview.completedTasks },
    { name: "Ongoing Tasks",   value: overview.ongoingTasks   },
  ];

  // Count remaining "To Do" tasks (hard‐deleted ones are gone)
  const pending = await Task.countDocuments({
    companyId: cid,
    status: "To Do",
  });

  const pieData = [
    { name: "Pending",   value: pending                 },
    { name: "Ongoing",   value: overview.ongoingTasks   },
    { name: "Completed", value: overview.completedTasks },
  ];

  return { barData, pieData };
};

module.exports = {
  getOverviewData,
  getChartData,
};
