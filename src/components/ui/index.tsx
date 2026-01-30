
import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const NumberInput: React.FC<InputProps> = ({ label, className, ...props }) => {
    return (
        <div className="srm-relative srm-mb-6">
            <input
                type="number"
                className={cn(
                    "srm-w-full srm-bg-md-surface srm-border srm-border-md-outline srm-rounded-lg srm-px-4 srm-py-3 srm-text-md-secondary srm-text-base srm-transition-all srm-outline-none",
                    "focus:srm-border-md-primary focus:srm-shadow-[0_0_0_2px_rgba(208,188,255,0.2)]",
                    className
                )}
                {...props}
            />
            <label className="srm-absolute srm-left-3.5 srm--top-2.5 srm-bg-md-base srm-px-1 srm-text-xs srm-font-medium srm-text-md-primary">
                {label}
            </label>
        </div>
    );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
    const baseStyles = "srm-w-full srm-py-3 srm-rounded-lg srm-font-bold srm-flex srm-items-center srm-justify-center srm-gap-2 srm-transition-all disabled:srm-opacity-50 disabled:srm-cursor-not-allowed";

    const variants = {
        primary: "srm-bg-md-primary srm-text-md-onPrimary hover:srm-brightness-90 srm-shadow-lg",
        secondary: "srm-bg-[#4a4458] srm-text-[#e8def8] hover:srm-bg-[#554e65] srm-border srm-border-[#79747e]",
        ghost: "srm-bg-transparent srm-text-md-primary hover:srm-bg-md-surface2"
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
            "srm-px-6 srm-py-2 srm-rounded-full srm-text-sm srm-font-medium srm-transition-all",
            active
                ? "srm-text-md-primary srm-border-b-2 srm-border-md-primary"
                : "srm-text-md-outline hover:srm-text-gray-200"
        )}
    >
        {children}
    </button>
);
