import { kv } from '@vercel/kv';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get('projectName');

  if (!projectName) {
    return new Response('Project not found', { status: 404 });
  }

  try {
    const project = await kv.get(`project:${projectName}`);

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Read the template index.html
    const templatePath = path.join(process.cwd(), 'TEMPLATE', 'index.html');
    let indexContent = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders in memory
    indexContent = indexContent.replace(/IMAGES\/IMG_0546\.jpeg/g, project.photoUrl);
    indexContent = indexContent.replace(/<h1 class="text-\[28px\] font-semibold tracking-\[0.08em\] uppercase text-white leading-none">AMBASSADOR<\/h1>/g, `<h1 class="text-[28px] font-semibold tracking-[0.08em] uppercase text-white leading-none">${project.name}</h1>`);
    indexContent = indexContent.replace(/<span class="bg-white rounded-full px-5 py-\[7px\] text-\[13px\] font-medium text-gray-900 shadow-\[0_2px_12px_rgba\(0,0,0,0.10\)\] tracking-\[0.01em\]">\s*AMBASSADOR\s*<\/span>/g, `<span class="bg-white rounded-full px-5 py-[7px] text-[13px] font-medium text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.10)] tracking-[0.01em]">${project.name}</span>`);

    return new Response(indexContent, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Error serving dynamic page:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}