import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const update = await req.json()
    const message = update.message

    if (!message || !message.text) {
      return new Response('OK', { status: 200 })
    }

    const chatId = message.chat.id
    const text = message.text

    let replyText = "I didn't understand that command. Try /start or /lists."

    if (text.startsWith('/start')) {
      replyText = "Welcome to ZangSends Bot! 🚀\n\nYour chat ID has been registered. You can now use the following commands:\n/lists - View your contact lists\n/status - View today's summary\n/followups - View follow-ups due"
    } else if (text.startsWith('/lists')) {
      replyText = "📋 *Your Lists*\n\n1. Tech Founders SF (247 contacts | 50 pending)\n2. Q3 Agency Leads (1050 contacts | 0 pending)\n3. Cold Batch A (500 contacts | 200 pending)\n\nReply with a list number to view."
    } else if (text.startsWith('/status')) {
      replyText = "📊 *Today's Stats*\nSent: 47 | Opened: 12 (25%) | Replied: 3 (6%)\nBounced: 1 | Follow-ups due: 5"
    } else if (text.startsWith('/followups')) {
      replyText = "You have 5 follow-ups due today for 'Tech Founders SF'.\n[Send All Follow-ups]"
    }

    // Send the reply back to Telegram
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text())
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error handling webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
