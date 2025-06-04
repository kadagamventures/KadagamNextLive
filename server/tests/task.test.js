const request = require("supertest");
const app = require("../server");
const Task = require("../models/Task");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Task API Tests", () => {
  let adminUser, normalUser, token, taskId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a test admin user
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "Admin123!",
      role: "admin",
      permissions: ["create_task", "edit_task", "delete_task"],
    });

    // Create a normal user
    normalUser = await User.create({
      name: "Normal User",
      email: "user@example.com",
      password: "User123!",
      role: "staff",
    });

    // Generate admin JWT token
    token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await Task.deleteMany();
    await User.deleteMany();
    await mongoose.connection.close();
  });

  test("Admin should be able to create a task", async () => {
    const res = await request(app)
      .post("/task")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Task",
        description: "This is a test task",
        assignedTo: normalUser._id,
        dueDate: "2025-04-01",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("title", "Test Task");
    taskId = res.body._id; // Store task ID for further tests
  });

  test("Admin should be able to get all tasks", async () => {
    const res = await request(app)
      .get("/task")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("Admin should be able to get a task by ID", async () => {
    const res = await request(app)
      .get(`/task/${taskId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id", taskId);
  });

  test("Admin should be able to update a task", async () => {
    const res = await request(app)
      .put(`/task/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Task",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("title", "Updated Task");
  });

  test("Admin should be able to delete a task", async () => {
    const res = await request(app)
      .delete(`/task/${taskId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Task deleted successfully");
  });

  test("Should return 404 for a non-existent task", async () => {
    const res = await request(app)
      .get(`/task/605c72df9f1b2c001f6e9d99`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Task not found");
  });
});

