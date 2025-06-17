import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';

// Generate a unique filename
const nanoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    7
);

export async function POST(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const filenameFromParams = searchParams.get('filename');

    if (!request.body) {
        return NextResponse.json({ message: 'No file body found' }, { status: 400 });
    }

    if (!filenameFromParams) {
        return NextResponse.json({ message: 'Filename query parameter is required' }, { status: 400 });
    }

    const blob = await put(filenameFromParams, request.body, {
        access: 'public',
    });

    return NextResponse.json(blob);
}