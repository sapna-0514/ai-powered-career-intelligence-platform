// SAMPLE DATA ONLY: fictional companies, made-up packages and example.com links.
// Dates are generated relative to the day you run the seed, so the drives always look upcoming.
// Edit freely, then run: npm run seed:drives

const DAY = 24 * 60 * 60 * 1000;

function buildDrives(now = new Date()) {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = (offset) => new Date(base + offset * DAY);
  const Y = now.getUTCFullYear();

  const CORE_IT = ["Computer Science", "Information Technology"];
  const WITH_ECE = [...CORE_IT, "Electronics and Communication"];
  const WIDE = [...WITH_ECE, "Electrical"];
  const ANY = [];

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const d = (company, role, [min, max], location, [deadlineOff, driveOff], eligibility, rounds) => ({
    company,
    role,
    ctcMinLpa: min,
    ctcMaxLpa: max,
    location,
    driveDate: day(driveOff),
    registrationDeadline: day(deadlineOff),
    eligibility,
    rounds,
    applyLink: `https://example.com/sample-apply/${slug(company)}`,
    description: "SAMPLE DRIVE for demonstration. Fictional company and made-up details.",
    isSample: true,
    active: true,
  });

  return [
    d("Zephyr Systems", "Software Engineer Trainee", [4, 6], "Bengaluru", [2, 5],
      { minCgpa: 6.5, branches: WITH_ECE, graduationYears: [Y, Y + 1], requiredSkills: ["Data Structures", "JavaScript", "SQL", "Git"] },
      ["Online aptitude test", "Technical interview", "HR interview"]),
    d("Lumora Technologies", "Frontend Developer", [5, 8], "Hyderabad", [4, 8],
      { minCgpa: 7.0, branches: CORE_IT, graduationYears: [Y + 1], requiredSkills: ["JavaScript", "React", "CSS", "Git"] },
      ["Resume shortlisting", "Coding assessment", "UI machine round", "Managerial interview"]),
    d("Quillstone Analytics", "Data Analyst", [4, 7], "Pune", [9, 12],
      { minCgpa: 6.0, branches: ANY, graduationYears: [Y, Y + 1], requiredSkills: ["SQL", "Python", "Statistics"] },
      ["Aptitude test", "SQL and case-study round", "Technical interview", "HR interview"]),
    d("Brightvale Software", "Backend Developer", [6, 10], "Chennai", [12, 16],
      { minCgpa: 7.0, branches: CORE_IT, graduationYears: [Y + 1], requiredSkills: ["Node.js", "MongoDB", "JavaScript", "Git"] },
      ["Coding test", "System design discussion", "Technical interview", "HR interview"]),
    d("Orbitix Cloud", "DevOps Engineer", [6, 9], "Remote (India)", [18, 22],
      { minCgpa: 6.5, branches: WITH_ECE, graduationYears: [Y, Y + 1], requiredSkills: ["Linux", "Docker", "Git", "AWS"] },
      ["Online assessment", "Hands-on lab", "Technical interview"]),
    d("Kestrel Secure", "Security Analyst", [5, 8], "Noida", [20, 26],
      { minCgpa: 7.0, branches: WITH_ECE, graduationYears: [Y + 1], requiredSkills: ["Networking", "Linux", "Cybersecurity", "Python"] },
      ["Aptitude test", "Technical interview", "Scenario round", "HR interview"]),
    d("Marlowe Data Works", "Data Scientist Trainee", [7, 11], "Mumbai", [25, 32],
      { minCgpa: 7.5, branches: WIDE, graduationYears: [Y + 1], requiredSkills: ["Python", "Machine Learning", "Statistics", "SQL"] },
      ["Online test", "Case study", "Technical interview", "HR interview"]),
    d("Pixelforge Studios", "Full Stack Developer", [5, 9], "Ahmedabad", [30, 38],
      { minCgpa: 6.5, branches: ANY, graduationYears: [Y, Y + 1], requiredSkills: ["JavaScript", "React", "Node.js", "MongoDB"] },
      ["Coding round", "Mini project review", "Technical interview", "HR interview"]),
    d("Tessellate AI", "Machine Learning Engineer", [8, 12], "Bengaluru", [40, 48],
      { minCgpa: 8.0, branches: CORE_IT, graduationYears: [Y + 1], requiredSkills: ["Python", "Machine Learning", "Data Structures", "Statistics"] },
      ["Coding test", "ML concepts interview", "Take-home task", "HR interview"]),
    d("Harborline Networks", "Systems Engineer", [4, 6], "Kolkata", [-3, 1],
      { minCgpa: 6.0, branches: WIDE, graduationYears: [Y, Y + 1], requiredSkills: ["Networking", "Linux", "Data Structures"] },
      ["Aptitude test", "Technical interview", "HR interview"]),
    d("Cobaltway Solutions", "Associate Developer", [3, 5], "Jaipur", [-10, -4],
      { minCgpa: 6.0, branches: ANY, graduationYears: [Y, Y + 1], requiredSkills: ["JavaScript", "Git"] },
      ["Online test", "Interview"]),
  ];
}

module.exports = { buildDrives };