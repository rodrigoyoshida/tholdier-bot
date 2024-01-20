import 'dotenv/config'
import * as fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
import { refreshMemes } from './dropbox.js'

const { BOT_TOKEN, GROUP_ID, DROPBOX_LIBRARY } = process.env
const bot = new TelegramBot(BOT_TOKEN, { polling: true })
let memeList = []

console.log('Tholdier bot started')

const isChatAllowed = (fromId, chatId) => {
  if (
    fromId === chatId ||
    chatId === Number(GROUP_ID)
  ) {
    return true
  }
}

const getMemeFile = msg => {
  const extList = [
    { ext: 'jpg', method: 'sendPhoto' },
    { ext: 'png', method: 'sendPhoto' },
    { ext: 'gif', method: 'sendAnimation' },
    { ext: 'mp4', method: 'sendAnimation' },
  ]

  for (const { ext, method } of extList) {
    const filePath = memeList.find(meme => {
      const hasFullName = meme === `${msg}.${ext}`
      const hasShortName = meme.replaceAll('_', '') === `${msg}.${ext}`
      return hasFullName || hasShortName
    })

    if (filePath) {
      const file = fs.readFileSync(`memes/${filePath}`)
      return { method, file }
    }
  }
}

bot.onText(/\/meme/, async ({
  from: { id: fromId, username }, 
  chat: { id: chatId },
  text
}) => {
  try {
    if (isChatAllowed(fromId, chatId)) {
      const splitMeme = text.split('meme').pop()
      const cleanMeme = splitMeme.substring(0, 1) === '_' ? splitMeme.replace('_', '') : splitMeme
      const memeFile = getMemeFile(cleanMeme)
  
      if (memeFile) {
        await bot[memeFile.method](chatId, memeFile.file, { caption: `@${username}` })
      }
    }
  } catch (error) {
    console.log('sendmeme', error.stack)
  }
})

bot.onText(/\/listmemes/, ({
  from: { id: fromId, username }, 
  chat: { id: chatId }
}) => {
  try {
    if (isChatAllowed(fromId, chatId)) {
      let message = `<b>🪖 Hey tholdierth @${username}!</b>\n\n`
      message += 'You can post the memes here both by calling it with '
      message += 'or without the underscore (_) to call if faster. '
      message += 'Just check the meme library, choose the meme you '
      message += 'want and run the command here using the filename. \n\n'
      message += '👉 Example: thend_it.jpg can be called using '
      message += '/meme_thend_it and /memethendit \n\n'
      message += `📚 Here is the full meme library: ${DROPBOX_LIBRARY} \n\n`
    
      bot.sendMessage(fromId, message, {
        disable_web_page_preview: true,
        parse_mode : 'HTML'
      })
    }
  } catch (error) {
    console.log('listmemes', error.stack)
  }
})

bot.onText(/\/refreshmemes/, async ({
  from: { id: fromId, username }, 
  chat: { id: chatId }
}) => {
  try {
    if (isChatAllowed(fromId, chatId)) {
      bot.sendMessage(chatId, `@${username} started refreshing the meme list`)
  
      await refreshMemes(memeList)
      loadMemeList()
  
      bot.sendMessage(chatId, `@${username} finished refreshing the meme list`)
    }
  } catch (error) {
    console.log('refreshmemes', error.stack)
  }
})

const loadMemeList = () => {
  const memeFiles = fs.readdirSync('memes')
  memeList = []

  for (const memeFile of memeFiles) {
    memeList.push(memeFile)
  }
}

loadMemeList()
