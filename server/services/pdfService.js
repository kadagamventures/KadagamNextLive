const PDFDocument = require("pdfkit");
const patchTable = require("../utils/pdfTablePlugin");

const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Leave = require("../models/Leave");

// 🧱 Patch PDFKit to support table rendering
function createDocWithTableSupport() {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });
  patchTable(doc);
  return doc;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toISOString().split("T")[0];
}

async function finalizeDoc(doc, buffers) {
  doc.end();
  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(buffers);
      if (!buffer || buffer.length === 0) {
        return reject(new Error("❌ PDF buffer is empty — nothing generated."));
      }
      resolve(buffer);
    });
    doc.on("error", reject);
  });
}

async function generateAttendancePDF(month, year, companyId) {
  const doc = createDocWithTableSupport();
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  let results = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start, $lt: end },
        companyId
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",            // ← updated here
        foreignField: "_id",
        as: "staffDetails"
      }
    },
    { $unwind: "$staffDetails" },
    {
      $match: { "staffDetails.companyId": companyId }
    },
    {
      $group: {
        _id: "$staffDetails.staffId",    // remains staffDetails.staffId
        name: { $first: "$staffDetails.name" },
        present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
        totalHours: { $avg: "$totalHours" }
      }
    },
    {
      $project: {
        staffId: "$_id",
        name: 1,
        present: 1,
        avgHours: { $round: ["$totalHours", 1] }
      }
    }
  ]);

  const daysInMonth = new Date(year, parseInt(month, 10), 0).getDate();

  if (!results.length) {
    results = [{
      staffId: "N/A",
      name: "No Data",
      present: 0,
      avgHours: 0,
      absent: daysInMonth
    }];
  } else {
    results.forEach(r => {
      r.absent = daysInMonth - (r.present || 0);
    });
  }

  doc
    .fontSize(16)
    .text(`Attendance Report - ${month}-${year}`, { align: "center", underline: true })
    .moveDown(1);

  try {
    await doc.table({
      headers: ["Staff ID", "Name", "Present", "Absent", "Avg Hours"],
      rows: results.map(r => [
        r.staffId || "-",
        r.name?.replace(/\s+/g, " ").trim() || "-",
        r.present?.toString() || "0",
        r.absent?.toString() || "0",
        r.avgHours?.toString() || "0.0"
      ])
    }, {
      columnsSize: [70, 160, 60, 60, 80],
      columnSpacing: 10,
      padding: 6,
      minRowHeight: 20,
      prepareRow: (row, i) => {
        row.cells[0].options = { wrap: true };
        row.cells[1].options = { wrap: true };
      }
    });
  } catch (err) {
    console.error("❌ PDF table rendering error:", err);
    throw new Error("Failed to render table in attendance PDF.");
  }

  return await finalizeDoc(doc, buffers);
}


async function generateTaskPDF(month, year, companyId) {
  const doc = createDocWithTableSupport();
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const tasks = await Task.find({
    companyId,
    createdAt: { $gte: start, $lt: end }
  }).populate("assignedTo");

  doc
    .fontSize(16)
    .text(`Task Report - ${month}-${year}`, {
      align: "center",
      underline: true
    })
    .moveDown(1);

  const rows = tasks.length
    ? tasks.map((task) => {
        const taskTitle = String(task.title || "Untitled Task").trim();
        const assignedTo = String(task.assignedTo?.name || "N/A").trim();
        const status = task.status || "-";
        const isCompleted = status === "Completed";
        const isOverdue = task.dueDate && task.dueDate < end && !isCompleted;

        return [
          taskTitle,
          assignedTo,
          status,
          isCompleted ? "100%" : "0%",
          isOverdue ? "Yes" : "No"
        ];
      })
    : [["No Tasks", "-", "-", "-", "-"]];

  await doc.table(
    {
      headers: ["Task Name", "Assigned To", "Status", "Completion %", "Overdue"],
      rows
    },
    {
      width: 495,
      columnWidths: [180, 120, 80, 80, 60],
      columnSpacing: 5,
      minRowHeight: 25,
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11),
      prepareRow: (row, i) => doc.font("Helvetica").fontSize(10),
      padding: 4,
      wrap: true
    }
  );

  return await finalizeDoc(doc, buffers);
}

async function generateProjectPDF(month, year, companyId) {
  const doc = createDocWithTableSupport();
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  // Fetch projects for the company only
  const projects = await Project.find({
    companyId,
    createdAt: { $lte: end }
  });

  const rows = [];

  for (const project of projects) {
    const tasks = await Task.find({
      projects: project._id,
      companyId,
      createdAt: { $gte: start, $lt: end },
      isDeleted: false,
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const overdue = tasks.filter(t => t.dueDate < end && t.status !== "Completed").length;

    const percent = total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";
    const name = project.name?.length > 30 ? project.name.slice(0, 30) + "…" : project.name || "-";

    rows.push([
      name,
      String(total),
      percent,
      String(overdue),
      project.status || "-"
    ]);
  }

  if (rows.length === 0) {
    rows.push(["N/A", "0", "0%", "0", "-"]);
  }

  doc
    .fontSize(16)
    .text(`Project Report - ${month}-${year}`, {
      align: "center",
      underline: true
    })
    .moveDown(1);

  await doc.table({
    headers: ["Project", "Total Tasks", "Completed %", "Overdue Tasks", "Status"],
    rows,
  }, {
    columnWidths: [160, 90, 90, 100, 90],
    minRowHeight: 20,
    padding: 6,
  });

  return await finalizeDoc(doc, buffers);
}

async function generateStaffPDF(month, year, companyId) {
  const doc = createDocWithTableSupport();
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const allTasks = await Task.find({
    companyId,
    createdAt: { $lt: end }
  });

  const allAttendance = await Attendance.find({
    companyId,
    date: { $gte: start, $lt: end }
  });

  const users = await User.find({
    role: { $ne: "admin" },
    companyId
  });

  const totalWorkingDays = new Date(year, month, 0).getDate();

  doc
    .fontSize(16)
    .text(`Staff Performance Report - ${month}-${year}`, {
      align: "center",
      underline: true
    })
    .moveDown(1);

  const rows = users.length
    ? users.map((u) => {
        const name = u.name?.length > 25 ? u.name.slice(0, 25) + "…" : u.name || "-";

        const userAttendance = allAttendance.filter(a => String(a.staff) === String(u._id));
        const presentDays = userAttendance.filter(a => a.status === "Present").length;
        const attendanceRate = totalWorkingDays > 0
          ? (presentDays / totalWorkingDays) * 100
          : 0;

        const userTasks = allTasks.filter(t => String(t.assignedTo) === String(u._id));
        const completedTasks = userTasks.filter(t => t.status === "Completed").length;
        const taskRate = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;

        const efficiencyScore = Math.round(((attendanceRate + taskRate) / 20) * 10) / 10;

        return [
          u.staffId || "-",
          name,
          `${Math.round(attendanceRate)}%`,
          `${Math.round(taskRate)}%`,
          `${efficiencyScore}/10`
        ];
      })
    : [["N/A", "No Staff", "0%", "0%", "0/10"]];

  await doc.table({
    headers: ["Staff ID", "Name", "Attendance %", "Tasks Done %", "Score"],
    rows,
  }, {
    columnWidths: [80, 160, 100, 100, 80],
    minRowHeight: 20,
    columnSpacing: 8,
    padding: 5,
  });

  return await finalizeDoc(doc, buffers);
}
async function generateLeavePDF(month, year, companyId) {
  const doc = createDocWithTableSupport();
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  // 🧑‍💼 Only users from the current tenant
  const users = await User.find({ companyId });

  const leaveMap = {};

  const leaves = await Leave.find({
    companyId,
    startDate: { $lt: end },
    endDate: { $gte: start },
    status: "approved"
  });

  for (const leave of leaves) {
    const sid = leave.staff.toString();
    if (!leaveMap[sid]) leaveMap[sid] = [];
    leaveMap[sid].push({
      from: leave.startDate,
      to: leave.endDate
    });
  }

  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start, $lt: end },
        companyId
      }
    },
    {
      $group: {
        _id: "$staff",
        presentDays: {
          $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] }
        }
      }
    }
  ]);

  const statMap = {};
  for (const stat of attendanceStats) {
    statMap[stat._id.toString()] = {
      present: stat.presentDays,
      absent: stat.absentDays
    };
  }

  doc
    .fontSize(16)
    .text(`Leave Report - ${month}-${year}`, {
      align: "center",
      underline: true
    })
    .moveDown(1);

  await doc.table({
    headers: ["Staff ID", "Name", "Month", "Leave Dates", "Present / Absent"],
    rows: users.length
      ? users.map((u) => {
          const sid = u._id.toString();

          const leaveDates = (leaveMap[sid] || [])
            .map((d) => `${formatDate(d.from)}–${formatDate(d.to)}`)
            .join(", ") || "-";

          const stats = statMap[sid] || {};
          const present = stats.present || 0;
          const absent = stats.absent || 0;

          const name = u.name?.length > 25 ? u.name.slice(0, 25) + "…" : u.name || "-";

          return [
            u.staffId || "-",
            name,
            `${month}-${year}`,
            leaveDates,
            `${present} / ${absent}`
          ];
        })
      : [["N/A", "No Data", `${month}-${year}`, "-", "0 / 0"]],
    columnWidths: [70, 150, 80, 170, 100],
    minRowHeight: 20
  });

  return await finalizeDoc(doc, buffers);
}


module.exports = {
  generateAttendancePDF,
  generateTaskPDF,
  generateProjectPDF,
  generateStaffPDF,
  generateLeavePDF
};
