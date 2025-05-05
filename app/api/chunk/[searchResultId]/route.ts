import { NextResponse } from 'next/server';
import { doRequest } from '@/utils/fintool-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ searchResultId: string }> }
) {
  // Get the ID from the route params
  const { searchResultId } = (await params);

  if (!searchResultId) {
    return NextResponse.json(
      { error: 'Missing required parameter: searchResultId' },
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
    return NextResponse.json(chunksData[0]);
  } catch (error) {
    console.error('Error fetching chunk data:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the chunk data' },
      { status: 500 }
    );
  }
} 