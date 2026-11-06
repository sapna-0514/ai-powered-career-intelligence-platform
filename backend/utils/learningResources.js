const LEVELS = ["None", "Beginner", "Intermediate", "Advanced"];

// Official / well-known learning pages. Anything not listed falls back to search links.
const DOCS = {
    "html": ["MDN Web Docs", "https://developer.mozilla.org/en-US/docs/Learn_web_development"],
    "css": ["MDN Web Docs", "https://developer.mozilla.org/en-US/docs/Learn_web_development"],
    "javascript": ["MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Learn_web_development"],
    "typescript": ["TypeScript Handbook", "https://www.typescriptlang.org/docs/"],
    "react": ["React official tutorial", "https://react.dev/learn"],
    "node.js": ["Node.js Learn", "https://nodejs.org/en/learn"],
    "express.js": ["Express getting started", "https://expressjs.com/en/starter/installing.html"],
    "mongodb": ["MongoDB University", "https://learn.mongodb.com"],
    "sql": ["W3Schools SQL tutorial", "https://www.w3schools.com/sql/"],
    "python": ["Python official tutorial", "https://docs.python.org/3/tutorial/"],
    "pandas": ["pandas getting started", "https://pandas.pydata.org/docs/getting_started/"],
    "numpy": ["NumPy learn", "https://numpy.org/learn/"],
    "scikit-learn": ["scikit-learn user guide", "https://scikit-learn.org/stable/user_guide.html"],
    "tensorflow": ["TensorFlow tutorials", "https://www.tensorflow.org/tutorials"],
    "pytorch": ["PyTorch tutorials", "https://pytorch.org/tutorials/"],
    "fastapi": ["FastAPI tutorial", "https://fastapi.tiangolo.com/tutorial/"],
    "flask": ["Flask quickstart", "https://flask.palletsprojects.com/en/stable/quickstart/"],
    "django": ["Django tutorial", "https://docs.djangoproject.com/en/stable/intro/tutorial01/"],
    "java": ["Dev.java learn", "https://dev.java/learn/"],
    "spring boot": ["Spring guides", "https://spring.io/guides"],
    "git": ["Pro Git book", "https://git-scm.com/book/en/v2"],
    "docker": ["Docker get started", "https://docs.docker.com/get-started/"],
    "aws": ["AWS getting started", "https://aws.amazon.com/getting-started/"],
    "azure": ["Microsoft Learn for Azure", "https://learn.microsoft.com/en-us/training/azure/"],
    "power bi": ["Power BI documentation", "https://learn.microsoft.com/en-us/power-bi/fundamentals/"]
};

function getResources(skillName) {
    const resources = [];
    const doc = DOCS[String(skillName).trim().toLowerCase()];
    if (doc) resources.push({ title: doc[0], url: doc[1] });

    resources.push({
        title: `${skillName} tutorials on YouTube`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + " tutorial")}`
    });
    resources.push({
        title: `Free ${skillName} courses`,
        url: `https://www.google.com/search?q=${encodeURIComponent("learn " + skillName + " free course")}`
    });
    return resources;
}

// One milestone for every level between the user's current level and the target.
function buildMilestones(currentValue, requiredValue, skillName) {
    const tasks = {
        1: `Learn the fundamentals of ${skillName}: core concepts and basic usage.`,
        2: `Practise with 2-3 small hands-on projects that use ${skillName}.`,
        3: `Build a complete project and study advanced topics and best practices in ${skillName}.`
    };
    const milestones = [];
    for (let level = currentValue + 1; level <= requiredValue; level++) {
        milestones.push({ level: LEVELS[level], task: tasks[level] });
    }
    return milestones;
}

module.exports = { getResources, buildMilestones };