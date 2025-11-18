import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vulnerability } = body;

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a security expert. Analyze this vulnerability and provide a detailed fix suggestion:

Package: ${vulnerability.packageName}
Version: ${vulnerability.version}
Severity: ${vulnerability.severity}
Vulnerability: ${vulnerability.title}
Description: ${vulnerability.description}

Provide:
1. Root cause analysis
2. Step-by-step fix instructions
3. Code examples if applicable
4. Prevention strategies
5. Alternative solutions if the main fix isn't feasible

Format your response in markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestion = response.text();

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}
