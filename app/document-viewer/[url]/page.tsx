'use client';

import React, { use } from 'react';
import Link from 'next/link';

interface PageParams {
  url: string;
}

export default function DocumentViewer({ params }: { params: any }) {
  const unwrappedParams = use(params) as PageParams;
  const documentUrl = decodeURIComponent(unwrappedParams.url);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Document Viewer</h2>
        <div className="border border-gray-200 rounded-md">
          <iframe
            src={documentUrl}
            className="w-full h-[80vh]"
            title="Document Viewer"
            sandbox="allow-same-origin allow-scripts allow-popups"
          ></iframe>
        </div>
      </div>
    </div>
  );
} 