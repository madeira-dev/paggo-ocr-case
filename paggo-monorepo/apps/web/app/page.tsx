'use client';

import { useEffect, useState } from 'react';
import { fetchDataFromBackend } from '../lib/api';

export default function HomePage() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getData() {
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        const result = await fetchDataFromBackend();
        setData(result);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Frontend Connected to Backend!</h1>

      {loading && (
        <p className="text-xl text-gray-600">Loading data from backend...</p>
      )}

      {error && (
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg border border-red-300">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            Please ensure your backend is deployed and running correctly, and its Vercel Project ID is configured in your frontend's `vercel.json`.
          </p>
        </div>
      )}

      {data && !loading && !error && (
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Backend Response:</h2>
          <pre className="bg-gray-50 p-4 rounded-md text-gray-900 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
          <p className="mt-4 text-sm text-gray-500">
            This data was fetched dynamically from your deployed NestJS backend.
          </p>
        </div>
      )}

      {!data && !loading && !error && (
        <p className="text-xl text-gray-600">No data fetched yet.</p>
      )}
    </div>
  );
}