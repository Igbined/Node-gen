import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const form = await request.formData();
  const projectName = form.get('projectName');
  const chatId = form.get('chatId');
  const photo = form.get('photo');

  if (!projectName || !chatId || !photo) {
    return new Response(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Upload photo to Vercel Blob
    const { url: photoUrl } = await put(photo.name, photo, {
      access: 'public',
    });

    // Save project config to Vercel KV
    await kv.set(`project:${projectName}`, {
      chatId,
      photoUrl,
      name: projectName,
    });

    const projectUrl = `${new URL(request.url).origin}/U/${projectName}`;

    return new Response(JSON.stringify({ success: true, url: projectUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating project:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}