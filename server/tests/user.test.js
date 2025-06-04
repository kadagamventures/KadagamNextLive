const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("User API Tests", () => {
  let adminUser, normalUser, token, userId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a test admin user
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "Admin123!",
      role: "admin",
      permissions: ["add_staff", "edit_staff", "delete_staff"],
    });

    // Generate admin JWT token
    token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await User.deleteMany();
    await mongoose.connection.close();
  });

  test("Admin should be able to create a staff user", async () => {
    const res = await request(app)
      .post("/admin/staff")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test User",
        email: "testuser@example.com",
        password: "Test123!",
        role: "staff",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Staff created successfully");
    userId = res.body.staff._id; // Store user ID for further tests
  });

  test("Admin should be able to get all staff", async () => {
    const res = await request(app)
      .get("/admin/staff")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("Admin should be able to get a staff user by ID", async () => {
    const res = await request(app)
      .get(`/admin/staff/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id", userId);
  });

  test("Admin should be able to update a staff user", async () => {
    const res = await request(app)
      .put(`/admin/staff/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated User",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Staff updated successfully");
  });

  test("Admin should be able to delete a staff user", async () => {
    const res = await request(app)
      .delete(`/admin/staff/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Staff deleted successfully");
  });

  test("Should return 404 for a non-existent user", async () => {
    const res = await request(app)
      .get(`/admin/staff/605c72df9f1b2c001f6e9d99`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Staff not found");
  });
});

