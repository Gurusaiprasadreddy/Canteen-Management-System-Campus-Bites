import React from 'react';
import MenuItemForm from '@/components/forms/MenuItemForm';

const MenuItemPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 -left-40 w-96 h-96 bg-orange-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-40 right-20 w-96 h-96 bg-red-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 w-full max-w-7xl px-4 lg:px-8">
                <MenuItemForm />
            </div>
        </div>
    );
};

export default MenuItemPage;
