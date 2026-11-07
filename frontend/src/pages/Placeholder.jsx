import { Hammer, CheckCircle2 } from "lucide-react";
import "./PlaceholderPage.css";

function PlaceholderPage({ title, description, icon: Icon, features = [] }) {
    return (
        <div className="ph-page">
            <div className="ph-card">
                <div className="ph-icon">{Icon && <Icon size={34} />}</div>
                <span className="ph-badge"><Hammer size={13} /> Under development</span>
                <h1>{title}</h1>
                <p>{description}</p>

                {features.length > 0 && (
                    <ul>
                        {features.map((f) => (
                            <li key={f}><CheckCircle2 size={16} /> {f}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default PlaceholderPage;