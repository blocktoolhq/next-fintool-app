'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface PageParams {
  searchResultId: string;
}

export default function ChunkPage({ params }: { params: any }) {
  const unwrappedParams = use(params) as PageParams;
  const searchResultId = unwrappedParams.searchResultId;
  const [chunk, setChunk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChunkData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/chunk/${searchResultId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch chunk: ${response.statusText}`);
        }

        const data = await response.json();
        setChunk(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchChunkData();
  }, [searchResultId]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
            Error: {error}
          </div>
        ) : chunk ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Chunk Data (ID: {searchResultId})</h2>
            {chunk.document_url && (
              <Link
                href={`/document-viewer/${encodeURIComponent(chunk.document_url)}`}
                className="text-blue-600 hover:underline mb-4 inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Document
              </Link>
            )}
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[70vh] text-sm">
              {JSON.stringify(chunk, null, 2)}
            </pre>
          </div>
        ) : (
          <p>No data found</p>
        )}
      </div>
    </div>
  );
} 