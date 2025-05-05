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
    // Default behavior can be added here if needed
    console.log(`Citation clicked: ${searchResultId}`);
  };

  return (
    <Link
      href={`/chunk/${searchResultId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      title={`Citation: ${searchResultId}`}
    >
      "
    </Link>
  );
}; 