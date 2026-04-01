import axios from 'axios';
import { apiClient, ListQueryParams, withDefaultListQuery } from '@/shared/api/base';
import { Podcast } from '@/entities/User/model/types';

type BackendPodcast = {
  id: string;
  title: string;
  author_id?: string;
  authorId?: string;
  author_name?: string;
  authorName?: string;
  duration_seconds?: number;
  durationSeconds?: number;
  listens_count?: string;
  listensCount?: string;
  file_name?: string;
  fileName?: string;
  content_type?: string;
  contentType?: string;
  is_uploaded?: boolean;
  isUploaded?: boolean;
  created_at?: string;
  createdAt?: string;
};

type ListPodcastsResponse = {
  podcasts: BackendPodcast[];
};

type PodcastResponse = {
  podcast: BackendPodcast;
};

type PlayPodcastResponse = {
  podcast: BackendPodcast;
  streamUrl: string;
  stream_url?: string;
};

type PrepareUploadResponse = {
  uploadUrl: string;
  upload_url?: string;
  objectKey: string;
  object_key?: string;
  podcast: BackendPodcast;
};

function normalizeContentType(value: unknown): string {
  switch (value) {
    case 1:
    case 'MEDIA_CONTENT_TYPE_AUDIO_MPEG':
    case 'audio/mpeg':
      return 'audio/mpeg';
    case 2:
    case 'MEDIA_CONTENT_TYPE_AUDIO_WAV':
    case 'audio/wav':
      return 'audio/wav';
    case 3:
    case 'MEDIA_CONTENT_TYPE_AUDIO_OGG':
    case 'audio/ogg':
      return 'audio/ogg';
    case 4:
    case 'MEDIA_CONTENT_TYPE_AUDIO_MP4':
    case 'audio/mp4':
      return 'audio/mp4';
    default:
      return '';
  }
}

function normalizePodcast(p: BackendPodcast): Podcast {
  return {
    id: p.id,
    title: p.title,
    author_id: p.author_id ?? p.authorId ?? '',
    author_name: p.author_name ?? p.authorName ?? 'Anonymous',
    duration_seconds: p.duration_seconds ?? p.durationSeconds ?? 0,
    listens_count: p.listens_count ?? p.listensCount ?? '0',
    file_name: p.file_name ?? p.fileName ?? '',
    content_type: normalizeContentType(p.content_type ?? p.contentType),
    is_uploaded: p.is_uploaded ?? p.isUploaded ?? false,
    created_at: p.created_at ?? p.createdAt ?? '',
  };
}

export const podcastApi = {
  list: async (params?: ListQueryParams): Promise<Podcast[]> => {
    const response = await apiClient.get<ListPodcastsResponse>('/api/v1/podcasts', {
      params: withDefaultListQuery(params),
    });
    return (response.data.podcasts ?? []).map(normalizePodcast);
  },
  
  get: async (id: string): Promise<Podcast> => {
    const response = await apiClient.get<PodcastResponse>(`/api/v1/podcasts/${id}`);
    return normalizePodcast(response.data.podcast);
  },
  
  play: async (id: string): Promise<{ podcast: Podcast, streamUrl: string }> => {
    const response = await apiClient.get<PlayPodcastResponse>(`/api/v1/podcasts/${id}/play`);
    return {
      podcast: normalizePodcast(response.data.podcast),
      streamUrl: response.data.stream_url ?? response.data.streamUrl ?? '',
    };
  },

  // Admin Actions
  adminCreate: async (title: string): Promise<Podcast> => {
    const response = await apiClient.post<PodcastResponse>('/api/admin/podcasts', { title });
    return normalizePodcast(response.data.podcast);
  },

  adminDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/podcasts/${id}`);
  },

  prepareUpload: async (payload: {
    podcastId: string;
    fileName: string;
    contentType: string;
    durationSeconds: number;
  }): Promise<{ uploadUrl: string; objectKey: string; podcast: Podcast }> => {
    const response = await apiClient.post<PrepareUploadResponse>(
      `/api/admin/podcasts/${payload.podcastId}/upload/prepare`,
      {
        podcastId: payload.podcastId,
        fileName: payload.fileName,
        contentType: payload.contentType,
        durationSeconds: Math.floor(payload.durationSeconds),
      },
    );
    return {
      uploadUrl: response.data.upload_url ?? response.data.uploadUrl ?? '',
      objectKey: response.data.object_key ?? response.data.objectKey ?? '',
      podcast: normalizePodcast(response.data.podcast),
    };
  },

  directUpload: async (uploadUrl: string, file: File): Promise<void> => {
    /** 
     * IMPORTANT: We MUST use a clean axios instance (or fetch) here.
     * If we use the app's apiClient, it might add an Authorization header (JWT),
     * which would invalidate the pre-signed S3/MinIO signature and cause 403 Forbidden.
     */
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      // Ensure no custom headers from interceptors are added
      transformRequest: [(data) => data], 
    });
  },

  completeUpload: async (payload: {
    podcastId: string;
    fileName: string;
    contentType: string;
    durationSeconds: number;
    objectKey: string;
  }): Promise<Podcast> => {
    const response = await apiClient.post<PodcastResponse>(
      `/api/admin/podcasts/${payload.podcastId}/upload/complete`,
      {
        podcastId: payload.podcastId,
        fileName: payload.fileName,
        contentType: payload.contentType,
        durationSeconds: Math.floor(payload.durationSeconds),
        objectKey: payload.objectKey,
      },
    );
    return normalizePodcast(response.data.podcast);
  },
};
