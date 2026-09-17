import { AttachmentView, MessageView } from '../../../entities/chat/model/types';

export interface MediaItem {
  message: MessageView;
  attachment: AttachmentView;
}

export interface LinkItem {
  message: MessageView;
  url: string;
  hostname: string;
}

export interface GroupedSection<T> {
  label: string;
  items: T[];
}
