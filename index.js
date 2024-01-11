import 'dotenv/config'
import * as fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'

const { BOT_TOKEN, GROUP_ID } = process.env
const bot = new TelegramBot(BOT_TOKEN, { polling: true })

console.log('Tholdier bot started')

const getMemeImage = msg => {
  const filePath = `memes/${msg}.jpg`
  const fileExists = fs.existsSync(filePath)

  if (fileExists) {
    const buffer = fs.readFileSync(filePath)
    return buffer
  }
}

const isChatAllowed = (fromId, chatId) => {
  if (
    fromId === chatId ||
    chatId === Number(GROUP_ID)
  ) {
    return true
  }
}

bot.onText(/\/meme/, async ({
  from: { id: fromId, username }, 
  chat: { id: chatId },
  text
}) => {
  if (isChatAllowed(fromId, chatId)) {
    const cleanMeme = text.split('meme').pop()
    const memeImage = getMemeImage(cleanMeme)
  
    if (memeImage) {
      await bot.sendPhoto(chatId, memeImage, { caption: `@${username}` })
    }
  }
})

bot.onText(/\/listmemes/, ({
  from: { id: fromId, username }, 
  chat: { id: chatId }
}) => {
  if (isChatAllowed(fromId, chatId)) {
    if (fromId !== chatId) {
      bot.sendMessage(chatId, `hey @${username}, will DM you with the list`)
    }
  
    const memeFiles = fs.readdirSync('memes')
    let message = '<b>Hey Tholdier!</b>\n'
    message += 'Here are the thools for the batthle:\n\n'
  
    for (const memeFile of memeFiles) {
      const memeName = memeFile.split('.')[0]
      message += `/meme${memeName}\n`
    }
  
    bot.sendMessage(fromId, message, {
      disable_web_page_preview: true,
      parse_mode : 'HTML'
    })
  }
})
