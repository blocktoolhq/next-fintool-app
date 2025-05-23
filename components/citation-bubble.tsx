import React from 'react';
import Link from 'next/link';

interface CitationBubbleProps {
  searchResultId: string;
  onClick?: () => void;
}

export const CitationBubble: React.FC<CitationBubbleProps> = ({
  searchResultId,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    console.log(`Citation clicked: ${searchResultId}`);
  };

  return (
    <Link
      href={`/chunk/${searchResultId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-150 border border-blue-200 hover:border-blue-300"
      title={`View source: ${searchResultId}`}
    >
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      {searchResultId.slice(0, 6)}
    </Link>
  );
}; 