const request = require("supertest");
const app = require("../server");
const db = require("./testDb");
const Career = require("../models/Career");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const user = { name: "Career Tester", email: "careers@example.com", password: "Passw0rd!123" };

async function getToken() {
  await request(app).post("/api/auth/register").send(user);
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
  return res.body.token;
}

describe("careers API", () => {
  test("returns careers for a signed-in user", async () => {
    // Raw insert skips schema validation, so the test does not depend on enum values
    await Career.collection.insertOne({
      title: "Test Developer",
      category: "Technology",
      description: "Sample career for tests",
      requiredSkills: [{ name: "JavaScript", requiredLevel: "Intermediate" }],
    });
    const token = await getToken();

    const res = await request(app).get("/api/careers").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.careers || res.body.data || [];
    expect(list.map((c) => c.title)).toContain("Test Developer");
  });

  test("returns an empty list when there are no careers", async () => {
    const token = await getToken();
    const res = await request(app).get("/api/careers").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.careers || res.body.data || [];
    expect(list).toHaveLength(0);
  });
});