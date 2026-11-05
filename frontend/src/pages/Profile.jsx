
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    UserRound,
    GraduationCap,
    BriefcaseBusiness,
    Code2,
    Target,
    Lightbulb,
    Pencil,
    Save,
    X,
    MapPin,
    Mail,
    Phone,
    Plus,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Trash2,
    TrendingUp
} from "lucide-react";

import API from "../services/api";
import toast from "react-hot-toast";
import "./Profile.css";


// ==========================================
// INITIAL DATA
// ==========================================

const initialProfile = {
    personalInfo: {
        fullName: "",
        email: "",
        phone: "",
        location: "",
        headline: ""
    },
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    preferredCareer: [],
    interests: [],
    goals: []
};

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

const Card = ({ children, className = "", id }) => (
    <section
        id={id}
        className={`profile-card ${className}`}
    >
        {children}
    </section>
);


const Field = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text"
}) => (
    <div className="profile-field">

        <label>{label}</label>

        <input
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />

    </div>
);


const TextArea = ({
    label,
    value,
    onChange,
    placeholder
}) => (
    <div className="profile-field">

        <label>{label}</label>

        <textarea
            rows={3}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />

    </div>
);


const Header = ({
    icon: Icon,
    title,
    subtitle,
    isEditing,
    onEdit,
    onCancel
}) => (
    <div className="profile-card-header">

        <div className="profile-card-title">

            <div className="profile-card-icon">
                <Icon size={20} />
            </div>

            <div>
                <h3>{title}</h3>
                <p>{subtitle}</p>
            </div>

        </div>

        {isEditing ? (

            <button
                className="profile-icon-button cancel"
                onClick={onCancel}
                aria-label="Cancel editing"
            >
                <X size={18} />
            </button>

        ) : (

            <button
                className="profile-edit-button"
                onClick={onEdit}
            >
                <Pencil size={15} />
                Edit
            </button>

        )}

    </div>
);


const SaveButton = ({
    onSave,
    onCancel,
    saving
}) => (
    <div className="profile-actions">

        <button
            onClick={onSave}
            disabled={saving}
            className="profile-save-button"
        >
            <Save size={16} />

            {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
            onClick={onCancel}
            disabled={saving}
            className="profile-cancel-button"
        >
            Cancel
        </button>

    </div>
);


const Empty = ({ message }) => (
    <p className="text-sm text-slate-500 py-3">
        {message}
    </p>
);


const AddButton = ({ onClick, label }) => (
    <button
        onClick={onClick}
        className="profile-add-button"
    >
        <Plus size={17} />
        {label}
    </button>
);


// ==========================================
// MAIN PROFILE COMPONENT
// ==========================================

function Profile() {

    const navigate = useNavigate();

    const [profile, setProfile] = useState(initialProfile);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState({});


    // ==========================================
    // LOAD PROFILE AND RESUME DATA
    // ==========================================

    useEffect(() => {

        let mounted = true;

        const loadData = async () => {

            try {

                const [
                    profileResult,
                    userResult
                ] = await Promise.allSettled([
                    API.get("/profile"),
                    API.get("/resume"),
                    API.get("/auth/me")
                ]);

                if (!mounted) return;

                let loadedProfile = {
                    ...initialProfile
                };

                // LOAD PROFILE

                if (profileResult.status === "fulfilled") {

                    const data =
                        profileResult.value.data.profile ||
                        profileResult.value.data;

                    loadedProfile = {

                        ...initialProfile,
                        ...data,

                        personalInfo: {
                            ...initialProfile.personalInfo,
                            ...(data.personalInfo || {})
                        },

                        education: data.education || [],
                        experience: data.experience || [],
                        skills: data.skills || [],
                        certifications: data.certifications || [],
                        preferredCareer: data.preferredCareer || [],
                        interests: data.interests || [],
                        goals: data.goals || []

                    };

                } else if (
                    profileResult.reason?.response?.status !== 404
                ) {

                    console.error(
                        "Profile loading error:",
                        profileResult.reason
                    );

                    toast.error(
                        "Unable to load profile details."
                    );

                }

                // ACCOUNT DETAILS FALLBACK

                if (userResult.status === "fulfilled") {

                    const user =
                        userResult.value.data.user ||
                        userResult.value.data ||
                        {};

                    loadedProfile.personalInfo = {

                        ...loadedProfile.personalInfo,

                        fullName:
                            loadedProfile.personalInfo.fullName ||
                            user.name ||
                            "",

                        email:
                            loadedProfile.personalInfo.email ||
                            user.email ||
                            ""

                    };

                }

                setProfile(loadedProfile);

            } catch (error) {

                console.error(
                    "Profile loading error:",
                    error
                );

                toast.error("Unable to load profile.");

            } finally {

                if (mounted) {
                    setLoading(false);
                }

            }

        };

        loadData();

        return () => {
            mounted = false;
        };

    }, []);


    // ==========================================
    // PROFILE COMPLETION
    // ==========================================

    const completionItems = [

        Boolean(profile.personalInfo?.fullName),

        Boolean(profile.personalInfo?.email),

        Boolean(profile.personalInfo?.phone),

        Boolean(profile.personalInfo?.location),

        profile.education?.some(
            item => item.degree && item.institution
        ),

        profile.experience?.some(
            item => item.jobTitle && item.company
        ),

        profile.skills?.length > 0,

        profile.preferredCareer?.length > 0,

        profile.interests?.length > 0,

        profile.goals?.length > 0

    ];

    const completion = Math.round(
        completionItems.filter(Boolean).length /
        completionItems.length * 100
    );


    // ==========================================
    // QUICK STATISTICS
    // ==========================================

    const stats = [

        {
            label: "Education Records",
            value: profile.education.length,
            icon: GraduationCap,
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        },

        {
            label: "Work Experience",
            value: profile.experience.length,
            icon: BriefcaseBusiness,
            color: "text-purple-400",
            bg: "bg-purple-500/10"
        },

        {
            label: "Skills Added",
            value: profile.skills.length,
            icon: Code2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10"
        },

        {
            label: "Career Interests",
            value:
                profile.preferredCareer.length +
                profile.interests.length,
            icon: Target,
            color: "text-orange-400",
            bg: "bg-orange-500/10"
        }

    ];


    // ==========================================
    // EDIT SECTION
    // ==========================================

    const handleEdit = (section) => {

        if (section === "personalInfo") {

            setDraft({
                ...profile.personalInfo
            });

        } else if (section === "interestsGoals") {

            setDraft({

                interests: [...profile.interests],

                goals: [...profile.goals]

            });

        } else {

            setDraft({

                items: (profile[section] || []).map(item =>
                    typeof item === "object" && item !== null
                        ? { ...item }
                        : item
                )

            });

        }

        setEditing(section);

    };


    // ==========================================
    // UPDATE DRAFT
    // ==========================================

    const updateDraft = (field, value) => {

        setDraft(prev => ({

            ...prev,

            [field]: value

        }));

    };


    // ==========================================
    // UPDATE ARRAY ITEM
    // ==========================================

    const updateItem = (
        index,
        field,
        value,
        list = "items"
    ) => {

        setDraft(prev => ({

            ...prev,

            [list]: (prev[list] || []).map((item, i) => {

                if (i !== index) return item;

                if (
                    typeof item === "object" &&
                    item !== null
                ) {

                    return {
                        ...item,
                        [field]: value
                    };

                }

                return value;

            })

        }));

    };


    // ==========================================
    // ADD NEW ITEM
    // ==========================================

    const addItem = (section, list = "items") => {

        let newItem = "";

        if (section === "education") {

            newItem = {
                degree: "",
                institution: "",
                graduationYear: "",
                percentage: ""
            };

        }

        if (section === "experience") {

            newItem = {
                jobTitle: "",
                company: "",
                duration: "",
                description: ""
            };

        }

        if (section === "skills") {

            newItem = {
                name: "",
                level: "Intermediate"
            };

        }

        setDraft(prev => ({

            ...prev,

            [list]: [
                ...(prev[list] || []),
                newItem
            ]

        }));

    };


    // ==========================================
    // REMOVE ITEM
    // ==========================================

    const removeItem = (index, list = "items") => {

        setDraft(prev => ({

            ...prev,

            [list]: (prev[list] || []).filter(
                (_, i) => i !== index
            )

        }));

    };


    // ==========================================
    // SAVE PROFILE SECTION
    // ==========================================

    const handleSave = async () => {

        try {

            setSaving(true);

            let updatedProfile = {
                ...profile
            };


            if (editing === "personalInfo") {

                updatedProfile.personalInfo = {
                    ...draft
                };

            } else if (editing === "interestsGoals") {

                updatedProfile.interests = (
                    draft.interests || []
                )
                    .map(item => String(item).trim())
                    .filter(Boolean);

                updatedProfile.goals = (
                    draft.goals || []
                )
                    .map(item => String(item).trim())
                    .filter(Boolean);

            } else {

                let items = draft.items || [];


                // SKILLS

                if (editing === "skills") {

                    items = items

                        .map(item => {

                            const name =
                                typeof item === "object"
                                    ? item.name
                                    : item;

                            return String(name || "").trim();

                        })

                        .filter(Boolean)

                        .map(name => ({
                            name,
                            level: "Intermediate"
                        }));

                }


                // CAREER PREFERENCES AND CERTIFICATIONS

                else if (
                    editing === "preferredCareer" ||
                    editing === "certifications"
                ) {

                    items = items

                        .map(item =>
                            String(item).trim()
                        )

                        .filter(Boolean);

                }


                // EDUCATION

                else if (editing === "education") {

                    items = items

                        .filter(item =>
                            item.degree || item.institution
                        )

                        .map(item => ({

                            ...item,

                            graduationYear:
                                Number(item.graduationYear) || undefined,

                            percentage:
                                Number(item.percentage) || undefined

                        }));

                }


                // EXPERIENCE

                else if (editing === "experience") {

                    items = items.filter(
                        item =>
                            item.jobTitle || item.company
                    );

                }


                updatedProfile[editing] = items;

            }


            // API REQUEST

            const response = await API.post(
                "/profile",
                updatedProfile
            );


            // UPDATE LOCAL PROFILE

            const savedProfile =
                response.data.profile || updatedProfile;

            setProfile({

                ...initialProfile,

                ...savedProfile,

                personalInfo: {

                    ...initialProfile.personalInfo,

                    ...(savedProfile.personalInfo || {})

                },

                education: savedProfile.education || [],

                experience: savedProfile.experience || [],

                skills: savedProfile.skills || [],

                certifications:
                    savedProfile.certifications || [],

                preferredCareer:
                    savedProfile.preferredCareer || [],

                interests: savedProfile.interests || [],

                goals: savedProfile.goals || []

            });


            setEditing(null);
            setDraft({});


            toast.success(
                response.data.message ||
                "Profile updated successfully!"
            );

        } catch (error) {

            toast.error(

                error.response?.data?.message ||
                "Unable to update profile"

            );

            console.error(
                "Profile save error:",
                error
            );

        } finally {

            setSaving(false);

        }

    };


    // ==========================================
    // CANCEL EDITING
    // ==========================================

    const cancelEdit = () => {

        setEditing(null);
        setDraft({});

    };


    // ==========================================
    // LOADING SCREEN
    // ==========================================

    if (loading) {

        return (

            <div className="profile-page-loading">

                <div className="animate-spin rounded-full h-12 w-12
                border-4 border-slate-700 border-t-blue-500" />

                <p>
                    Loading your career profile...
                </p>

            </div>

        );

    }


    // ==========================================
    // MAIN UI
    // ==========================================

    return (

        <div className="profile-page">

            <div className="profile-container">


                {/* PAGE HEADER */}

                <div className="profile-page-heading">

                    <div>

                        <div className="profile-eyebrow">

                            <Sparkles size={16} />

                            CAREER MANAGEMENT

                        </div>

                        <h1>My Career Profile</h1>

                        <p>
                            Manage your professional identity and track
                            your career development.
                        </p>

                    </div>

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="profile-back-button"
                    >
                        Back to Dashboard
                        <ArrowRight size={16} />
                    </button>

                </div>


                {/* PROFILE HERO */}

                <Card className="profile-hero-card">

                    <div className="relative grid grid-cols-1 md:grid-cols-3
                    gap-8 items-center">

                        <div className="md:col-span-2">

                            <div className="flex items-center gap-5 mb-6">

                                <div className="w-28 h-28 rounded-full
                                bg-linear-to-br from-blue-500 to-indigo-600
                                flex items-center justify-center
                                text-4xl font-bold text-white shrink-0">

                                    {(profile.personalInfo.fullName || "U")
                                        .charAt(0).toUpperCase()}

                                </div>

                                <div className="min-w-0">

                                    <h2>
                                        {profile.personalInfo.fullName ||
                                            "Complete Your Profile"}
                                    </h2>

                                    <p className="text-blue-200 text-sm mt-2">
                                        {profile.personalInfo.headline ||
                                            "Your professional journey starts here"}
                                    </p>

                                    <p className="text-sm text-slate-300 mt-2">
                                        Aspiring professional | Building skills
                                        for your future career
                                    </p>

                                    <div className="flex flex-wrap gap-4 mt-3
                                    text-xs text-slate-300">

                                        {profile.personalInfo.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                {profile.personalInfo.location}
                                            </span>
                                        )}

                                        {profile.personalInfo.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail size={14} />
                                                {profile.personalInfo.email}
                                            </span>
                                        )}

                                    </div>

                                </div>

                            </div>


                            {/* SKILL TAGS */}

                            <div className="flex flex-wrap gap-2">

                                {profile.skills.slice(0, 5).map((skill, index) => (

                                    <span
                                        key={index}
                                        className="px-3 py-2 rounded-full
                                        bg-blue-500/15 border border-blue-400/30
                                        text-blue-200 text-xs"
                                    >
                                        {typeof skill === "object"
                                            ? skill.name
                                            : skill}
                                    </span>

                                ))}

                                {profile.skills.length > 5 && (
                                    <span className="text-xs text-blue-200 px-2 py-2">
                                        +{profile.skills.length - 5} more
                                    </span>
                                )}

                            </div>

                        </div>


                        {/* COMPLETION CIRCLE */}

                        <div className="flex justify-center">

                            <div
                                className="w-36 h-36 rounded-full
                                flex flex-col items-center justify-center
                                relative"
                                style={{
                                    background: `conic-gradient(#18c5e8 ${completion * 3.6}deg, #1e3555 0deg)`
                                }}
                            >

                                <div className="absolute inset-2.25
                                rounded-full bg-[#10264b]
                                flex flex-col items-center justify-center">

                                    <span className="text-3xl font-bold">
                                        {completion}%
                                    </span>

                                    <span className="text-xs text-slate-400">
                                        Completed
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </Card>


                {/* NAVIGATION TABS */}

                <nav className="profile-navigation">

                    <a href="#overview" className="active">
                        <UserRound size={17} />
                        Overview
                    </a>

                    <a href="#personal-information">
                        <UserRound size={17} />
                        Personal Information
                    </a>

                    <a href="#education">
                        <GraduationCap size={17} />
                        Education
                    </a>

                    <a href="#experience">
                        <BriefcaseBusiness size={17} />
                        Experience
                    </a>

                    <a href="#skills">
                        <Code2 size={17} />
                        Skills
                    </a>

                    <a href="#career-preferences">
                        <Target size={17} />
                        Career Preferences
                    </a>

                    <a href="#interests">
                        <Lightbulb size={17} />
                        Interests & Goals
                    </a>

                </nav>


                {/* QUICK OVERVIEW */}

                <div id="overview">

                    <div className="mb-4">

                        <h2 className="text-xl font-bold">
                            Quick Overview
                        </h2>

                        <p className="text-sm text-slate-400 mt-1">
                            Your career profile at a glance.
                        </p>

                    </div>

                    <div className="profile-stats-grid">

                        {stats.map((item) => {

                            const Icon = item.icon;

                            return (

                                <Card key={item.label}>

                                    <div className={`w-11 h-11 rounded-xl
                                    flex items-center justify-center
                                    ${item.bg} ${item.color}`}>

                                        <Icon size={22} />

                                    </div>

                                    <h3 className="text-3xl font-bold mt-4">
                                        {item.value}
                                    </h3>

                                    <p className="text-sm text-slate-400 mt-1">
                                        {item.label}
                                    </p>

                                </Card>

                            );

                        })}

                    </div>

                </div>

                {/* PROFILE INFORMATION HEADING */}

                <div>

                    <div className="mb-5">

                        <h2 className="text-xl font-bold">
                            Profile Information
                        </h2>

                        <p className="text-sm text-slate-400 mt-1">
                            Manage and update your professional details.
                        </p>

                    </div>


                    <div className="profile-sections-grid">


                        {/* PERSONAL INFORMATION */}

                        <Card id="personal-information">

                            <Header
                                icon={UserRound}
                                title="Personal Information"
                                subtitle="Your basic personal details"
                                isEditing={editing === "personalInfo"}
                                onEdit={() => handleEdit("personalInfo")}
                                onCancel={cancelEdit}
                            />

                            {editing === "personalInfo" ? (

                                <div className="space-y-4">

                                    <Field
                                        label="Full Name"
                                        value={draft.fullName}
                                        onChange={v => updateDraft("fullName", v)}
                                        placeholder="Enter your name"
                                    />

                                    <Field
                                        label="Email Address"
                                        value={draft.email}
                                        onChange={v => updateDraft("email", v)}
                                        placeholder="Enter email"
                                        type="email"
                                    />

                                    <Field
                                        label="Phone Number"
                                        value={draft.phone}
                                        onChange={v => updateDraft("phone", v)}
                                        placeholder="Enter phone number"
                                    />

                                    <Field
                                        label="Location"
                                        value={draft.location}
                                        onChange={v => updateDraft("location", v)}
                                        placeholder="City, Country"
                                    />

                                    <Field
                                        label="Professional Headline"
                                        value={draft.headline}
                                        onChange={v => updateDraft("headline", v)}
                                        placeholder="Software Developer"
                                    />

                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="space-y-5">

                                    {[
                                        {
                                            icon: UserRound,
                                            label: "Full Name",
                                            value: profile.personalInfo.fullName
                                        },
                                        {
                                            icon: Mail,
                                            label: "Email",
                                            value: profile.personalInfo.email
                                        },
                                        {
                                            icon: Phone,
                                            label: "Phone",
                                            value: profile.personalInfo.phone
                                        },
                                        {
                                            icon: MapPin,
                                            label: "Location",
                                            value: profile.personalInfo.location
                                        }
                                    ].map((item) => {

                                        const Icon = item.icon;

                                        return (

                                            <div
                                                key={item.label}
                                                className="flex items-center gap-3"
                                            >

                                                <Icon
                                                    size={18}
                                                    className="text-blue-400 shrink-0"
                                                />

                                                <div className="min-w-0">

                                                    <p className="text-xs text-slate-500">
                                                        {item.label}
                                                    </p>

                                                    <p className="text-sm text-slate-200 mt-1 wrap-break-word">
                                                        {item.value || "Not added"}
                                                    </p>

                                                </div>

                                            </div>

                                        );

                                    })}


                                    <div className="border-t border-slate-800 pt-4">

                                        <p className="text-xs text-slate-500">
                                            PROFESSIONAL HEADLINE
                                        </p>

                                        <p className="text-sm mt-2 text-slate-300">
                                            {profile.personalInfo.headline || "Not added"}
                                        </p>

                                    </div>

                                </div>

                            )}

                        </Card>


                        {/* EDUCATION */}

                        <Card id="education">

                            <Header
                                icon={GraduationCap}
                                title="Education"
                                subtitle="Your academic background"
                                isEditing={editing === "education"}
                                onEdit={() => handleEdit("education")}
                                onCancel={cancelEdit}
                            />

                            {editing === "education" ? (

                                <div className="space-y-5">

                                    {(draft.items || []).map((item, index) => (

                                        <div
                                            key={index}
                                            className="bg-slate-800/60 p-4 rounded-xl space-y-3"
                                        >

                                            <div className="flex justify-between">

                                                <p className="text-sm font-semibold">
                                                    Education #{index + 1}
                                                </p>

                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-400"
                                                    aria-label="Remove education"
                                                >
                                                    <Trash2 size={17} />
                                                </button>

                                            </div>

                                            <Field
                                                label="Degree"
                                                value={item.degree}
                                                onChange={v => updateItem(index, "degree", v)}
                                                placeholder="B.Tech CSE"
                                            />

                                            <Field
                                                label="Institution"
                                                value={item.institution}
                                                onChange={v => updateItem(index, "institution", v)}
                                                placeholder="College / University"
                                            />

                                            <Field
                                                label="Graduation Year"
                                                type="number"
                                                value={item.graduationYear}
                                                onChange={v => updateItem(index, "graduationYear", v)}
                                                placeholder="2025"
                                            />

                                            <Field
                                                label="Percentage / CGPA"
                                                type="number"
                                                value={item.percentage}
                                                onChange={v => updateItem(index, "percentage", v)}
                                                placeholder="Optional"
                                            />

                                        </div>

                                    ))}

                                    <AddButton
                                        label="Add Education"
                                        onClick={() => addItem("education")}
                                    />

                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="space-y-4">

                                    {profile.education.length ? (

                                        profile.education.map((item, index) => (

                                            <div
                                                key={index}
                                                className="bg-slate-800/60 p-4 rounded-xl"
                                            >

                                                <div className="flex items-start gap-3">

                                                    <GraduationCap
                                                        className="text-blue-400 mt-1 shrink-0"
                                                        size={20}
                                                    />

                                                    <div>

                                                        <h4 className="font-semibold">
                                                            {item.degree || "Degree not specified"}
                                                        </h4>

                                                        <p className="text-sm text-slate-400 mt-1">
                                                            {item.institution || "Institution not specified"}
                                                        </p>

                                                        <p className="text-xs text-blue-400 mt-2">
                                                            {item.graduationYear || "Year not specified"}
                                                        </p>

                                                        {item.percentage != null && (
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                Percentage / CGPA: {item.percentage}
                                                            </p>
                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                        ))

                                    ) : (

                                        <Empty message="No education records added yet." />

                                    )}

                                </div>

                            )}

                        </Card>


                        {/* WORK EXPERIENCE */}

                        <Card id="experience">

                            <Header
                                icon={BriefcaseBusiness}
                                title="Work Experience"
                                subtitle="Your professional experience"
                                isEditing={editing === "experience"}
                                onEdit={() => handleEdit("experience")}
                                onCancel={cancelEdit}
                            />

                            {editing === "experience" ? (

                                <div className="space-y-5">

                                    {(draft.items || []).map((item, index) => (

                                        <div
                                            key={index}
                                            className="bg-slate-800/60 p-4 rounded-xl space-y-3"
                                        >

                                            <div className="flex justify-between">

                                                <p className="text-sm font-semibold">
                                                    Experience #{index + 1}
                                                </p>

                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-400"
                                                    aria-label="Remove experience"
                                                >
                                                    <Trash2 size={17} />
                                                </button>

                                            </div>

                                            <Field
                                                label="Job Title"
                                                value={item.jobTitle}
                                                onChange={v => updateItem(index, "jobTitle", v)}
                                                placeholder="Software Developer"
                                            />

                                            <Field
                                                label="Company"
                                                value={item.company}
                                                onChange={v => updateItem(index, "company", v)}
                                                placeholder="Company Name"
                                            />

                                            <Field
                                                label="Duration"
                                                value={item.duration}
                                                onChange={v => updateItem(index, "duration", v)}
                                                placeholder="Jan 2024 - Present"
                                            />

                                            <TextArea
                                                label="Description"
                                                value={item.description}
                                                onChange={v => updateItem(index, "description", v)}
                                                placeholder="Describe your responsibilities..."
                                            />

                                        </div>

                                    ))}

                                    <AddButton
                                        label="Add Experience"
                                        onClick={() => addItem("experience")}
                                    />

                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="space-y-4">

                                    {profile.experience.length ? (

                                        profile.experience.map((item, index) => (

                                            <div
                                                key={index}
                                                className="bg-slate-800/60 p-4 rounded-xl"
                                            >

                                                <h4 className="font-semibold">
                                                    {item.jobTitle || "Job title not specified"}
                                                </h4>

                                                <p className="text-sm text-blue-400 mt-1">
                                                    {item.company || "Company not specified"}
                                                </p>

                                                <p className="text-xs text-slate-400 mt-2">
                                                    {item.duration}
                                                </p>

                                                <p className="text-sm text-slate-400 mt-3">
                                                    {item.description}
                                                </p>

                                            </div>

                                        ))

                                    ) : (

                                        <Empty message="No work experience added yet." />

                                    )}

                                </div>

                            )}

                        </Card>


                        {/* TECHNICAL SKILLS */}

                        <Card id="skills">

                            <Header
                                icon={Code2}
                                title="Technical Skills"
                                subtitle="Your technical expertise"
                                isEditing={editing === "skills"}
                                onEdit={() => handleEdit("skills")}
                                onCancel={cancelEdit}
                            />

                            {editing === "skills" ? (

                                <div className="space-y-3">

                                    {(draft.items || []).map((item, index) => (

                                        <div
                                            key={index}
                                            className="flex gap-2"
                                        >

                                            <input
                                                value={
                                                    typeof item === "object"
                                                        ? item.name || ""
                                                        : item
                                                }
                                                onChange={e =>
                                                    updateItem(
                                                        index,
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Enter technical skill"
                                                className="flex-1 min-w-0 bg-slate-800
                                                border border-slate-700 rounded-xl
                                                px-4 py-3 text-sm outline-none
                                                focus:border-blue-500"
                                            />

                                            <button
                                                onClick={() => removeItem(index)}
                                                className="text-red-400 p-2"
                                                aria-label="Remove skill"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                        </div>

                                    ))}

                                    <AddButton
                                        label="Add Skill"
                                        onClick={() => addItem("skills")}
                                    />

                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="flex flex-wrap gap-2">

                                    {profile.skills.length ? (

                                        profile.skills.map((skill, index) => (

                                            <span
                                                key={index}
                                                className="px-3 py-2 bg-blue-500/10
                                                text-blue-300 border border-blue-500/20
                                                rounded-lg text-sm"
                                            >

                                                {typeof skill === "object"
                                                    ? skill.name
                                                    : skill}

                                            </span>

                                        ))

                                    ) : (

                                        <Empty message="No technical skills added yet." />

                                    )}

                                </div>

                            )}

                        </Card>


                        {/* CAREER PREFERENCES */}

                        <Card id="career-preferences">

                            <Header
                                icon={Target}
                                title="Career Preferences"
                                subtitle="Roles you want to pursue"
                                isEditing={editing === "preferredCareer"}
                                onEdit={() => handleEdit("preferredCareer")}
                                onCancel={cancelEdit}
                            />

                            {editing === "preferredCareer" ? (

                                <div className="space-y-3">

                                    {(draft.items || []).map((item, index) => (

                                        <div
                                            key={index}
                                            className="flex gap-2"
                                        >

                                            <input
                                                value={item}
                                                onChange={e =>
                                                    updateItem(
                                                        index,
                                                        null,
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Backend Developer"
                                                className="flex-1 min-w-0 bg-slate-800
                                                border border-slate-700 rounded-xl
                                                px-4 py-3 text-sm outline-none"
                                            />

                                            <button
                                                onClick={() => removeItem(index)}
                                                className="text-red-400 p-2"
                                                aria-label="Remove career preference"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                        </div>

                                    ))}

                                    <AddButton
                                        label="Add Career Preference"
                                        onClick={() => addItem("preferredCareer")}
                                    />

                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="flex flex-wrap gap-2">

                                    {profile.preferredCareer.length ? (

                                        profile.preferredCareer.map((item, index) => (

                                            <span
                                                key={index}
                                                className="px-3 py-2 bg-purple-500/10
                                                text-purple-300 border border-purple-500/20
                                                rounded-lg text-sm"
                                            >
                                                {item}
                                            </span>

                                        ))

                                    ) : (

                                        <Empty message="No career preferences added." />

                                    )}

                                </div>

                            )}

                        </Card>


                        {/* INTERESTS AND GOALS */}

                        <Card id="interests">

                            <Header
                                icon={Lightbulb}
                                title="Interests & Goals"
                                subtitle="Your interests and future ambitions"
                                isEditing={editing === "interestsGoals"}
                                onEdit={() => handleEdit("interestsGoals")}
                                onCancel={cancelEdit}
                            />

                            {editing === "interestsGoals" ? (

                                <div className="space-y-6">

                                    {/* INTERESTS */}

                                    <div className="space-y-3">

                                        <h4 className="text-sm font-semibold text-slate-300">
                                            Career Interests
                                        </h4>

                                        {(draft.interests || []).map((item, index) => (

                                            <div
                                                key={index}
                                                className="flex gap-2"
                                            >

                                                <input
                                                    value={item}
                                                    onChange={e =>
                                                        updateItem(
                                                            index,
                                                            null,
                                                            e.target.value,
                                                            "interests"
                                                        )
                                                    }
                                                    placeholder="Artificial Intelligence"
                                                    className="flex-1 min-w-0 bg-slate-800
                                                    border border-slate-700 rounded-xl
                                                    px-4 py-3 text-sm outline-none"
                                                />

                                                <button
                                                    onClick={() =>
                                                        removeItem(index, "interests")
                                                    }
                                                    className="text-red-400 p-2"
                                                    aria-label="Remove interest"
                                                >
                                                    <Trash2 size={18} />
                                                </button>

                                            </div>

                                        ))}

                                        <AddButton
                                            label="Add Interest"
                                            onClick={() =>
                                                addItem("interests", "interests")
                                            }
                                        />

                                    </div>


                                    {/* GOALS */}

                                    <div className="space-y-3 border-t
                                    border-slate-800 pt-5">

                                        <h4 className="text-sm font-semibold text-slate-300">
                                            Future Goals
                                        </h4>

                                        {(draft.goals || []).map((item, index) => (

                                            <div
                                                key={index}
                                                className="flex gap-2"
                                            >

                                                <input
                                                    value={item}
                                                    onChange={e =>
                                                        updateItem(
                                                            index,
                                                            null,
                                                            e.target.value,
                                                            "goals"
                                                        )
                                                    }
                                                    placeholder="Become a Full Stack Developer"
                                                    className="flex-1 min-w-0 bg-slate-800
                                                    border border-slate-700 rounded-xl
                                                    px-4 py-3 text-sm outline-none"
                                                />

                                                <button
                                                    onClick={() =>
                                                        removeItem(index, "goals")
                                                    }
                                                    className="text-red-400 p-2"
                                                    aria-label="Remove goal"
                                                >
                                                    <Trash2 size={18} />
                                                </button>

                                            </div>

                                        ))}

                                        <AddButton
                                            label="Add Goal"
                                            onClick={() =>
                                                addItem("goals", "goals")
                                            }
                                        />

                                    </div>


                                    <SaveButton
                                        onSave={handleSave}
                                        onCancel={cancelEdit}
                                        saving={saving}
                                    />

                                </div>

                            ) : (

                                <div className="space-y-6">

                                    {/* DISPLAY INTERESTS */}

                                    <div>

                                        <p className="text-xs text-slate-400 mb-3">
                                            CAREER INTERESTS
                                        </p>

                                        <div className="flex flex-wrap gap-2">

                                            {profile.interests.length ? (

                                                profile.interests.map((item, index) => (

                                                    <span
                                                        key={index}
                                                        className="px-3 py-2 bg-orange-500/10
                                                        text-orange-300 rounded-lg text-sm"
                                                    >
                                                        {item}
                                                    </span>

                                                ))

                                            ) : (

                                                <Empty message="No interests added." />

                                            )}

                                        </div>

                                    </div>


                                    {/* DISPLAY GOALS */}

                                    <div className="border-t border-slate-800 pt-5">

                                        <p className="text-xs text-slate-400 mb-3">
                                            FUTURE GOALS
                                        </p>

                                        {profile.goals.length ? (

                                            profile.goals.map((goal, index) => (

                                                <div
                                                    key={index}
                                                    className="flex items-start gap-2 mb-3"
                                                >

                                                    <CheckCircle2
                                                        size={17}
                                                        className="text-emerald-400 mt-0.5 shrink-0"
                                                    />

                                                    <p className="text-sm text-slate-300">
                                                        {goal}
                                                    </p>

                                                </div>

                                            ))

                                        ) : (

                                            <Empty message="No future goals added." />

                                        )}

                                    </div>

                                </div>

                            )}

                        </Card>

                    </div>

                </div>


                {/* BOTTOM CAREER TIP */}

                <div className="rounded-2xl border border-blue-500/20
                bg-linear-to-r from-blue-950/70 to-indigo-950/70
                p-6 flex flex-col sm:flex-row items-start
                sm:items-center justify-between gap-4">

                    <div className="flex items-start gap-3">

                        <div className="p-3 bg-blue-500/20
                        rounded-xl text-blue-400">

                            <TrendingUp size={23} />

                        </div>

                        <div>

                            <h3 className="font-semibold text-lg">
                                Keep Growing Your Career
                            </h3>

                            <p className="text-sm text-slate-400 mt-1">
                                Update your skills, experience and goals
                                regularly to receive better career recommendations.
                            </p>

                        </div>

                    </div>

                    <button
                        onClick={() => navigate("/resume-analyzer")}
                        className="whitespace-nowrap px-5 py-3 rounded-xl
                        bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                    >
                        Explore AI Tools
                    </button>

                </div>

            </div>

        </div>

    );

}

export default Profile;
