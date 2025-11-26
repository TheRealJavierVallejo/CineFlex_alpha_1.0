import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs component');
    }
    return context;
};

interface TabsProps {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    defaultValue,
    value: controlledValue,
    onValueChange,
    children,
    className = '',
}) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const activeTab = controlledValue ?? internalValue;

    const setActiveTab = (tab: string) => {
        if (controlledValue === undefined) {
            setInternalValue(tab);
        }
        onValueChange?.(tab);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
};

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
    return (
        <div className={`flex items-center gap-1 border-b border-border ${className}`} role="tablist">
            {children}
        </div>
    );
};

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
    value,
    children,
    icon,
    className = '',
    disabled = false,
}) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${value}`}
            disabled={disabled}
            onClick={() => setActiveTab(value)}
            className={`
        px-3 py-2 text-sm font-medium transition-colors
        border-b-2 -mb-px
        flex items-center gap-1.5
        ${isActive
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
        >
            {icon && <span className="w-4 h-4">{icon}</span>}
            {children}
        </button>
    );
};

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
    value,
    children,
    className = '',
}) => {
    const { activeTab } = useTabsContext();

    if (activeTab !== value) return null;

    return (
        <div
            role="tabpanel"
            id={`panel-${value}`}
            aria-labelledby={`tab-${value}`}
            className={className}
        >
            {children}
        </div>
    );
};

export default Tabs;
