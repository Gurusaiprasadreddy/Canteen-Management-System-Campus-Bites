import { useNavigate } from 'react-router-dom';

const FORMS = [
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

export default function FormsIndex() {
    const navigate = useNavigate();
    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>🗃️ Campus Bites — Database Forms</h1>
                <p style={styles.sub}>3 Master Forms · 4 Transaction Forms · Each with Insert / Update / Delete / Search / Display</p>
                <div style={styles.modules}>
                    {['Ordering', 'Wellness AI', 'Food Recommendation'].map(m => (
                        <span key={m} style={styles.badge}>{m}</span>
                    ))}
                </div>
            </div>

            {FORMS.map(section => (
                <div key={section.type} style={{ marginBottom: 32 }}>
                    <h2 style={{ ...styles.sectionTitle, color: section.color }}>
                        {section.type === 'Master' ? '📘' : '📗'} {section.type} Forms
                    </h2>
                    <div style={styles.grid}>
                        {section.items.map(f => (
                            <button key={f.path} style={styles.card} onClick={() => navigate(f.path)}>
                                <div style={styles.icon}>{f.icon}</div>
                                <div style={styles.cardTitle}>{f.title}</div>
                                <div style={styles.cardDesc}>{f.desc}</div>
                                <div style={{ ...styles.module, background: section.type === 'Master' ? '#fff7ed' : '#f5f3ff', color: section.color }}>
                                    {f.module}
                                </div>
                                <div style={{ ...styles.ops }}>
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
}

const styles = {
    page: { maxWidth: 1000, margin: '0 auto', padding: 32, fontFamily: 'Poppins, sans-serif', minHeight: '100vh', background: '#fafafa' },
    header: { textAlign: 'center', marginBottom: 40 },
    title: { fontSize: 28, fontWeight: 800, color: '#1c1c1e', margin: 0 },
    sub: { color: '#6b7280', marginTop: 8, fontSize: 15 },
    modules: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 },
    badge: { background: '#fff7ed', color: '#f97316', borderRadius: 20, padding: '4px 14px', fontWeight: 600, fontSize: 13, border: '1px solid #fed7aa' },
    sectionTitle: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 },
    card: { background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s', ':hover': { transform: 'translateY(-2px)' } },
    icon: { fontSize: 32, marginBottom: 10 },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#1c1c1e', marginBottom: 6 },
    cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 },
    module: { display: 'inline-block', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600, marginBottom: 10 },
    ops: { display: 'flex', flexWrap: 'wrap', gap: 4 },
    op: { background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500 },
};
