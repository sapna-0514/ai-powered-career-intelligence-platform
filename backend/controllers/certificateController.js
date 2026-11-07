const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");
const { STORAGE_DIR } = require("../middleware/certificateUpload");

const MAX_CERTIFICATES_PER_USER = 100;
const MAX_SKILLS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------ helpers ------------------------------ */

const toDto = (c) => ({
  _id: c._id,
  title: c.title,
  issuer: c.issuer,
  issueDate: c.issueDate,
  expiryDate: c.expiryDate || null,
  credentialId: c.credentialId || "",
  credentialUrl: c.credentialUrl || "",
  skills: c.skills || [],
  // storedName is intentionally not exposed
  file: c.file && c.file.storedName
    ? { originalName: c.file.originalName, mimeType: c.file.mimeType, size: c.file.size }
    : null,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

async function removeStored(name) {
  if (!name) return;
  try {
    await fs.promises.unlink(path.join(STORAGE_DIR, path.basename(name)));
  } catch (e) {
    if (e.code !== "ENOENT") console.error("Remove certificate file error:", e.message);
  }
}

function parseDate(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d;
}

function parseSkills(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = raw.split(",");
    }
  }
  const out = [];
  for (const item of list) {
    const name = String(item).trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (name.length > 40) return { error: "Each skill must be 40 characters or fewer" };
    if (!out.some((s) => s.toLowerCase() === name.toLowerCase())) out.push(name);
  }
  if (out.length > MAX_SKILLS) return { error: `You can add at most ${MAX_SKILLS} skills per certificate` };
  return { skills: out };
}

function validateBody(body) {
  const title = String(body.title || "").trim();
  const issuer = String(body.issuer || "").trim();
  const credentialId = String(body.credentialId || "").trim();
  const credentialUrl = String(body.credentialUrl || "").trim();

  if (!title) return { error: "Title is required" };
  if (title.length > 150) return { error: "Title must be 150 characters or fewer" };
  if (!issuer) return { error: "Issuing organization is required" };
  if (issuer.length > 150) return { error: "Issuer must be 150 characters or fewer" };
  if (credentialId.length > 100) return { error: "Credential ID must be 100 characters or fewer" };

  const issueDate = parseDate(body.issueDate);
  if (!issueDate) return { error: "A valid issue date is required (YYYY-MM-DD)" };
  if (issueDate.getTime() > Date.now() + DAY_MS) return { error: "Issue date cannot be in the future" };

  let expiryDate = null;
  if (String(body.expiryDate || "").trim()) {
    expiryDate = parseDate(body.expiryDate);
    if (!expiryDate) return { error: "Expiry date is not valid (YYYY-MM-DD)" };
    if (expiryDate.getTime() < issueDate.getTime()) return { error: "Expiry date cannot be before the issue date" };
  }

  if (credentialUrl) {
    if (credentialUrl.length > 500) return { error: "Credential URL must be 500 characters or fewer" };
    try {
      const u = new URL(credentialUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad protocol");
    } catch {
      return { error: "Credential URL must start with http:// or https://" };
    }
  }

  const parsed = parseSkills(body.skills);
  if (parsed.error) return { error: parsed.error };

  return { data: { title, issuer, issueDate, expiryDate, credentialId, credentialUrl, skills: parsed.skills } };
}

// Read the first bytes and confirm the file really is a PDF, PNG or JPEG
async function detectMime(filePath) {
  const fh = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(8);
    await fh.read(buf, 0, 8, 0);
    if (buf.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
    if (buf.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    return null;
  } finally {
    await fh.close();
  }
}

async function prepareFile(f) {
  const detected = await detectMime(f.path);
  if (!detected || detected !== f.mimetype) {
    return { error: "File content does not match its type. Upload a real PDF, PNG or JPG" };
  }
  const originalName =
    path.basename(String(f.originalname || "certificate")).replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "certificate";
  return { file: { originalName, storedName: f.filename, mimeType: detected, size: f.size } };
}

/* ------------------------------ handlers ------------------------------ */

// GET /api/certificates
exports.getCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user.id }).sort({ issueDate: -1, createdAt: -1 }).lean();
    res.json({ success: true, certificates: certs.map(toDto) });
  } catch (e) {
    console.error("Get certificates error:", e.message);
    res.status(500).json({ message: "Failed to load certificates" });
  }
};

// POST /api/certificates  (multipart/form-data, optional "file")
exports.createCertificate = async (req, res) => {
  const newName = req.file?.filename;
  try {
    const { error, data } = validateBody(req.body || {});
    if (error) {
      await removeStored(newName);
      return res.status(400).json({ message: error });
    }

    const count = await Certificate.countDocuments({ userId: req.user.id });
    if (count >= MAX_CERTIFICATES_PER_USER) {
      await removeStored(newName);
      return res.status(400).json({ message: `You can store up to ${MAX_CERTIFICATES_PER_USER} certificates` });
    }

    let file;
    if (req.file) {
      const prepared = await prepareFile(req.file);
      if (prepared.error) {
        await removeStored(newName);
        return res.status(400).json({ message: prepared.error });
      }
      file = prepared.file;
    }

    const cert = await Certificate.create({ userId: req.user.id, ...data, ...(file ? { file } : {}) });
    res.status(201).json({ success: true, certificate: toDto(cert.toObject()) });
  } catch (e) {
    await removeStored(newName);
    console.error("Create certificate error:", e.message);
    res.status(500).json({ message: "Failed to save certificate" });
  }
};

// PUT /api/certificates/:id  (multipart/form-data; "file" replaces, removeFile=true deletes)
exports.updateCertificate = async (req, res) => {
  const newName = req.file?.filename;
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      await removeStored(newName);
      return res.status(400).json({ message: "Invalid certificate id" });
    }

    const cert = await Certificate.findOne({ _id: id, userId: req.user.id });
    if (!cert) {
      await removeStored(newName);
      return res.status(404).json({ message: "Certificate not found" });
    }

    const { error, data } = validateBody(req.body || {});
    if (error) {
      await removeStored(newName);
      return res.status(400).json({ message: error });
    }

    let newFile = null;
    if (req.file) {
      const prepared = await prepareFile(req.file);
      if (prepared.error) {
        await removeStored(newName);
        return res.status(400).json({ message: prepared.error });
      }
      newFile = prepared.file;
    }

    const oldName = cert.file?.storedName;
    let replaceOld = false;

    cert.set(data);
    if (newFile) {
      cert.set("file", newFile);
      replaceOld = true;
    } else if (String(req.body?.removeFile) === "true") {
      cert.set("file", undefined);
      replaceOld = true;
    }

    await cert.save();
    if (replaceOld) await removeStored(oldName);

    res.json({ success: true, certificate: toDto(cert.toObject()) });
  } catch (e) {
    await removeStored(newName);
    console.error("Update certificate error:", e.message);
    res.status(500).json({ message: "Failed to update certificate" });
  }
};

// DELETE /api/certificates/:id
exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid certificate id" });

    const cert = await Certificate.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    await removeStored(cert.file?.storedName);
    res.json({ success: true, message: "Certificate deleted" });
  } catch (e) {
    console.error("Delete certificate error:", e.message);
    res.status(500).json({ message: "Failed to delete certificate" });
  }
};

// GET /api/certificates/:id/file  (owner only)
exports.getCertificateFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid certificate id" });

    const cert = await Certificate.findOne({ _id: id, userId: req.user.id }).lean();
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    if (!cert.file?.storedName) return res.status(404).json({ message: "No file attached to this certificate" });

    const absolute = path.join(STORAGE_DIR, path.basename(cert.file.storedName));
    const downloadName = encodeURIComponent(cert.file.originalName || "certificate");

    res.sendFile(
      absolute,
      {
        headers: {
          "Content-Type": cert.file.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename*=UTF-8''${downloadName}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      },
      (err) => {
        if (err && !res.headersSent) res.status(404).json({ message: "File not found on server" });
      }
    );
  } catch (e) {
    console.error("Get certificate file error:", e.message);
    if (!res.headersSent) res.status(500).json({ message: "Failed to load file" });
  }
};