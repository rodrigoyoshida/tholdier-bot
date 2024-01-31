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
  const imageList = []
  const folderData = await listFolder('/memes')
  const subfoldersToList = [...folderData.subfolders]

  imageList.push(...folderData.files)

  for (const subfolder of subfoldersToList) {
    const subfolderData = await listFolder(subfolder.path)

    imageList.push(...subfolderData.files)
    subfoldersToList.push(...subfolderData.subfolders)
  }

  return imageList
}

const listFolder = async folder => {
  const { data: { entries } } = await dropbox.post('https://api.dropboxapi.com/2/files/list_folder', {
    'include_deleted': false,
    'include_has_explicit_shared_members': false,
    'include_media_info': false,
    'include_mounted_folders': true,
    'include_non_downloadable_files': false,
    'path': folder,
    'recursive': false
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const subfolders = entries
    .filter(i => i['.tag'] === 'folder')
    .map(i => ({ name: i.name, path: i.path_display }))

  const files = entries
    .filter(i => i['.tag'] === 'file' )
    .map(i => ({ name: i.name, path: i.path_display }))

  return { subfolders, files }
}

const downloadImage = async ({ name, path }) => {
  const cleanName = name.replace(' ', '_').toLowerCase()
  const res = await dropbox({
    method: 'post',
    url: 'https://content.dropboxapi.com/2/files/download',
    responseType: 'stream',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      'Dropbox-API-Arg': `{ "path": "${path}" }`
    }
  })

  await res.data.pipe(fs.createWriteStream(`./memes/${cleanName}`))
}

export const downloadMemes = async (memeList, allowedExtensions) => {
  const serverList = await getImageList()

  for (const serverMeme of serverList) {
    const memeAlreadyExists = memeList.find(localMeme => localMeme === serverMeme.name)
    const fileExt = serverMeme.name.substr(-3).toLowerCase()
    const isAllowedExt = allowedExtensions.find(i => i.ext === fileExt)

    if (!memeAlreadyExists && isAllowedExt) {
      await downloadImage(serverMeme)
    }
  }

  for (const localMeme of memeList) {
    const memeIsInServer = serverList.find(serverMeme => serverMeme.name === localMeme)

    if (!memeIsInServer) {
      fs.unlinkSync(`./memes/${localMeme}`)
    }
  }
}
