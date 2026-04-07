
import React from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const NumberInput: React.FC<InputProps> = ({ label, className, ...props }) => {
    return (
        <div className="relative mb-6">
            <input
                type="number"
                className={cn(
                    "w-full bg-md-surface border border-md-outline rounded-lg px-4 py-3 text-md-secondary text-base transition-all outline-none",
                    "focus:border-md-primary focus:shadow-[0_0_0_2px_rgba(208,188,255,0.2)]",
                    className
                )}
                {...props}
            />
            <label className="absolute left-3.5 -top-2.5 bg-md-base px-1 text-xs font-medium text-md-primary">
                {label}
            </label>
        </div>
    );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
    const baseStyles = "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-md-primary text-md-onPrimary hover:brightness-90 shadow-lg",
        secondary: "bg-[#4a4458] text-[#e8def8] hover:bg-[#554e65] border border-[#79747e]",
        ghost: "bg-transparent text-md-primary hover:bg-md-surface2"
    };

    return (
        <button className={cn(baseStyles, variants[variant], className)} {...props}>
            {children}
        </button>
    );
};

interface TabProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

export const Tab: React.FC<TabProps> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all",
            active
                ? "text-md-primary border-b-2 border-md-primary"
                : "text-md-outline hover:text-gray-200"
        )}
    >
        {children}
    </button>
);

interface ViewToggleProps {
    activeView: '3d' | '2d';
    onViewChange: (view: '3d' | '2d') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ activeView, onViewChange }) => (
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-[#2b2930] rounded-full p-1 flex shadow-xl z-20 border border-[#49454f]">
        <button
            onClick={() => onViewChange('3d')}
            className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeView === '3d'
                    ? "bg-[#49454f] text-[#d0bcff]"
                    : "text-[#938f99] hover:text-[#e6e1e5]"
            )}
        >
            3D Model
        </button>
        <button
            onClick={() => onViewChange('2d')}
            className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeView === '2d'
                    ? "bg-[#49454f] text-[#d0bcff]"
                    : "text-[#938f99] hover:text-[#e6e1e5]"
            )}
        >
            2D Pattern
        </button>
    </div>
);
