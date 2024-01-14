import 'dotenv/config'
import * as fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'

const { BOT_TOKEN, GROUP_ID } = process.env
const bot = new TelegramBot(BOT_TOKEN, { polling: true })
const memeList = []

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
  if (isChatAllowed(fromId, chatId)) {
    const splitMeme = text.split('meme').pop()
    const cleanMeme = splitMeme.substring(0, 1) === '_' ? splitMeme.replace('_', '') : splitMeme
    const memeFile = getMemeFile(cleanMeme)

    if (memeFile) {
      await bot[memeFile.method](chatId, memeFile.file, { caption: `@${username}` })
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
  
    let message = '<b>Hey Tholdier!</b>\n'
    message += 'You can both call the memes from here '
    message += 'or on the $Thol group. You can also '
    message += 'call it by using the name without the '
    message += 'underscore (_) to call if faster. \n\n'
    message += 'Example: /meme_thend_it and /memethendit. \n\n'

    for (const memeFile of memeList) {
      const memeName = memeFile.split('.')[0]
      message += `/meme_${memeName}\n`
    }
  
    bot.sendMessage(fromId, message, {
      disable_web_page_preview: true,
      parse_mode : 'HTML'
    })
  }
})

const loadMemeList = () => {
  const memeFiles = fs.readdirSync('memes')

  for (const memeFile of memeFiles) {
    memeList.push(memeFile)
  }
}

loadMemeList()
