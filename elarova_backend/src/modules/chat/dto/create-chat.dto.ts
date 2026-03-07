import { IsString, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsString()
  @IsOptional()
  title?: string;
}
