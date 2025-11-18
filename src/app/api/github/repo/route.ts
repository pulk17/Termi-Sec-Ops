import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, token } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    const client = new GitHubClient(token);
    const repository = await client.getRepository(owner, repo);

    return NextResponse.json(repository);
  } catch (error: any) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repository' },
      { status: error.status || 500 }
    );
  }
}
