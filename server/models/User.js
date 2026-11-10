import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import mongoose from 'mongoose'

const scrypt = promisify(scryptCallback)
const passwordKeyLength = 64

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
      match: /^[a-z0-9][a-z0-9._-]{2,31}$/,
      unique: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

userSchema.statics.createWithPassword = async function (username, password) {
  const user = new this({ username })
  await user.setPassword(password)
  await user.save()
  return user
}

userSchema.statics.createWithGoogleIdentity = async function ({
  googleSubject,
  email,
  displayName,
}) {
  const username = `g${createGoogleUsernameHash(googleSubject)}`
  return this.create({ username, googleSubject, email, displayName })
}

function createGoogleUsernameHash(googleSubject) {
  return createHash('sha256').update(googleSubject).digest('hex').slice(0, 30)
}

userSchema.methods.setPassword = async function (password) {
  const salt = randomBytes(16).toString('base64url')
  const derivedKey = await scrypt(password, salt, passwordKeyLength)
  this.passwordHash = `${salt}:${derivedKey.toString('base64url')}`
}

userSchema.methods.verifyPassword = async function (password) {
  const [salt, storedKey] = this.passwordHash?.split(':') ?? []

  if (!salt || !storedKey) {
    return false
  }

  const derivedKey = await scrypt(password, salt, passwordKeyLength)
  const expectedKey = Buffer.from(storedKey, 'base64url')

  return expectedKey.length === derivedKey.length &&
    timingSafeEqual(expectedKey, derivedKey)
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
