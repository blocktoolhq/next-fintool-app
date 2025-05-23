import { NextResponse } from 'next/server';
import { doRequest } from '@/utils/fintool-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ searchResultId: string }> }
) {
  // Get the ID from the route params
  const { searchResultId } = (await params);

  if (!searchResultId || searchResultId === '[object Object]') {
    return NextResponse.json(
      { error: 'Invalid searchResultId parameter' },
      { status: 400 }
    );
  }

  try {
    // Call the fintool API to get chunks data using the searchResultId
    const response = await doRequest({
      path: `v1/chunks?ids=${searchResultId}`,
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Failed to fetch chunk data' },
        { status: response.status }
      );
    }

    const chunksData = await response.json();
    
    if (!chunksData || !Array.isArray(chunksData) || chunksData.length === 0) {
      return NextResponse.json(
        { error: 'No chunk data found' },
        { status: 404 }
      );
    }

    // Ensure the data is serializable by creating a clean object
    const chunkData = chunksData[0];
    const cleanData = {
      id: chunkData.id || '',
      text: chunkData.text || '',
      document_id: chunkData.document_id || '',
      document_url: chunkData.document_url || '',
      ticker: chunkData.ticker || '',
      doc_type: chunkData.doc_type || ''
    };

    return NextResponse.json(cleanData);
  } catch (error) {
    console.error('Error fetching chunk data:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the chunk data' },
      { status: 500 }
    );
  }
} 