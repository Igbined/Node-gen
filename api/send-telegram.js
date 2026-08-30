import { kv } from '@vercel/kv';
import axios from 'axios';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { message, projectName } = await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let chatId;
  try {
    if (projectName) {
      const project = await kv.get(`project:${projectName}`);
      if (project) {
        chatId = project.chatId;
      }
    }
  } catch (error) {
    console.error('Could not read chat ID from KV:', error);
    // Continue without a specific chat ID, will fail later but good to know why
  }

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'Chat ID not found for project' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending to Telegram:', error.response ? error.response.data : error.message);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}