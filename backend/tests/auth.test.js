const request = require("supertest");
const app = require("../server");
const db = require("./testDb");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const user = { name: "Test User", email: "test@example.com", password: "Passw0rd!123" };

describe("auth API", () => {
  test("registers a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect([200, 201]).toContain(res.status);
  });

  test("rejects an invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...user, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  test("rejects a short password", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...user, password: "short" });
    expect(res.status).toBe(400);
  });

  test("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/register").send(user);
    expect([400, 409]).toContain(res.status);
  });

  test("logs in and returns a token", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  test("rejects a wrong password", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "WrongPass123" });
    expect([400, 401]).toContain(res.status);
  });

  test("rejects an object instead of a string (NoSQL injection)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
  });

  test("/me requires a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("/me returns the signed-in user", async () => {
    await request(app).post("/api/auth/register").send(user);
    const login = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(user.email);
  });
});

describe("unknown routes", () => {
  test("returns a JSON 404", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toBeTruthy();
  });
});