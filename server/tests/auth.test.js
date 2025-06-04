const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Authentication API Tests", () => {
  let testUser;
  let token;

  beforeAll(async () => {
    // Connect to the test database
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    // Create a test user
    testUser = await User.create({
      name: "Test User",
      email: "testuser@example.com",
      password: "Password123!",
      role: "staff",
    });

    // Generate a JWT token
    token = jwt.sign({ id: testUser._id, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await User.deleteMany();
    await mongoose.connection.close();
  });

  test("User should be able to register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "New User",
      email: "newuser@example.com",
      password: "NewPassword123!",
      role: "staff",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "User registered successfully");
  });

  test("User should be able to login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "testuser@example.com",
      password: "Password123!",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("Should not allow login with wrong credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "testuser@example.com",
      password: "WrongPassword!",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Invalid credentials");
  });

  test("Should allow access to protected route with valid token", async () => {
    const res = await request(app)
      .get("/api/protected-route")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Protected data accessed");
  });

  test("Should deny access to protected route without token", async () => {
    const res = await request(app).get("/api/protected-route");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Access denied. No token provided.");
  });

  test("Should deny access to protected route with invalid token", async () => {
    const res = await request(app)
      .get("/api/protected-route")
      .set("Authorization", "Bearer invalidToken");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Invalid or expired token.");
  });
});

