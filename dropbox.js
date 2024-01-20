import axios from 'axios'
import * as fs from 'fs'
import 'dotenv/config'

const { DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET, DROPBOX_REFRESH_TOKEN } = process.env
let token

const dropbox = axios.create()

dropbox.interceptors.response.use(res => res, async error => {
  const status = error.response?.status

  if (status === 401) {
    await refreshToken()
    error.config.headers.Authorization = `Bearer ${token}`
    return axios.request(error.config)
  }

  return Promise.reject(error)
})

const refreshToken = async () => {
  const { data: { access_token } } = await dropbox.postForm('https://api.dropboxapi.com/oauth2/token', {
    'client_id': DROPBOX_CLIENT_ID,
    'client_secret': DROPBOX_CLIENT_SECRET,
    'grant_type': 'refresh_token',
    'refresh_token': DROPBOX_REFRESH_TOKEN
  })

  token = access_token
}

const getImageList = async () => {
  const { data: { entries } } = await dropbox.post('https://api.dropboxapi.com/2/files/list_folder', {
    'include_deleted': false,
    'include_has_explicit_shared_members': false,
    'include_media_info': false,
    'include_mounted_folders': true,
    'include_non_downloadable_files': false,
    'path': '/memes',
    'recursive': false
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const cleanList = entries.map(i => i.name)
  return cleanList
}

const downloadImage = async name => {
  await dropbox({
    method: 'post',
    url: 'https://content.dropboxapi.com/2/files/download',
    responseType: 'stream',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      'Dropbox-API-Arg': `{ "path": "/memes/${name}" }`
    }
  }).then(res => {
    res.data.pipe(fs.createWriteStream(`./memes/${name}`));
  })
}

export const refreshMemes = async memeList => {
  const serverList = await getImageList()

  for (const serverMeme of serverList) {
    const memeAlreadyExists = memeList.find(localMeme => localMeme === serverMeme)

    if (!memeAlreadyExists) {
      await downloadImage(serverMeme)
    }
  }

  for (const localMeme of memeList) {
    const memeIsInDropbox = serverList.find(serverMeme => serverMeme === localMeme)

    if (!memeIsInDropbox) {
      fs.unlinkSync(`./memes/${localMeme}`)
    }
  }
}
