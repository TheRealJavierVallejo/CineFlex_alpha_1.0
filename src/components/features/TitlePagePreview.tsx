import React from 'react';
import { TitlePageData } from '../../types';

interface TitlePagePreviewProps {
  data: TitlePageData;
}

export const TitlePagePreview: React.FC<TitlePagePreviewProps> = ({ data }) => {
  // Standard US Letter aspect ratio (8.5 x 11) = 0.7727
  // We'll use a container that maintains this aspect ratio
  
  return (
    <div className="w-full flex justify-center h-full overflow-hidden">
      <div 
        className="relative bg-white shadow-lg text-black font-mono text-sm"
        style={{
          width: '100%',
          maxWidth: '500px', // Scaled down for preview
          aspectRatio: '8.5 / 11',
          padding: '40px 50px', // Proportional margins
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid #e5e5e5'
        }}
      >
        {/* Top 1/3 Spacer */}
        <div style={{ flex: '0 0 33%' }}></div>

        {/* Center Content: Title, Credit, Authors */}
        <div className="flex flex-col items-center justify-start flex-1 w-full space-y-4">
          {data.title && (
            <h1 className="text-xl font-bold uppercase text-center max-w-[80%] leading-tight tracking-wider underline underline-offset-4 decoration-1">
              {data.title}
            </h1>
          )}

          {data.credit && (
            <div className="text-xs mt-4">{data.credit}</div>
          )}

          {data.authors && data.authors.length > 0 && (
            <div className="flex flex-col items-center space-y-1">
              {data.authors.map((author, idx) => (
                 author && <div key={idx} className="text-base">{author}</div>
              ))}
            </div>
          )}
          
           {data.source && (
            <div className="text-xs mt-4 text-center max-w-[80%]">
                {data.source}
            </div>
          )}
        </div>

        {/* Bottom Section: 3 Columns (Contact, Copyright, Draft) */}
        <div className="flex justify-between items-end w-full text-[10px] leading-relaxed mt-auto">
          
          {/* Bottom Left: Contact */}
          <div className="flex-1 text-left whitespace-pre-wrap pr-4">
            {data.contact}
          </div>

          {/* Bottom Center: Copyright */}
          <div className="flex-1 text-center px-2 whitespace-nowrap">
             {data.copyright && <div>{data.copyright}</div>}
          </div>

          {/* Bottom Right: Draft/WGA */}
          <div className="flex-1 text-right pl-4 space-y-1">
             {data.wgaRegistration && (
                <div className="mb-2">WGA: {data.wgaRegistration}</div>
             )}
             {data.draftVersion && (
                <div className="font-bold">{data.draftVersion}</div>
             )}
             {data.draftDate && (
                <div>{data.draftDate}</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};