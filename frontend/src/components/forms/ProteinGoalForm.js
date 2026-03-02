import React, { useState, useEffect } from 'react';

const ProteinGoalForm = () => {
    const [formData, setFormData] = useState({
        id: '',
        targetProtein: '',
        budgetLimit: '',
    });

    const [goals, setGoals] = useState([]);
    const [displayedGoals, setDisplayedGoals] = useState([]);
    const [highlightedId, setHighlightedId] = useState(null);
    const [editingOriginalId, setEditingOriginalId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetch('http://localhost:8001/api/assignment/protein-goals')
            .then(res => res.json())
            .then(data => {
                setGoals(data);
                setDisplayedGoals(data);
            })
            .catch(err => console.error("Error fetching goals:", err));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMsg) setErrorMsg(''); // clear error when typing
    };

    const handleAction = async (e, action) => {
        e.preventDefault();
        setHighlightedId(null);
        setErrorMsg('');

        try {
            if (action === 'insert') {
                const newId = formData.id || Date.now().toString();
                const newGoal = { ...formData, id: newId };

                const res = await fetch('http://localhost:8001/api/assignment/protein-goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newGoal)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error inserting goal");
                    return;
                }

                const created = await res.json();
                const updated = [...goals, created];
                setGoals(updated);
                setDisplayedGoals(updated);
                setFormData({ id: '', targetProtein: '', budgetLimit: '' });
                setEditingOriginalId(null);

            } else if (action === 'update') {
                const targetId = editingOriginalId || formData.id;
                const newId = formData.id || targetId;
                const updatedGoal = { ...formData, id: newId };

                const res = await fetch(`http://localhost:8001/api/assignment/protein-goals/${targetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedGoal)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error updating goal");
                    return;
                }

                const returned = await res.json();
                const updated = goals.map(g => g.id === targetId ? returned : g);
                setGoals(updated);
                setDisplayedGoals(updated);
                setEditingOriginalId(null);
                setFormData({ id: '', targetProtein: '', budgetLimit: '' });

            } else if (action === 'delete') {
                const res = await fetch(`http://localhost:8001/api/assignment/protein-goals/${formData.id}`, {
                    method: 'DELETE'
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error deleting goal");
                    return;
                }

                const remaining = goals.filter(g => g.id !== formData.id);
                setGoals(remaining);
                setDisplayedGoals(remaining);
                setFormData({ id: '', targetProtein: '', budgetLimit: '' });
                setEditingOriginalId(null);

            } else if (action === 'search') {
                const found = goals.find(g => g.id === formData.id);
                if (found) {
                    setHighlightedId(found.id);
                    if (!displayedGoals.some(i => i.id === found.id)) {
                        setDisplayedGoals(goals);
                    }
                }

            } else if (action === 'display') {
                const res = await fetch('http://localhost:8001/api/assignment/protein-goals');
                if (res.ok) {
                    const data = await res.json();
                    setGoals(data);
                    setDisplayedGoals(data);
                }
            }
        } catch (err) {
            setErrorMsg(`Network error: ${err.message}`);
        }
    };

    const handleSort = (order) => {
        const sorted = [...displayedGoals].sort((a, b) => {
            // Sort by budget
            if (order === 'asc') return parseFloat(a.budgetLimit) - parseFloat(b.budgetLimit);
            return parseFloat(b.budgetLimit) - parseFloat(a.budgetLimit);
        });
        setDisplayedGoals(sorted);
    };

    const selectGoal = (goal) => {
        setFormData(goal);
        setEditingOriginalId(goal.id);
        setErrorMsg('');
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto">
            {/* LEFT SIDE: FORM */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.4] transition-all duration-300 hover:shadow-cyan-500/10 min-w-[320px]">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 mb-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-500">Protein Goals</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Manage student fitness and nutritional targets.</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errorMsg}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Goal ID (For Update/Delete/Search)</label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id}
                            onChange={handleChange}
                            placeholder="e.g. 1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Daily Protein Target (g)</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="targetProtein"
                                value={formData.targetProtein}
                                onChange={handleChange}
                                placeholder="e.g. 120"
                                className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-medium">
                                g
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Daily Budget Limit (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="budgetLimit"
                                value={formData.budgetLimit}
                                onChange={handleChange}
                                placeholder="e.g. 500"
                                className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-medium">
                                ₹
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={(e) => handleAction(e, 'insert')}
                            className="py-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Insert
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'update')}
                            className="py-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Update
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'search')}
                            className="py-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Search
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'display')}
                            className="py-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Display
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'delete')}
                            className="py-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT SIDE: DATA DISPLAY */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.6] max-h-[700px] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Goal Records</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleSort('asc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Budget Asc ↑</button>
                        <button onClick={() => handleSort('desc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Budget Desc ↓</button>
                    </div>
                </div>

                {displayedGoals.length === 0 ? (
                    <p className="text-slate-500 italic">No records found.</p>
                ) : (
                    <div className="space-y-3">
                        {displayedGoals.map((goal) => (
                            <div
                                key={goal.id}
                                onClick={() => selectGoal(goal)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${highlightedId === goal.id
                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 shadow-md transform scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300 bg-white/50 dark:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">Goal ID: {goal.id}</span>
                                    <span className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-md">Limit: ₹{goal.budgetLimit}</span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex gap-4">
                                    <span>Target: {goal.targetProtein}g Protein</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProteinGoalForm;
