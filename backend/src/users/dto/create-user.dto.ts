export class CreateUserDto {
  readonly email: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly displayName?: string;

  constructor(props: {
    email: string;
    username: string;
    passwordHash: string;
    displayName?: string;
  }) {
    this.email = props.email;
    this.username = props.username;
    this.passwordHash = props.passwordHash;
    this.displayName = props.displayName;
  }
}
