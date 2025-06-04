const request = require("supertest");
const app = require("../server");
const Project = require("../models/Project");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Project API Tests", () => {
  let adminUser, token, projectId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a test admin user
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "Admin123!",
      role: "admin",
    });

    // Generate admin JWT token
    token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await Project.deleteMany();
    await User.deleteMany();
    await mongoose.connection.close();
  });

  test("Admin should be able to create a project", async () => {
    const res = await request(app)
      .post("/admin/project")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Project",
        description: "Project Description",
        startDate: "2025-03-01",
        endDate: "2025-12-01",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.project).toHaveProperty("_id");
    projectId = res.body.project._id; // Store project ID for further tests
  });

  test("Admin should be able to get all projects", async () => {
    const res = await request(app)
      .get("/admin/project")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.projects.length).toBeGreaterThan(0);
  });

  test("Admin should be able to get a project by ID", async () => {
    const res = await request(app)
      .get(`/admin/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.project._id).toBe(projectId);
  });

  test("Admin should be able to update a project", async () => {
    const res = await request(app)
      .put(`/admin/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Project Name",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.updatedProject.name).toBe("Updated Project Name");
  });

  test("Admin should be able to delete a project", async () => {
    const res = await request(app)
      .delete(`/admin/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message", "Project deleted successfully");
  });

  test("Should return 404 for a non-existent project", async () => {
    const res = await request(app)
      .get(`/admin/project/605c72df9f1b2c001f6e9d99`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Project not found");
  });
});

