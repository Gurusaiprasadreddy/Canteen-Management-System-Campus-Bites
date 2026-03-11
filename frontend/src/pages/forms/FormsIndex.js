import { useNavigate } from 'react-router-dom';

const FRIEND_FORMS = [
    {
        type: 'Master', color: '#f97316',
        items: [
            { path: '/forms/menu-items', icon: '🍱', title: 'M1 — Menu Item Master', desc: 'Manage canteen menu items (Veg/Non-Veg, Price, Prep Time)', module: 'Ordering' },
            { path: '/forms/students', icon: '🎓', title: 'M2 — Student Master', desc: 'Manage student records and canteen preferences', module: 'Ordering' },
            { path: '/forms/canteens', icon: '🏪', title: 'M3 — Canteen Master', desc: 'Manage canteen details, location and operating hours', module: 'Ordering' },
        ]
    },
    {
        type: 'Transaction', color: '#7c3aed',
        items: [
            { path: '/forms/orders', icon: '📦', title: 'T1 — Order Transaction', desc: 'Log student-placed orders with FK to Student & Menu Item', module: 'Ordering' },
            { path: '/forms/wellness-queries', icon: '💚', title: 'T2 — Wellness Query Log', desc: 'Log wellness AI queries: symptom input & AI response', module: 'Wellness AI' },
            { path: '/forms/recommendation-logs', icon: '🍽️', title: 'T3 — Food Recommendation Log', desc: 'Log cart-based recommendations with algorithm used', module: 'Food Recommendation' },
            { path: '/forms/recommendation-feedback', icon: '⭐', title: 'T4 — Recommendation Feedback', desc: 'Rating and helpfulness feedback for recommendations', module: 'Food Recommendation' },
        ]
    }
];

const MY_FORMS = [
    {
        type: 'Master', color: '#7c3aed',
        items: [
            { path: '/forms/management-accounts', icon: '🏢', title: 'M1 — Management Account Master', desc: 'Manage canteen management staff with access levels (Admin/Manager/Viewer)', module: 'Management' },
            { path: '/forms/crew-members', icon: '👨‍🍳', title: 'M2 — Crew Member Master', desc: 'Manage crew members with canteen assignment and shift details', module: 'Crew' },
            { path: '/forms/user-accounts', icon: '👤', title: 'M3 — User Account Master', desc: 'Central user registry for all roles with status management', module: 'User Management' },
        ]
    },
    {
        type: 'Transaction', color: '#0891b2',
        items: [
            { path: '/forms/crew-order-assignments', icon: '📋', title: 'T1 — Crew Order Assignment', desc: 'Log which crew handles which order, approved by which manager (FK: Crew + Manager)', module: 'Crew' },
            { path: '/forms/spending-budgets', icon: '💰', title: 'T2 — Spending Budget Transaction', desc: 'Monthly budget limits per user with alert threshold tracking (FK: User)', module: 'Spending Analytics' },
            { path: '/forms/spending-reports', icon: '📊', title: 'T3 — Spending Report Transaction', desc: 'Periodic spending summaries with top canteen & category (FK: User)', module: 'Spending Analytics' },
            { path: '/forms/user-activity-logs', icon: '📝', title: 'T4 — User Activity Log', desc: 'Audit trail of user actions: Login, Order, Budget Set, Profile updates (FK: User)', module: 'User Management' },
        ]
    }
];

const MODULE_COLORS = {
    Management: '#7c3aed', Crew: '#0891b2', 'User Management': '#059669', 'Spending Analytics': '#d97706',
    Ordering: '#f97316', 'Wellness AI': '#16a34a', 'Food Recommendation': '#7c3aed'
};

export default function FormsIndex() {
    const navigate = useNavigate();

    const renderSection = (forms, label) => (
        <div>
            {forms.map(section => (
                <div key={section.type + label} style={{ marginBottom: 32 }}>
                    <h2 style={{ ...styles.sectionTitle, color: section.color }}>
                        {section.type === 'Master' ? '📘' : '📗'} {section.type} Forms
                    </h2>
                    <div style={styles.grid}>
                        {section.items.map(f => (
                            <button key={f.path} style={styles.card} onClick={() => navigate(f.path)}>
                                <div style={styles.icon}>{f.icon}</div>
                                <div style={styles.cardTitle}>{f.title}</div>
                                <div style={styles.cardDesc}>{f.desc}</div>
                                <div style={{ ...styles.moduleBadge, background: (MODULE_COLORS[f.module] || '#888') + '1a', color: MODULE_COLORS[f.module] || section.color }}>
                                    {f.module}
                                </div>
                                <div style={styles.ops}>
                                    {['Insert', 'Update', 'Delete', 'Search', 'Display'].map(op => (
                                        <span key={op} style={styles.op}>{op}</span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>🗃️ Campus Bites — Database Forms</h1>
                <p style={styles.sub}>3 Master Forms · 4 Transaction Forms · Each with Insert / Update / Delete / Search / Display</p>
            </div>

            {/* MY FORMS */}
            <div style={{ ...styles.sectionBox, borderColor: '#7c3aed', background: '#faf5ff' }}>
                <div style={styles.sectionHeader}>
                    <span style={{ ...styles.ownerBadge, background: '#7c3aed' }}>👨‍💻 My Forms</span>
                    <div style={styles.modules}>
                        {['Management', 'Crew', 'User Management', 'Spending Analytics'].map(m => (
                            <span key={m} style={{ ...styles.badge, background: MODULE_COLORS[m] + '1a', color: MODULE_COLORS[m], border: `1px solid ${MODULE_COLORS[m]}44` }}>{m}</span>
                        ))}
                    </div>
                </div>
                {renderSection(MY_FORMS, 'mine')}
            </div>

            {/* FRIEND'S FORMS */}
            <div style={{ ...styles.sectionBox, borderColor: '#f97316', background: '#fff7ed' }}>
                <div style={styles.sectionHeader}>
                    <span style={{ ...styles.ownerBadge, background: '#f97316' }}>👫 Friend's Forms</span>
                    <div style={styles.modules}>
                        {['Ordering', 'Wellness AI', 'Food Recommendation'].map(m => (
                            <span key={m} style={{ ...styles.badge, background: MODULE_COLORS[m] + '1a', color: MODULE_COLORS[m], border: `1px solid ${MODULE_COLORS[m]}44` }}>{m}</span>
                        ))}
                    </div>
                </div>
                {renderSection(FRIEND_FORMS, 'friend')}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: 1100, margin: '0 auto', padding: 32, fontFamily: 'Poppins, sans-serif', minHeight: '100vh', background: '#fafafa' },
    header: { textAlign: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 800, color: '#1c1c1e', margin: 0 },
    sub: { color: '#6b7280', marginTop: 8, fontSize: 15 },
    sectionBox: { borderRadius: 16, border: '2px solid', padding: 24, marginBottom: 32 },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
    ownerBadge: { color: '#fff', borderRadius: 20, padding: '6px 16px', fontWeight: 700, fontSize: 14 },
    modules: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    badge: { borderRadius: 20, padding: '4px 12px', fontWeight: 600, fontSize: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 },
    card: { background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e5e7eb', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s' },
    icon: { fontSize: 30, marginBottom: 8 },
    cardTitle: { fontWeight: 700, fontSize: 14, color: '#1c1c1e', marginBottom: 6 },
    cardDesc: { fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 },
    moduleBadge: { display: 'inline-block', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600, marginBottom: 10 },
    ops: { display: 'flex', flexWrap: 'wrap', gap: 4 },
    op: { background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 500 },
};
