export interface FoundUserResponse {
  id: string;
  name: string;
  role: string;
  emoji?: string;
  src?: string | null;
  maskedEmail: string;
  maskedPhone: string;
}
