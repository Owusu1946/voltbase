import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_KEYS } from '@voltbase/constants';

async function proxyStorageRequest(
  request: NextRequest,
  pathSegments: string[],
) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ message: 'API_URL is not configured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const targetPath = pathSegments.map(encodeURIComponent).join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${apiUrl.replace(/\/$/, '')}/${targetPath}${search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const contentLength = request.headers.get('content-length');
  if (contentLength) headers.set('content-length', contentLength);
  headers.set('cookie', `${COOKIE_KEYS.ACCESS_TOKEN}=${accessToken}`);

  const init: RequestInit = {
    method: request.method,
    headers,
    duplex: 'half',
  } as RequestInit;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) responseHeaders.set('content-type', upstreamType);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStorageRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStorageRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStorageRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStorageRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyStorageRequest(request, path);
}
