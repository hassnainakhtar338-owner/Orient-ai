// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type OrientChatMessagesRow = {
  id: string
  userId: string
  chatId: string
  role: string
  content: string
  imageUrl: string | null
  generatedUrl: string | null
  fileName: string | null
  createdAt: string
}

export type OrientChatsRow = {
  id: string
  userId: string
  title: string
  mode: string
  createdAt: string
  updatedAt: string
}

export type UsersRow = {
  id: string
  email: string
  emailVerified: number | string | null
  displayName: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: number | string | null
  role: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  lastSignIn: string
}
