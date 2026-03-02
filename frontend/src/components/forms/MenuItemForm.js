import React, { useState, useEffect } from 'react';

const MenuItemForm = () => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        price: '',
        prepTime: '',
        itemType: 'Veg',
    });

    const [items, setItems] = useState([]);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [highlightedId, setHighlightedId] = useState(null);
    const [editingOriginalId, setEditingOriginalId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch data from backend on mount
    useEffect(() => {
        fetch('http://localhost:8001/api/assignment/menu-items')
            .then(res => res.json())
            .then(data => {
                setItems(data);
                setDisplayedItems(data);
            })
            .catch(err => console.error("Error fetching items:", err));
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
                const newItem = { ...formData, id: newId };

                const res = await fetch('http://localhost:8001/api/assignment/menu-items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error inserting item");
                    return;
                }

                const created = await res.json();
                const updatedItems = [...items, created];
                setItems(updatedItems);
                setDisplayedItems(updatedItems);
                setFormData({ id: '', name: '', price: '', prepTime: '', itemType: 'Veg' });
                setEditingOriginalId(null);

            } else if (action === 'update') {
                const targetId = editingOriginalId || formData.id;
                const newId = formData.id || targetId;
                const updatedItem = { ...formData, id: newId };

                const res = await fetch(`http://localhost:8001/api/assignment/menu-items/${targetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedItem)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error updating item");
                    return;
                }

                const returned = await res.json();
                const updated = items.map(item => item.id === targetId ? returned : item);
                setItems(updated);
                setDisplayedItems(updated);
                setEditingOriginalId(null);
                setFormData({ id: '', name: '', price: '', prepTime: '', itemType: 'Veg' });

            } else if (action === 'delete') {
                const res = await fetch(`http://localhost:8001/api/assignment/menu-items/${formData.id}`, {
                    method: 'DELETE'
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error deleting item");
                    return;
                }

                const remaining = items.filter(item => item.id !== formData.id);
                setItems(remaining);
                setDisplayedItems(remaining);
                setFormData({ id: '', name: '', price: '', prepTime: '', itemType: 'Veg' });
                setEditingOriginalId(null);

            } else if (action === 'search') {
                const found = items.find(item =>
                    item.id === formData.id ||
                    (formData.name && item.name.toLowerCase().includes(formData.name.toLowerCase()))
                );
                if (found) {
                    setHighlightedId(found.id);
                    if (!displayedItems.some(i => i.id === found.id)) {
                        setDisplayedItems(items);
                    }
                }

            } else if (action === 'display') {
                // Optionally re-fetch from backend to sync
                const res = await fetch('http://localhost:8001/api/assignment/menu-items');
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                    setDisplayedItems(data);
                }
            }
        } catch (err) {
            setErrorMsg(`Network error: ${err.message}`);
        }
    };

    const handleSort = (order) => {
        const sorted = [...displayedItems].sort((a, b) => {
            // Sort by price as an example, or name
            if (order === 'asc') return parseFloat(a.price) - parseFloat(b.price);
            return parseFloat(b.price) - parseFloat(a.price);
        });
        setDisplayedItems(sorted);
    };

    const selectItem = (item) => {
        setFormData(item);
        setEditingOriginalId(item.id);
        setErrorMsg(''); // Clear error when selecting an item
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto">
            {/* LEFT SIDE: FORM */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.4] transition-all duration-300 hover:shadow-primary/5 min-w-[320px]">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 mb-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-500">Menu Item Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Add, update, or remove canteen food items.</p>
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
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Item ID (For Update/Delete/Search)</label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id}
                            onChange={handleChange}
                            placeholder="e.g. 1"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Item Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Masala Dosa"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Price (₹)</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Prep Time (mins)</label>
                            <input
                                type="number"
                                name="prepTime"
                                value={formData.prepTime}
                                onChange={handleChange}
                                placeholder="15"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Item Type</label>
                        <select
                            name="itemType"
                            value={formData.itemType}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="Veg">Vegetarian</option>
                            <option value="Non-Veg">Non-Vegetarian</option>
                            <option value="Beverage">Beverage</option>
                            <option value="Snack">Snack</option>
                        </select>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={(e) => handleAction(e, 'insert')}
                            className="py-2 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Insert
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'update')}
                            className="py-2 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Update
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'search')}
                            className="py-2 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Search
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'display')}
                            className="py-2 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Display
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'delete')}
                            className="py-2 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT SIDE: DATA DISPLAY */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.6] max-h-[700px] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Database Records</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleSort('asc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Price Asc ↑</button>
                        <button onClick={() => handleSort('desc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Price Desc ↓</button>
                    </div>
                </div>

                {displayedItems.length === 0 ? (
                    <p className="text-slate-500 italic">No records found.</p>
                ) : (
                    <div className="space-y-3">
                        {displayedItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => selectItem(item)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${highlightedId === item.id
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md transform scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 bg-white/50 dark:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">ID: {item.id} - {item.name}</span>
                                    <span className="text-sm bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded-md">₹{item.price}</span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex gap-4">
                                    <span>Type: {item.itemType}</span>
                                    <span>Prep: {item.prepTime} mins</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuItemForm;
