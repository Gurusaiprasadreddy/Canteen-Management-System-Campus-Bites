import React from 'react';
import MenuItemForm from '@/components/forms/MenuItemForm';
import ProteinGoalForm from '@/components/forms/ProteinGoalForm';
import OrderForm from '@/components/forms/OrderForm';

const FormShowcase = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-40 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-40 left-20 w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                        Database Operations Forms
                    </h1>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        These three modern, glassmorphism UI forms demonstrate the requested insert, update, delete, search, and display functionalities mapped to your complex nested database constraints.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                    <div className="w-full">
                        <MenuItemForm />
                    </div>
                    <div className="w-full">
                        <ProteinGoalForm />
                    </div>
                    <div className="w-full">
                        <OrderForm />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormShowcase;
