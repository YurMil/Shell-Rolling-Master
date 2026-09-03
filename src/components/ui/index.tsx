
import React, { useEffect, useRef } from 'react';
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

interface NumberFieldProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'defaultValue' | 'type'
> {
    label: string;
    value: number;
    // Called when the draft is committed (blur / Enter). The caller/store clamps
    // out-of-range values; this component never forces a fallback while typing.
    onCommit: (value: number) => void;
}

/** Accept both "0.44" and locale "0,44"; reject incomplete drafts like ".", "-", "0,". */
const parseDraft = (draft: string): number | null => {
    const normalized = draft.trim().replace(/,/g, '.');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
        return null;
    }
    // Trailing decimal separator is still an in-progress edit.
    if (normalized.endsWith('.')) {
        return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatCommitted = (value: number, draft?: string): string => {
    const formatted = String(value);
    return draft?.includes(',') ? formatted.replace('.', ',') : formatted;
};

/** Keep digits, an optional leading minus, and a single decimal separator (. or ,). */
const sanitizeTyping = (raw: string): string => {
    const compact = raw.replace(/\s/g, '');
    const negative = compact.startsWith('-');
    const body = (negative ? compact.slice(1) : compact).replace(/[^\d.,]/g, '');
    const sepIndex = body.search(/[.,]/);
    const next = sepIndex === -1
        ? body.replace(/[.,]/g, '')
        : `${body.slice(0, sepIndex).replace(/[.,]/g, '')}${body[sepIndex]}${body.slice(sepIndex + 1).replace(/[.,]/g, '')}`;
    return `${negative ? '-' : ''}${next}`;
};

export const NumberField: React.FC<NumberFieldProps> = ({
    label,
    value,
    onCommit,
    className,
    onFocus,
    onBlur,
    inputMode = 'decimal',
    // min/max/step are call-site documentation only; they must not land on a text input.
    min,
    max,
    step,
    ...props
}) => {
    void min;
    void max;
    void step;
    const inputRef = useRef<HTMLInputElement>(null);
    const valueRef = useRef(value);
    const onCommitRef = useRef(onCommit);

    useEffect(() => {
        valueRef.current = value;
        onCommitRef.current = onCommit;
    }, [value, onCommit]);

    // Uncontrolled: the DOM owns the draft so 3D/store work cannot freeze or
    // overwrite the characters the user is looking at.
    useEffect(() => {
        const el = inputRef.current;
        if (!el || el === document.activeElement) return;
        const next = formatCommitted(value);
        if (el.value !== next) el.value = next;
    }, [value]);

    const revert = () => {
        const el = inputRef.current;
        if (el) el.value = formatCommitted(valueRef.current);
    };

    const commitDraft = (draft: string) => {
        const parsed = parseDraft(draft);
        const el = inputRef.current;
        if (parsed === null) {
            if (el) el.value = formatCommitted(valueRef.current);
            return;
        }
        if (el) el.value = formatCommitted(parsed, draft);
        if (parsed !== valueRef.current) {
            onCommitRef.current(parsed);
        }
    };

    return (
        <div className="relative mb-6">
            <input
                {...props}
                ref={inputRef}
                type="text"
                inputMode={inputMode}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                defaultValue={formatCommitted(value)}
                onFocus={(e) => {
                    e.currentTarget.select();
                    onFocus?.(e);
                }}
                onChange={(e) => {
                    const el = e.currentTarget;
                    const next = sanitizeTyping(el.value);
                    if (next === el.value) return;
                    const pos = el.selectionStart ?? next.length;
                    const dropped = el.value.length - next.length;
                    el.value = next;
                    const caret = Math.max(0, pos - dropped);
                    el.setSelectionRange(caret, caret);
                }}
                onBlur={(e) => {
                    commitDraft(e.currentTarget.value);
                    onBlur?.(e);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitDraft(e.currentTarget.value);
                        e.currentTarget.blur();
                        return;
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        revert();
                        e.currentTarget.blur();
                        return;
                    }
                    props.onKeyDown?.(e);
                }}
                className={cn(
                    "w-full bg-md-surface border border-md-outline rounded-lg px-4 py-3 text-md-secondary text-base transition-all outline-none",
                    "focus:border-md-primary focus:shadow-[0_0_0_2px_rgba(208,188,255,0.2)]",
                    className
                )}
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
