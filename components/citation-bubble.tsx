import React, { useState, useCallback } from 'react';

interface CitationBubbleProps {
  searchResultId: string;
  onClick?: () => void;
}

interface ChunkData {
  id: string;
  text: string;
  document_id: string;
  document_url: string;
  ticker: string;
  doc_type: string;
}

// Local cache for document data
const documentCache = new Map<string, ChunkData>();
const documentNameCache = new Map<string, string>();
// Simple citation numbering - each citation gets a unique sequential number
const citationIndexMap = new Map<string, number>();
let nextCitationIndex = 1;

export const CitationBubble: React.FC<CitationBubbleProps> = ({
  searchResultId,
  onClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chunkData, setChunkData] = useState<ChunkData | null>(null);
  const [loading, setLoading] = useState(false);

  const getDocumentIndex = (): number => {
    // Simple sequential numbering - each citation gets its own number
    if (!citationIndexMap.has(searchResultId)) {
      citationIndexMap.set(searchResultId, nextCitationIndex++);
    }
    
    return citationIndexMap.get(searchResultId)!;
  };

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      onClick();
    }

    // Check cache first
    if (documentCache.has(searchResultId)) {
      setChunkData(documentCache.get(searchResultId)!);
      setIsOpen(!isOpen);
      return;
    }

    if (!isOpen && !chunkData) {
      setLoading(true);
      try {
        const response = await fetch(`/api/chunk/${searchResultId}`);
        if (response.ok) {
          const data = await response.json();
          // Cache the data
          documentCache.set(searchResultId, data);
          // Cache the document name
          const docName = getDocumentName(data);
          documentNameCache.set(searchResultId, docName);
          setChunkData(data);
        }
      } catch (error) {
        console.error('Failed to fetch chunk data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    setIsOpen(!isOpen);
  }, [searchResultId, isOpen, chunkData, onClick]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  const getDocumentName = (data?: ChunkData): string => {
    if (data?.doc_type) {
      return data.doc_type.toUpperCase();
    }
    // Fallback parsing from searchResultId
    const parts = searchResultId.split('_');
    if (parts.length > 1) {
      const filename = parts[1] || '';
      if (filename.includes('10-q')) return '10-Q';
      if (filename.includes('10-k')) return '10-K';
      if (filename.includes('8-k')) return '8-K';
      if (filename.includes('def14a')) return 'DEF 14A';
      if (filename.includes('proxy')) return 'Proxy';
      if (filename.includes('s-1')) return 'S-1';
    }
    return 'SEC Filing';
  };

  const getCachedDocName = (): string => {
    return documentNameCache.get(searchResultId) || getDocumentName(chunkData || undefined);
  };

  const formatText = (text: string): React.ReactNode => {
    // Handle CSV tables
    if (text.includes('```csv')) {
      const parts = text.split(/```csv\n?|\n?```/);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is CSV content
          const rows = part.trim().split('\n');
          return (
            <div key={index} className="my-3 overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-300">
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const cells = row.split(',').map(cell => 
                      cell.replace(/^"|"$/g, '').trim()
                    );
                    return (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50' : ''}>
                        {cells.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-2 py-1 text-xs">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        } else {
          // Regular text
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.trim()}
            </div>
          );
        }
      });
    }

    // Handle regular text with line breaks
    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {text}
      </div>
    );
  };

  return (
    <span className="relative inline-block">
      <sup
        onClick={handleClick}
        className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium underline decoration-blue-300 hover:decoration-blue-500 transition-colors duration-150"
        title={`View ${getCachedDocName()} content`}
      >
        {loading ? '...' : getDocumentIndex()}
      </sup>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4" 
            onClick={closePopover}
          >
            {/* Modal */}
            <div 
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 text-lg font-bold rounded-full bg-blue-100 text-blue-700 border-2 border-blue-200">
                        {getDocumentIndex()}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {chunkData?.doc_type?.toUpperCase() || getCachedDocName()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {chunkData?.ticker || 'Unknown'} • Document Reference
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closePopover}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex flex-col max-h-[calc(80vh-140px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <svg className="animate-spin mx-auto h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-base text-gray-500 mt-3">Loading document content...</p>
                    </div>
                  </div>
                ) : chunkData ? (
                  <>
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="text-base text-gray-700 leading-relaxed">
                        {formatText(chunkData.text)}
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                      <div className="flex gap-3">
                        <a
                          href={chunkData.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 text-white text-center py-3 px-6 rounded-lg text-base font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Full Document
                        </a>
                        <button
                          onClick={closePopover}
                          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 px-6">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-base text-gray-500 mt-4">Failed to load document content</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </span>
  );
}; 