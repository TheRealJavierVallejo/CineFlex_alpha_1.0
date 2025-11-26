import React from 'react';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    clickable?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    hover = false,
    clickable = false,
    onClick,
}) => {
    return (
        <div
            className={`
        bg-app-panel border border-border rounded-md
        ${hover ? 'hover:border-border-focus transition-colors' : ''}
        ${clickable ? 'cursor-pointer hover:bg-app-hover' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => {
    return (
        <div className={`px-4 py-3 border-b border-border ${className}`}>
            {children}
        </div>
    );
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => {
    return (
        <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
            {children}
        </h3>
    );
};

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => {
    return <div className={`p-4 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => {
    return (
        <div className={`px-4 py-3 border-t border-border ${className}`}>
            {children}
        </div>
    );
};

export default Card;
