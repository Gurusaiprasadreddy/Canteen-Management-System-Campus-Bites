import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace('/api', '') + '/api/assignment';
const EMPTY = { id: '', userId: '', period: 'Monthly', totalSpent: '', topCanteen: 'sopanam', topCategory: 'Main Course', generatedAt: new Date().toISOString().slice(0, 16) };

export default function SpendingReportPage() {
    const [form, setForm] = useState(EMPTY);
    const [rows, setRows] = useState([]);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [msg, setMsg] = useState('');
    const [editMode, setEditMode] = useState(false);

    const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
    const load = () => axios.get(`${API}/spending-reports`).then(r => setRows(r.data)).catch(() => { });
    useEffect(() => { load(); }, []);

    const handleInsert = async () => {
        try { await axios.post(`${API}/spending-reports`, form); notify('✅ Spending Report generated!'); setForm(EMPTY); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleUpdate = async () => {
        try { await axios.put(`${API}/spending-reports/${form.id}`, form); notify('✅ Updated!'); setForm(EMPTY); setEditMode(false); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleDelete = async (id) => {
        if (!window.confirm(`Delete report ${id}?`)) return;
        try { await axios.delete(`${API}/spending-reports/${id}`); notify('✅ Deleted!'); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleSearch = async () => {
        try { const r = await axios.get(`${API}/spending-reports/${searchId}`); setSearchResult(r.data); }
        catch { setSearchResult(null); notify('❌ Not found'); }
    };

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>📊 T3 — Spending Report Transaction</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Transaction table — auto-generated periodic spending summaries per user (FK: User ID → User Account Master)</p>
            {msg && <div style={styles.msg}>{msg}</div>}

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>{editMode ? '✏️ Update Report' : '➕ Insert Spending Report'}</h3>
                <div style={styles.grid}>
                    {[['id', 'Report ID'], ['userId', 'User ID (FK)'], ['totalSpent', 'Total Spent (₹)']].map(([k, lbl]) => (
                        <div key={k} style={styles.field}>
                            <label style={styles.label}>{lbl}</label>
                            <input style={styles.input} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={lbl} disabled={editMode && k === 'id'} />
                        </div>
                    ))}
                    <div style={styles.field}>
                        <label style={styles.label}>Report Period</label>
                        <select style={styles.input} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Semester">Semester</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Top Canteen</label>
                        <select style={styles.input} value={form.topCanteen} onChange={e => setForm({ ...form, topCanteen: e.target.value })}>
                            <option value="sopanam">Sopanam</option>
                            <option value="mba">MBA</option>
                            <option value="samudra">Samudra</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Top Category</label>
                        <select style={styles.input} value={form.topCategory} onChange={e => setForm({ ...form, topCategory: e.target.value })}>
                            <option value="Breakfast">Breakfast</option>
                            <option value="Main Course">Main Course</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Beverages">Beverages</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Generated At</label>
                        <input type="datetime-local" style={styles.input} value={form.generatedAt} onChange={e => setForm({ ...form, generatedAt: e.target.value })} />
                    </div>
                </div>
                <div style={styles.btnRow}>
                    {editMode ? (
                        <><button style={styles.btnPrimary} onClick={handleUpdate}>Update</button>
                        <button style={styles.btnSecondary} onClick={() => { setForm(EMPTY); setEditMode(false); }}>Cancel</button></>
                    ) : <button style={styles.btnPrimary} onClick={handleInsert}>Insert</button>}
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔍 Search by Report ID</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...styles.input, flex: 1 }} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter Report ID" />
                    <button style={styles.btnPrimary} onClick={handleSearch}>Search</button>
                </div>
                {searchResult && (
                    <table style={styles.table}><thead><tr>{Object.keys(searchResult).map(k => <th style={styles.th} key={k}>{k}</th>)}</tr></thead>
                        <tbody><tr>{Object.values(searchResult).map((v, i) => <td style={styles.td} key={i}>{String(v)}</td>)}</tr></tbody></table>
                )}
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Display All Spending Reports</h3>
                {rows.length === 0 ? <p style={{ color: '#888' }}>No records found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>ID</th><th style={styles.th}>User ID</th><th style={styles.th}>Period</th><th style={styles.th}>Total (₹)</th><th style={styles.th}>Top Canteen</th><th style={styles.th}>Top Category</th><th style={styles.th}>Generated At</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>{rows.map(row => (
                                <tr key={row.id}>
                                    <td style={styles.td}>{row.id}</td><td style={styles.td}>{row.userId}</td>
                                    <td style={styles.td}><span style={{ background: '#fef3c7', color: '#b45309', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{row.period}</span></td>
                                    <td style={styles.td}><strong>₹{row.totalSpent}</strong></td>
                                    <td style={styles.td}>{row.topCanteen}</td><td style={styles.td}>{row.topCategory}</td>
                                    <td style={styles.td}>{row.generatedAt}</td>
                                    <td style={styles.td}>
                                        <button style={styles.btnEdit} onClick={() => { setForm(row); setEditMode(true); }}>Edit</button>
                                        <button style={styles.btnDel} onClick={() => handleDelete(row.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'Poppins, sans-serif' },
    title: { fontSize: 24, fontWeight: 700, color: '#7c3aed', marginBottom: 8 },
    card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #ddd6fe' },
    cardTitle: { fontWeight: 600, fontSize: 16, marginBottom: 14, color: '#1c1c1e' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' },
    btnRow: { marginTop: 14, display: 'flex', gap: 8 },
    btnPrimary: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnEdit: { background: '#fbbf24', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6, fontSize: 12 },
    btnDel: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
    th: { background: '#f5f3ff', padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #ddd6fe' },
    td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
    msg: { background: '#f5f3ff', border: '1px solid #7c3aed', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 500 },
};
