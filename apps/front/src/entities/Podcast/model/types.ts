export interface Podcast {
  id: string
  title: string
  authorId: string
  authorName: string
  durationSeconds: number
  listensCount: number
  fileName: string
  contentType: string
  isUploaded: boolean
  createdAt: string
}
