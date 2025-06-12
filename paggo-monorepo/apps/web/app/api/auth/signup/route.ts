import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';

        const res = await fetch(`${backendUrl}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json({ message: data.message || 'Sign up failed' }, { status: res.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Signup API error:', error);
        return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
    }
}