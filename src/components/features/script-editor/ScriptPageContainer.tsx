import React from 'react';

interface ScriptPageContainerProps {
  pageNumber: number;
  children: React.ReactNode;
  isLightMode: boolean;
}

export const ScriptPageContainer: React.FC<ScriptPageContainerProps> = ({
  pageNumber,
  children,
  isLightMode
}) => {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* Page Container - Looks like physical paper */}
      <div
        className={`
          relative w-[8.5in] min-h-[11in] 
          ${isLightMode ? 'bg-white' : 'bg-[#1E1E1E]'}
          shadow-2xl
          border ${isLightMode ? 'border-gray-200' : 'border-gray-800'}
        `}
        style={{
          paddingTop: '1in',
          paddingBottom: '1in',
          paddingLeft: '1.5in',
          paddingRight: '1in',
          fontFamily: 'Courier, monospace'
        }}
      >
        {/* Page Content */}
        <div className="relative">
          {children}
        </div>

        {/* Page Number at Bottom Center (like real scripts) */}
        <div 
          className={`
            absolute bottom-4 left-0 right-0 
            text-center text-[10px] font-mono
            ${isLightMode ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          {pageNumber}.
        </div>
      </div>
    </div>
  );
};