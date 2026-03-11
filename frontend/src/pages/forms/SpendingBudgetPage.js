import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace('/api', '') + '/api/assignment';
const EMPTY = { id: '', userId: '', monthYear: new Date().toISOString().slice(0, 7), budgetLimit: '', amountSpent: '0', alertThreshold: '80' };

export default function SpendingBudgetPage() {
    const [form, setForm] = useState(EMPTY);
    const [rows, setRows] = useState([]);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [msg, setMsg] = useState('');
    const [editMode, setEditMode] = useState(false);

    const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
    const load = () => axios.get(`${API}/spending-budgets`).then(r => setRows(r.data)).catch(() => { });
    useEffect(() => { load(); }, []);

    const handleInsert = async () => {
        try { await axios.post(`${API}/spending-budgets`, form); notify('✅ Spending Budget set!'); setForm(EMPTY); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleUpdate = async () => {
        try { await axios.put(`${API}/spending-budgets/${form.id}`, form); notify('✅ Updated!'); setForm(EMPTY); setEditMode(false); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleDelete = async (id) => {
        if (!window.confirm(`Delete budget ${id}?`)) return;
        try { await axios.delete(`${API}/spending-budgets/${id}`); notify('✅ Deleted!'); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleSearch = async () => {
        try { const r = await axios.get(`${API}/spending-budgets/${searchId}`); setSearchResult(r.data); }
        catch { setSearchResult(null); notify('❌ Not found'); }
    };

    const usagePercent = (spent, limit) => {
        const pct = Math.round((parseFloat(spent) / parseFloat(limit)) * 100);
        return isNaN(pct) ? 0 : Math.min(pct, 100);
    };

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>💰 T2 — Spending Budget Transaction</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Transaction table — monthly budgets set by/for users with spent tracking & alerts (FK: User ID → User Account Master)</p>
            {msg && <div style={styles.msg}>{msg}</div>}

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>{editMode ? '✏️ Update Budget' : '➕ Insert Budget'}</h3>
                <div style={styles.grid}>
                    {[['id', 'Budget ID'], ['userId', 'User ID (FK)'], ['monthYear', 'Month-Year (YYYY-MM)'], ['budgetLimit', 'Budget Limit (₹)'], ['amountSpent', 'Amount Spent (₹)'], ['alertThreshold', 'Alert Threshold (%)']].map(([k, lbl]) => (
                        <div key={k} style={styles.field}>
                            <label style={styles.label}>{lbl}</label>
                            <input style={styles.input} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={lbl} disabled={editMode && k === 'id'} />
                        </div>
                    ))}
                </div>
                <div style={styles.btnRow}>
                    {editMode ? (
                        <><button style={styles.btnPrimary} onClick={handleUpdate}>Update</button>
                        <button style={styles.btnSecondary} onClick={() => { setForm(EMPTY); setEditMode(false); }}>Cancel</button></>
                    ) : <button style={styles.btnPrimary} onClick={handleInsert}>Insert</button>}
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔍 Search by Budget ID</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...styles.input, flex: 1 }} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter Budget ID" />
                    <button style={styles.btnPrimary} onClick={handleSearch}>Search</button>
                </div>
                {searchResult && (
                    <table style={styles.table}><thead><tr>{Object.keys(searchResult).map(k => <th style={styles.th} key={k}>{k}</th>)}</tr></thead>
                        <tbody><tr>{Object.values(searchResult).map((v, i) => <td style={styles.td} key={i}>{String(v)}</td>)}</tr></tbody></table>
                )}
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Display All Spending Budgets</h3>
                {rows.length === 0 ? <p style={{ color: '#888' }}>No records found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>ID</th><th style={styles.th}>User ID</th><th style={styles.th}>Month</th><th style={styles.th}>Budget (₹)</th><th style={styles.th}>Spent (₹)</th><th style={styles.th}>Usage</th><th style={styles.th}>Alert %</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>{rows.map(row => {
                                const pct = usagePercent(row.amountSpent, row.budgetLimit);
                                const exceed = pct >= parseInt(row.alertThreshold || 80);
                                return (
                                    <tr key={row.id}>
                                        <td style={styles.td}>{row.id}</td><td style={styles.td}>{row.userId}</td>
                                        <td style={styles.td}>{row.monthYear}</td><td style={styles.td}>₹{row.budgetLimit}</td>
                                        <td style={styles.td}>₹{row.amountSpent}</td>
                                        <td style={styles.td}>
                                            <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, width: 80 }}>
                                                <div style={{ background: exceed ? '#ef4444' : '#22c55e', borderRadius: 6, height: 8, width: `${pct}%` }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: exceed ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{pct}%</span>
                                        </td>
                                        <td style={styles.td}>{row.alertThreshold}%</td>
                                        <td style={styles.td}>
                                            <button style={styles.btnEdit} onClick={() => { setForm(row); setEditMode(true); }}>Edit</button>
                                            <button style={styles.btnDel} onClick={() => handleDelete(row.id)}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'Poppins, sans-serif' },
    title: { fontSize: 24, fontWeight: 700, color: '#d97706', marginBottom: 8 },
    card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #fde68a' },
    cardTitle: { fontWeight: 600, fontSize: 16, marginBottom: 14, color: '#1c1c1e' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' },
    btnRow: { marginTop: 14, display: 'flex', gap: 8 },
    btnPrimary: { background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnEdit: { background: '#fbbf24', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6, fontSize: 12 },
    btnDel: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
    th: { background: '#fffbeb', padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #fde68a' },
    td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
    msg: { background: '#fffbeb', border: '1px solid #d97706', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 500 },
};
