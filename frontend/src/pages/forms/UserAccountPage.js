import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace('/api', '') + '/api/assignment';
const EMPTY = { id: '', name: '', email: '', role: 'student', status: 'Active' };

export default function UserAccountPage() {
    const [form, setForm] = useState(EMPTY);
    const [rows, setRows] = useState([]);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [msg, setMsg] = useState('');
    const [editMode, setEditMode] = useState(false);

    const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
    const load = () => axios.get(`${API}/user-accounts`).then(r => setRows(r.data)).catch(() => { });
    useEffect(() => { load(); }, []);

    const handleInsert = async () => {
        try { await axios.post(`${API}/user-accounts`, form); notify('✅ User Account inserted!'); setForm(EMPTY); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleUpdate = async () => {
        try { await axios.put(`${API}/user-accounts/${form.id}`, form); notify('✅ Updated!'); setForm(EMPTY); setEditMode(false); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleDelete = async (id) => {
        if (!window.confirm(`Delete user account ${id}?`)) return;
        try { await axios.delete(`${API}/user-accounts/${id}`); notify('✅ Deleted!'); load(); }
        catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };
    const handleSearch = async () => {
        try { const r = await axios.get(`${API}/user-accounts/${searchId}`); setSearchResult(r.data); }
        catch { setSearchResult(null); notify('❌ Not found'); }
    };

    const statusColor = { Active: '#f0fdf4', Inactive: '#fef9c3', Suspended: '#fef2f2' };
    const statusText = { Active: '#16a34a', Inactive: '#ca8a04', Suspended: '#dc2626' };

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>👤 M3 — User Account Master</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Master table — central user registry for all roles: Student, Management, Crew (Module: User Management)</p>
            {msg && <div style={styles.msg}>{msg}</div>}

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>{editMode ? '✏️ Update User Account' : '➕ Insert User Account'}</h3>
                <div style={styles.grid}>
                    {[['id', 'User ID'], ['name', 'Full Name'], ['email', 'Email']].map(([k, lbl]) => (
                        <div key={k} style={styles.field}>
                            <label style={styles.label}>{lbl}</label>
                            <input style={styles.input} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={lbl} disabled={editMode && k === 'id'} />
                        </div>
                    ))}
                    <div style={styles.field}>
                        <label style={styles.label}>Role</label>
                        <select style={styles.input} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="student">Student</option>
                            <option value="management">Management</option>
                            <option value="crew">Crew</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Account Status</label>
                        <select style={styles.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                        </select>
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
                <h3 style={styles.cardTitle}>🔍 Search by User ID</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...styles.input, flex: 1 }} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter User ID" />
                    <button style={styles.btnPrimary} onClick={handleSearch}>Search</button>
                </div>
                {searchResult && (
                    <table style={styles.table}><thead><tr>{Object.keys(searchResult).map(k => <th style={styles.th} key={k}>{k}</th>)}</tr></thead>
                        <tbody><tr>{Object.values(searchResult).map((v, i) => <td style={styles.td} key={i}>{String(v)}</td>)}</tr></tbody></table>
                )}
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Display All User Accounts</h3>
                {rows.length === 0 ? <p style={{ color: '#888' }}>No records found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>ID</th><th style={styles.th}>Name</th><th style={styles.th}>Email</th><th style={styles.th}>Role</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>{rows.map(row => (
                                <tr key={row.id}>
                                    <td style={styles.td}>{row.id}</td><td style={styles.td}>{row.name}</td>
                                    <td style={styles.td}>{row.email}</td><td style={styles.td}>{row.role}</td>
                                    <td style={styles.td}><span style={{ borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600, background: statusColor[row.status] || '#f3f4f6', color: statusText[row.status] || '#374151' }}>{row.status}</span></td>
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
    title: { fontSize: 24, fontWeight: 700, color: '#059669', marginBottom: 8 },
    card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #a7f3d0' },
    cardTitle: { fontWeight: 600, fontSize: 16, marginBottom: 14, color: '#1c1c1e' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' },
    btnRow: { marginTop: 14, display: 'flex', gap: 8 },
    btnPrimary: { background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnEdit: { background: '#fbbf24', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6, fontSize: 12 },
    btnDel: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
    th: { background: '#ecfdf5', padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #a7f3d0' },
    td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
    msg: { background: '#ecfdf5', border: '1px solid #059669', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 500 },
};
