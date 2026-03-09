import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace('/api', '') + '/api/assignment';

const EMPTY = { id: '', name: '', rollNo: '', email: '', canteenPreference: 'sopanam' };

export default function StudentMasterPage() {
    const [form, setForm] = useState(EMPTY);
    const [rows, setRows] = useState([]);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [msg, setMsg] = useState('');
    const [editMode, setEditMode] = useState(false);

    const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
    const load = () => axios.get(`${API}/students`).then(r => setRows(r.data)).catch(() => { });

    useEffect(() => { load(); }, []);

    const handleInsert = async () => {
        try {
            await axios.post(`${API}/students`, form);
            notify('✅ Student inserted!'); setForm(EMPTY); load();
        } catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };

    const handleUpdate = async () => {
        try {
            await axios.put(`${API}/students/${form.id}`, form);
            notify('✅ Student updated!'); setForm(EMPTY); setEditMode(false); load();
        } catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Delete student ${id}?`)) return;
        try {
            await axios.delete(`${API}/students/${id}`);
            notify('✅ Deleted!'); load();
        } catch (e) { notify('❌ ' + (e.response?.data?.detail || e.message)); }
    };

    const handleSearch = async () => {
        try {
            const r = await axios.get(`${API}/students/${searchId}`);
            setSearchResult(r.data);
        } catch { setSearchResult(null); notify('❌ Not found'); }
    };

    const startEdit = (row) => { setForm(row); setEditMode(true); };

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>🎓 M2 — Student Master</h2>
            {msg && <div style={styles.msg}>{msg}</div>}

            {/* Form */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>{editMode ? '✏️ Update Student' : '➕ Insert Student'}</h3>
                <div style={styles.grid}>
                    {[['id', 'Student ID'], ['name', 'Full Name'], ['rollNo', 'Roll No'], ['email', 'Email']].map(([k, lbl]) => (
                        <div key={k} style={styles.field}>
                            <label style={styles.label}>{lbl}</label>
                            <input style={styles.input} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={lbl} disabled={editMode && k === 'id'} />
                        </div>
                    ))}
                    <div style={styles.field}>
                        <label style={styles.label}>Canteen Preference</label>
                        <select style={styles.input} value={form.canteenPreference} onChange={e => setForm({ ...form, canteenPreference: e.target.value })}>
                            <option value="sopanam">Sopanam</option>
                            <option value="mba">MBA</option>
                            <option value="samudra">Samudra</option>
                        </select>
                    </div>
                </div>
                <div style={styles.btnRow}>
                    {editMode ? (
                        <>
                            <button style={styles.btnPrimary} onClick={handleUpdate}>Update</button>
                            <button style={styles.btnSecondary} onClick={() => { setForm(EMPTY); setEditMode(false); }}>Cancel</button>
                        </>
                    ) : (
                        <button style={styles.btnPrimary} onClick={handleInsert}>Insert</button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>🔍 Search by Student ID</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...styles.input, flex: 1 }} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter Student ID" />
                    <button style={styles.btnPrimary} onClick={handleSearch}>Search</button>
                </div>
                {searchResult && (
                    <table style={styles.table}>
                        <thead><tr>{Object.keys(searchResult).map(k => <th style={styles.th} key={k}>{k}</th>)}</tr></thead>
                        <tbody><tr>{Object.values(searchResult).map((v, i) => <td style={styles.td} key={i}>{v}</td>)}</tr></tbody>
                    </table>
                )}
            </div>

            {/* Display All */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Display All Students</h3>
                {rows.length === 0 ? <p style={{ color: '#888' }}>No records found.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>ID</th><th style={styles.th}>Name</th><th style={styles.th}>Roll No</th><th style={styles.th}>Email</th><th style={styles.th}>Preference</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.id}>
                                        <td style={styles.td}>{row.id}</td><td style={styles.td}>{row.name}</td>
                                        <td style={styles.td}>{row.rollNo}</td><td style={styles.td}>{row.email}</td>
                                        <td style={styles.td}>{row.canteenPreference}</td>
                                        <td style={styles.td}>
                                            <button style={styles.btnEdit} onClick={() => startEdit(row)}>Edit</button>
                                            <button style={styles.btnDel} onClick={() => handleDelete(row.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'Poppins, sans-serif' },
    title: { fontSize: 24, fontWeight: 700, color: '#f97316', marginBottom: 20 },
    card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #fed7aa' },
    cardTitle: { fontWeight: 600, fontSize: 16, marginBottom: 14, color: '#1c1c1e' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' },
    btnRow: { marginTop: 14, display: 'flex', gap: 8 },
    btnPrimary: { background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' },
    btnEdit: { background: '#fbbf24', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginRight: 6, fontSize: 12 },
    btnDel: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
    th: { background: '#fff7ed', padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #fed7aa' },
    td: { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
    msg: { background: '#fff7ed', border: '1px solid #f97316', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 500 },
};
