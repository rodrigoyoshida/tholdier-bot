import 'dotenv/config'
import * as fs from 'fs'
import TelegramBot from 'node-telegram-bot-api'
import { downloadMemes } from './dropbox.js'

const { BOT_TOKEN, GROUP_ID, DROPBOX_LIBRARY } = process.env
const bot = new TelegramBot(BOT_TOKEN, { polling: true })
const lastSentMemes = []
let memeList = []

console.log('Tholdier bot started')

const allowedExtensions = [
  { ext: 'jpg', method: 'sendPhoto' },
  { ext: 'png', method: 'sendPhoto' },
  { ext: 'gif', method: 'sendAnimation' },
  { ext: 'mp4', method: 'sendAnimation' },
]

const isChatAllowed = (fromId, chatId) => {
  if (
    fromId === chatId ||
    chatId === Number(GROUP_ID)
  ) {
    return true
  }
}

const getMemeFile = msg => {
  for (const { ext, method } of allowedExtensions) {
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
      const firstCharMeme = splitMeme.substring(0, 1) === '_' ? splitMeme.replace('_', '') : splitMeme
      const cleanMeme = firstCharMeme.toLowerCase()
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
      message += '👉 Example: "Thend it.jpg" can be called using '
      message += '/meme_thend_it and /memethendit \n\n'
      message += `📚 Here is the full meme library: ${DROPBOX_LIBRARY} \n\n`
    
      bot.sendMessage(chatId, message, {
        disable_web_page_preview: true,
        parse_mode : 'HTML'
      })
    }
  } catch (error) {
    console.log('listmemes', error.stack)
  }
})

bot.onText(/\/downloadmemes/, async ({
  from: { id: fromId, username }, 
  chat: { id: chatId }
}) => {
  try {
    if (isChatAllowed(fromId, chatId)) {
      bot.sendMessage(chatId, `@${username} starting downloading the new memes... `)
      await downloadMemes(memeList, allowedExtensions)

      setTimeout(() => {
        bot.sendMessage(chatId, `@${username} finished downloading the new memes, updating the list... \n`)
        loadMemeList()
        bot.sendMessage(chatId, `@${username} meme list was updated, the new files can be used with the bot`)
      }, 5000)
    }
  } catch (error) {
    console.log('downloadMemes', error.stack)
  }
})

const commandByMemeFile = filename => {
  console.log(filename)
  const fileWithoutExt = filename.substr(0, filename.length - 4)
  const command = `/meme_${fileWithoutExt}`
  return command
}

const getRandomMeme = async () => {
  let randomMeme

  while (!randomMeme) {
    const randomIndex = Math.floor(Math.random() * memeList.length)
    const possibleRandomMeme = memeList[randomIndex]

    if (!lastSentMemes.includes(possibleRandomMeme)) {
      randomMeme = possibleRandomMeme
    }
  }

  if (lastSentMemes.length === 5) {
    lastSentMemes.shift()
  }

  lastSentMemes.push(randomMeme)

  return randomMeme
}

const sendRandomMeme = async () => {
  try {
    if (memeList.length) {
      const randomMeme = getRandomMeme()
      const memeExtension = randomMeme.substr(-3)
      const memeFile = fs.readFileSync(`memes/${randomMeme}`)
      const memeMethod = allowedExtensions.find(e => e.ext === memeExtension).method
    
      if (memeFile) {
        const command = commandByMemeFile(randomMeme)
        await bot[memeMethod](GROUP_ID, memeFile, { caption: command })
      }
    }
  } catch (error) {
    console.log('sendRandomMeme', error.stack)
  }
}

const loadMemeList = () => {
  const memeFiles = fs.readdirSync('memes')
  memeList = []

  for (const memeFile of memeFiles) {
    memeList.push(memeFile)
  }
}

loadMemeList()

setInterval(async () => {
  await sendRandomMeme()
}, 360000)
