import React, { useState, useEffect } from 'react';

const OrderForm = () => {
    const [formData, setFormData] = useState({
        id: '',
        menuItemId: '',
        quantity: 1,
        instructions: '',
    });

    const [orders, setOrders] = useState([]);
    const [displayedOrders, setDisplayedOrders] = useState([]);
    const [highlightedId, setHighlightedId] = useState(null);
    const [editingOriginalId, setEditingOriginalId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetch('http://localhost:8001/api/assignment/orders')
            .then(res => res.json())
            .then(data => {
                setOrders(data);
                setDisplayedOrders(data);
            })
            .catch(err => console.error("Error fetching orders:", err));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMsg) setErrorMsg(''); // clear error when typing
    };

    const incrementQty = (e) => {
        e.preventDefault();
        setFormData({ ...formData, quantity: formData.quantity + 1 });
    };

    const decrementQty = (e) => {
        e.preventDefault();
        if (formData.quantity > 1) {
            setFormData({ ...formData, quantity: formData.quantity - 1 });
        }
    };

    const handleAction = async (e, action) => {
        e.preventDefault();
        setHighlightedId(null);
        setErrorMsg('');

        try {
            if (action === 'insert') {
                const newId = formData.id || Date.now().toString();
                const newOrder = { ...formData, id: newId };

                const res = await fetch('http://localhost:8001/api/assignment/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error inserting order");
                    return;
                }

                const created = await res.json();
                const updated = [...orders, created];
                setOrders(updated);
                setDisplayedOrders(updated);
                setFormData({ id: '', menuItemId: '', quantity: 1, instructions: '' });
                setEditingOriginalId(null);

            } else if (action === 'update') {
                const targetId = editingOriginalId || formData.id;
                const newId = formData.id || targetId;
                const updatedOrder = { ...formData, id: newId };

                const res = await fetch(`http://localhost:8001/api/assignment/orders/${targetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedOrder)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error updating order");
                    return;
                }

                const returned = await res.json();
                const updated = orders.map(o => o.id === targetId ? returned : o);
                setOrders(updated);
                setDisplayedOrders(updated);
                setEditingOriginalId(null);
                setFormData({ id: '', menuItemId: '', quantity: 1, instructions: '' });

            } else if (action === 'delete') {
                const res = await fetch(`http://localhost:8001/api/assignment/orders/${formData.id}`, {
                    method: 'DELETE'
                });

                if (!res.ok) {
                    const errData = await res.json();
                    setErrorMsg(errData.detail || "Error deleting order");
                    return;
                }

                const remaining = orders.filter(o => o.id !== formData.id);
                setOrders(remaining);
                setDisplayedOrders(remaining);
                setFormData({ id: '', menuItemId: '', quantity: 1, instructions: '' });
                setEditingOriginalId(null);
                setErrorMsg('');

            } else if (action === 'search') {
                const found = orders.find(o => o.id === formData.id);
                if (found) {
                    setHighlightedId(found.id);
                    if (!displayedOrders.some(i => i.id === found.id)) {
                        setDisplayedOrders(orders);
                    }
                }

            } else if (action === 'display') {
                const res = await fetch('http://localhost:8001/api/assignment/orders');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data);
                    setDisplayedOrders(data);
                }
            }
        } catch (err) {
            setErrorMsg(`Network error: ${err.message}`);
        }
    };

    const handleSort = (order) => {
        const sorted = [...displayedOrders].sort((a, b) => {
            // Sort by quantity
            if (order === 'asc') return a.quantity - b.quantity;
            return b.quantity - a.quantity;
        });
        setDisplayedOrders(sorted);
    };

    const selectOrder = (order) => {
        setFormData(order);
        setEditingOriginalId(order.id);
        setErrorMsg('');
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto">
            {/* LEFT SIDE: FORM */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.4] transition-all duration-300 hover:shadow-emerald-500/10 min-w-[320px]">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">Order Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Place and track food orders seamlessly.</p>
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
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Order ID (For Update/Delete/Search)</label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id}
                            onChange={handleChange}
                            placeholder="e.g. 101"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Select Menu Item</label>
                        <div className="relative">
                            <select
                                name="menuItemId"
                                value={formData.menuItemId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Choose an item...</option>
                                <option value="1">Masala Dosa - ₹80</option>
                                <option value="2">Chicken Biryani - ₹150</option>
                                <option value="3">Cold Coffee - ₹60</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Quantity</label>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={decrementQty}
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors text-xl font-bold"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="w-full h-12 text-center text-lg font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                min="1"
                            />
                            <button
                                onClick={incrementQty}
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 hover:text-emerald-700 transition-colors text-xl font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Special Instructions</label>
                        <textarea
                            name="instructions"
                            value={formData.instructions}
                            onChange={handleChange}
                            placeholder="e.g. Less spicy, extra cheese..."
                            rows="2"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none resize-none"
                        ></textarea>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={(e) => handleAction(e, 'insert')}
                            className="py-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Insert
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'update')}
                            className="py-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Update
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'search')}
                            className="py-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Search
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'display')}
                            className="py-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Display
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'delete')}
                            className="py-2 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center text-sm min-w-[100px]"
                        >
                            Delete
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT SIDE: DATA DISPLAY */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 md:flex-[0.6] max-h-[700px] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Order Records</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleSort('asc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Qty Asc ↑</button>
                        <button onClick={() => handleSort('desc')} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">Sort Qty Desc ↓</button>
                    </div>
                </div>

                {displayedOrders.length === 0 ? (
                    <p className="text-slate-500 italic">No orders found.</p>
                ) : (
                    <div className="space-y-3">
                        {displayedOrders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => selectOrder(order)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${highlightedId === order.id
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-md transform scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 bg-white/50 dark:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">Order #{order.id}</span>
                                    <span className="text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-1 rounded-md">Qty: {order.quantity}</span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                                    <span>Menu Item ID: {order.menuItemId}</span>
                                    {order.instructions && <span>Note: {order.instructions}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderForm;
