export class SessionViewDto {
  id!: string;
  deviceName!: string | null;
  ip!: string | null;
  city!: string | null;
  country!: string | null;
  createdAt!: Date;
  lastActiveAt!: Date;
  isCurrent!: boolean;
}
