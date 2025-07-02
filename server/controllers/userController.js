const User = require("../models/User");
const userService = require("../services/userService");
const fileService = require("../services/awsService");
const emailService = require("../services/emailService");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const tokenUtils = require("../utils/tokenUtils");

const addStaff = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  let { name, email, role, salary, phone, assignedProjects, permissions = [], assignedTeam, staffId } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email are required." });
  }

  assignedProjects = typeof assignedProjects === "string"
    ? JSON.parse(assignedProjects || "[]")
    : assignedProjects;
  permissions = typeof permissions === "string"
    ? JSON.parse(permissions || "[]")
    : permissions;

  if (await userService.getStaffByEmail(email, companyId)) {
    return res.status(400).json({ message: "Email is already in use." });
  }

  const finalStaffId = staffId?.trim() || await userService.generateUniqueStaffId(companyId);
  if (await userService.isStaffIdTaken(finalStaffId, companyId)) {
    return res.status(400).json({
      message: "Staff ID is already taken.",
      suggestedId: await userService.generateUniqueStaffId(companyId)
    });
  }

  const rawPassword = userService.generateSecurePassword();
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  let profilePicUrl = "", resumeUrl = "";
  if (req.files) {
    const pp = req.files.profilePic?.[0];
    const rs = req.files.resume?.[0];
    if (pp) {
      profilePicUrl = await fileService.uploadStaffFile(
        pp.buffer, pp.mimetype,
        { fileType: "profilePic", staffId: finalStaffId, companyId }
      );
    }
    if (rs) {
      resumeUrl = await fileService.uploadStaffFile(
        rs.buffer, rs.mimetype,
        { fileType: "resume", staffId: finalStaffId, companyId }
      );
    }
  }

  const staff = await userService.createStaff({
    name,
    email: email.toLowerCase(),
    role,
    team: assignedTeam || null,
    staffId: finalStaffId,
    password: hashedPassword,
    salary,
    phone,
    assignedProjects,
    permissions,
    profilePic: profilePicUrl,
    resume: resumeUrl,
    companyId
  });

   try {
    await emailService.sendEmail(
      staff.email,
      "Your Nithya Task Manager Credentials",
      "",
      `<p>Hello ${staff.name},</p>
       <p><strong>Company ID:</strong> ${req.user.companyId}</p>
       <p><strong>Staff ID:</strong> ${finalStaffId}</p>
       <p><strong>Password:</strong> ${rawPassword}</p>`,
      req.user.companyName,
      req.user.companyId         
    );
  } catch (emailErr) {
    console.error(`❌ Email to ${staff.email} failed:`, emailErr.message);
  }


  res.status(201).json({
    success: true,
    message: "Staff created and emailed successfully",
    staff,
    rawPassword 
  });
});

const updateStaff = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const { email, staffId } = req.body;

  // Email and staffId uniqueness checks
  if (email) {
    const existingUser = await userService.getStaffByEmail(email, companyId);
    if (existingUser && existingUser._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "Email is already in use." });
    }
  }
  if (staffId) {
    const existingCheck = await User.findOne({ staffId, companyId });
    if (existingCheck && existingCheck._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "Staff ID is already taken." });
    }
  }

  // Parse arrays from formdata or JSON string
  const updatedData = { ...req.body };
  try {
    updatedData.assignedProjects = Array.isArray(req.body.assignedProjects)
      ? req.body.assignedProjects
      : JSON.parse(req.body.assignedProjects || "[]");
    updatedData.permissions = Array.isArray(req.body.permissions)
      ? req.body.permissions
      : JSON.parse(req.body.permissions || "[]");
  } catch {
    return res.status(400).json({ message: "Invalid project or permission format." });
  }

  const existingStaff = await userService.getStaffById(req.params.id, companyId);
  if (!existingStaff) {
    return res.status(404).json({ message: "Staff not found" });
  }

  // --------- FILE HANDLING ---------
  try {
    // Handle Profile Pic
    const pp = req.files?.profilePic?.[0];
    if (pp) {
      // New file uploaded
      updatedData.profilePic = await fileService.uploadStaffFile(
        pp.buffer, pp.mimetype,
        { fileType: "profilePic", staffId: staffId || existingStaff.staffId, companyId }
      );
    } else if (typeof req.body.profilePic === "string" && req.body.profilePic.trim() !== "") {
      // No file, but field present and not empty: retain previous S3 url string
      updatedData.profilePic = req.body.profilePic;
    } else if (typeof req.body.profilePic === "string" && req.body.profilePic === "") {
      // Explicit empty string: user wants to remove the file
      updatedData.profilePic = null;
    } else {
      // Field not present: fallback to previous value
      updatedData.profilePic = existingStaff.profilePic;
    }

    // Handle Resume
    const rs = req.files?.resume?.[0];
    if (rs) {
      updatedData.resume = await fileService.uploadStaffFile(
        rs.buffer, rs.mimetype,
        { fileType: "resume", staffId: staffId || existingStaff.staffId, companyId }
      );
    } else if (typeof req.body.resume === "string" && req.body.resume.trim() !== "") {
      updatedData.resume = req.body.resume;
    } else if (typeof req.body.resume === "string" && req.body.resume === "") {
      updatedData.resume = null;
    } else {
      updatedData.resume = existingStaff.resume;
    }
  } catch (uploadErr) {
    console.error("❌ Upload failed:", uploadErr);
    return res.status(500).json({ message: "Upload error", error: uploadErr.message });
  }
  // --------- END FILE HANDLING ---------

  try {
    const updatedStaff = await userService.updateStaff(req.params.id, updatedData, companyId);
    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff not found after update" });
    }

    if (updatedData.permissions) {
      await tokenUtils.blacklistUserTokens(updatedStaff._id);
    }

    const staffList = await userService.getAllStaff(companyId);
    res.status(200).json({
      success: true,
      updatedStaff,
      staffList,
      message: "Staff updated successfully. Re-login required for permission changes."
    });
  } catch (err) {
    console.error("❌ Staff update error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});


const deleteStaff = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const deleted = await User.findOneAndDelete({
    _id: req.params.id,
    companyId
  });
  if (!deleted) {
    return res.status(404).json({ message: "Staff not found or already deleted." });
  }
  // also delete related data
  await userService.deleteStaff(deleted._id, companyId);
  res.status(200).json({ success: true, message: "Staff and associated data hard-deleted successfully." });
});

const getAllStaff = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const staffList = await userService.getAllStaff(companyId);
  res.status(200).json({ success: true, staffList });
});

const getStaffById = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const staff = await userService.getStaffById(req.params.id, companyId);
  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }

  const normalize = f => (typeof f === "string" ? f : "");
  const presign = async url => {
    if (!url.startsWith("http")) return "";
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    return await fileService.generatePresignedUrl(key);
  };

  const profilePic = normalize(staff.profilePic);
  const resume = normalize(staff.resume);

  res.status(200).json({
    success: true,
    staff: {
      ...staff,
      profilePic: (await presign(profilePic)) || profilePic,
      resume: (await presign(resume)) || resume
    }
  });
});

const getStaffByEmail = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const staff = await userService.getStaffByEmail(req.body.email, companyId);
  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }
  res.status(200).json({ success: true, staff });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const staff = await userService.getStaffById(req.params.id, companyId);
  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }
  res.status(200).json({ success: true, staff });
});

const getStaffFormData = asyncHandler(async (req, res) => {
  const projects = await userService.getAvailableProjects();
  const teams = await userService.getAvailableTeams();
  res.status(200).json({ projects, teams });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const staff = await userService.getMyProfile(req.user.id, companyId);
  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }

  let signedProfilePic = "";
  if (typeof staff.profilePic === "string" && staff.profilePic.trim()) {
    try {
      const key = decodeURIComponent(new URL(staff.profilePic).pathname.slice(1));
      signedProfilePic = await fileService.generatePresignedUrl(key);
    } catch {
      signedProfilePic = staff.profilePic;
    }
  }

  res.status(200).json({ success: true, staff: { ...staff, profilePic: signedProfilePic } });
});

const checkStaffId = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  const taken = await userService.isStaffIdTaken(req.query.staffId, companyId);
  res.status(taken ? 400 : 200).json({
    valid: !taken,
    message: taken ? "Staff ID is already taken." : "Staff ID is available"
  });
});

const uploadStaffProfilePic = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const updatedStaff = await userService.updateStaffProfilePic(
    req.params.id,
    req.file.location || req.file.path,
    companyId
  );
  if (!updatedStaff) return res.status(404).json({ message: "Staff not found" });
  res.status(200).json({ success: true, updatedStaff });
});

const uploadStaffResume = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId.toString();
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const updatedStaff = await userService.updateStaffResume(
    req.params.id,
    req.file.location || req.file.path,
    companyId
  );
  if (!updatedStaff) return res.status(404).json({ message: "Staff not found" });
  res.status(200).json({ success: true, updatedStaff });
});

const deleteStaffFile = asyncHandler(async (req, res) => {
  const { fileKey } = req.body;
  if (!fileKey) return res.status(400).json({ message: "fileKey is required" });
  await userService.deleteStaffFileByKey(fileKey);
  res.status(200).json({ success: true, message: "File deleted successfully" });
});

module.exports = {
  addStaff,
  getAllStaff,
  getStaffById,
  getStaffByEmail,
  getUserProfile,
  updateStaff,
  deleteStaff,
  uploadStaffProfilePic,
  uploadStaffResume,
  checkStaffId,
  getMyProfile,
  getStaffFormData,
  deleteStaffFile
};
