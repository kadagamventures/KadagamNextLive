const User = require("../models/User");
const Task = require("../models/Task");
const File = require("../models/File");
const Attendance = require("../models/Attendance");
const Performance = require("../models/Performance");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { S3Client, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const awsService = require("../services/awsService");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Helper to extract S3 key from URL
const extractFileKey = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const base = url.split("?")[0];
    const m = base.match(/\/([^/]+\/[^/]+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

const allPermissions = ["manage_staff", "manage_project", "manage_task"];
const permissionMap = {
  "All Permission": allPermissions,
  manage_task: ["manage_task"],
  manage_staff: ["manage_staff"],
  manage_project: ["manage_project"],
  "No Permission": [],
};

const safeParseArray = (val) => {
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val || "[]");
  } catch {
    return [];
  }
};

class UserService {
  static async generateUniqueStaffId(companyId) {
    const cid = companyId.toString();
    let id;
    while (true) {
      id = String(Math.floor(1000 + Math.random() * 9000));
      const exists = await User.exists({ staffId: id, companyId: cid });
      if (!exists) break;
    }
    return id;
  }

  static async isStaffIdTaken(staffId, companyId) {
    return await User.exists({ staffId, companyId: companyId.toString() });
  }

  static generateSecurePassword() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  static normalizePermissions(perms) {
    if (!Array.isArray(perms) || perms.length === 0) return [];
    if (perms.includes("All Permission")) return [...new Set(allPermissions)];
    if (perms.includes("No Permission")) return [];
    return [...new Set(perms.flatMap((p) => permissionMap[p] || []))];
  }

  static async createStaff(data) {
    const {
      name,
      email,
      role,
      staffId,
      password,
      salary,
      phone,
      assignedProjects,
      profilePic,
      resume,
      permissions,
      team,
      companyId,
    } = data;
    const cid = companyId.toString();

    if (await this.isStaffIdTaken(staffId, cid)) {
      throw new Error("Staff ID is already taken.");
    }

    let pwdHash;
    if (password.startsWith("$2") && password.length === 60) {
      pwdHash = password;
    } else {
      pwdHash = await bcrypt.hash(password, 10);
    }

    const mappedPerms = this.normalizePermissions(safeParseArray(permissions));

    const user = new User({
      name,
      email: email.toLowerCase(),
      role,
      staffId,
      password: pwdHash,
      salary,
      phone,
      assignedProjects: safeParseArray(assignedProjects),
      profilePic: profilePic || null,
      resume: resume || null,
      permissions: mappedPerms,
      team: typeof team === "string" ? team : null,
      companyId: cid,
      isDeleted: false,
      isActive: true,
    });
    await user.save();
    return user;
  }

  static async getAllStaff(companyId) {
    return await User.find({ companyId: companyId.toString(), isDeleted: false })
      .select("-password")
      .populate("assignedProjects", "name description")
      .lean();
  }

  static async getActiveStaffForDropdown(companyId) {
    return await User.find({
      companyId: companyId.toString(),
      isActive: true,
      isDeleted: false,
    })
      .select("_id name email role")
      .lean();
  }

  static async getStaffById(id, companyId) {
    return await User.findOne({
      _id: id,
      companyId: companyId.toString(),
      isDeleted: false,
    })
      .select({
        password: 0,
        isDeleted: 0,
        isActive: 0,
        createdAt: 0,
        updatedAt: 0,
      })
      .populate("assignedProjects", "name description")
      .lean();
  }

  static async getStaffByEmail(email, companyId) {
    return await User.findOne({
      email: email.toLowerCase(),
      companyId: companyId.toString(),
      isDeleted: false,
    })
      .select("-password")
      .populate("assignedProjects", "name description")
      .lean();
  }

  static async getMyProfile(id, companyId) {
  const s = await User.findOne({
    _id: id,
    companyId: companyId.toString(),
    isDeleted: false,
  })
    .select("name email phone role salary staffId profilePic resume assignedProjects team")
    .populate("assignedProjects", "name description")
    .lean();

  if (!s) return null;

  const extractUrl = (f) =>
    typeof f === "string" ? f :
    typeof f === "object" && f?.fileUrl ? f.fileUrl :
    "";

  return {
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    salary: s.salary,
    staffId: s.staffId,
    profilePic: extractUrl(s.profilePic),
    resume: extractUrl(s.resume),
    assignedProjects: s.assignedProjects,
    team: s.team || null,
  };
}


  static async updateStaff(id, updateData, companyId) {
    const cid = companyId.toString();
    const staff = await User.findOne({ _id: id, companyId: cid });
    if (!staff) throw new Error("Staff not found.");

    updateData.assignedProjects = safeParseArray(updateData.assignedProjects);
    updateData.permissions = this.normalizePermissions(
      safeParseArray(updateData.permissions)
    );

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const getUrlString = (val) => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (val.fileUrl) return val.fileUrl;
      return "";
    };

    const oldProfile = getUrlString(staff.profilePic);
    const newProfile = getUrlString(updateData.profilePic);
    const oldResume = getUrlString(staff.resume);
    const newResume = getUrlString(updateData.resume);

    const toDelete = [];
    if (updateData.profilePic && newProfile !== oldProfile) {
      toDelete.push(extractFileKey(oldProfile));
    }
    if (updateData.resume && newResume !== oldResume) {
      toDelete.push(extractFileKey(oldResume));
    }

    const keys = toDelete.filter(Boolean).map((Key) => ({ Key }));
    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: keys },
        })
      );
    }

    const payload = {
      name: updateData.name ?? staff.name,
      email: (updateData.email ?? staff.email).toLowerCase(),
      phone: updateData.phone ?? staff.phone,
      salary: updateData.salary ?? staff.salary,
      role: updateData.role ?? staff.role,
      staffId: updateData.staffId ?? staff.staffId,
      assignedProjects: updateData.assignedProjects,
      permissions: updateData.permissions,
      team: typeof updateData.team === "string" ? updateData.team : staff.team,
      profilePic: updateData.profilePic ?? staff.profilePic,
      resume: updateData.resume ?? staff.resume,
    };

    const updated = await User.findOneAndUpdate(
      { _id: id, companyId: cid, isDeleted: false },
      payload,
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updated) throw new Error("Staff not found after update.");
    return updated;
  }

  static async deleteStaff(id, companyId) {
  const cid = companyId.toString();
  const staff = await User.findOne({ _id: id, companyId: cid });
  if (!staff) return null;

  // Collect S3 keys
  const keys = [];
  [staff.profilePic, staff.resume].forEach((url) => {
    const k = extractFileKey(url);
    if (k) keys.push({ Key: k });
  });

  const uploads = await File.find({ uploadedBy: staff._id });
  uploads.forEach((f) => {
    const k = extractFileKey(f.fileURL);
    if (k) keys.push({ Key: k });
  });

  // Remove related data
  await File.deleteMany({ uploadedBy: staff._id });
  await Promise.all([
    Task.deleteMany({ assignedTo: staff._id, companyId: cid }),
    Attendance.deleteMany({ userId: staff._id,   companyId: cid }), // updated field
    Performance.deleteMany({ userId: staff._id,   companyId: cid }), // updated field
  ]);

  // Delete files from S3
  if (keys.length) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: keys },
      })
    );
  }

  // Soft-delete the user
  await User.findByIdAndUpdate(
    staff._id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  return true;
}

  static async updateStaffProfilePic(id, profilePicUrl, companyId) {
    const staff = await User.findOne({
      _id: id,
      companyId: companyId.toString(),
      isDeleted: false,
    });
    if (!staff) throw new Error("Staff not found.");
    await this.deleteStaffFiles(staff.profilePic, null);
    staff.profilePic = profilePicUrl;
    await staff.save();
    return staff;
  }

  static async updateStaffResume(id, resumeUrl, companyId) {
    const staff = await User.findOne({
      _id: id,
      companyId: companyId.toString(),
      isDeleted: false,
    });
    if (!staff) throw new Error("Staff not found.");
    await this.deleteStaffFiles(null, staff.resume);
    staff.resume = resumeUrl;
    await staff.save();
    return staff;
  }

  static async deleteStaffFiles(profilePic, resume) {
    const keys = [];
    [profilePic, resume].forEach((url) => {
      const k = extractFileKey(url);
      if (k) keys.push({ Key: k });
    });
    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: keys },
        })
      );
    }
  }

  static async deleteStaffFileByKey(fileKey) {
    if (!fileKey || typeof fileKey !== "string") {
      throw new Error("Invalid or missing fileKey.");
    }
    await awsService.deleteFile(fileKey);
    return { success: true, message: "File deleted successfully." };
  }

  static async getAvailableProjects() {
    return [
      { _id: "1", name: "Project A" },
      { _id: "2", name: "Project B" },
    ];
  }

  static async getAvailableTeams() {
    return ["Team A", "Team B", "Team C"];
  }
}

module.exports = UserService;
