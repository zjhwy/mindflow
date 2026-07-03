import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  userId!: string;

  @Column({ unique: true, length: 64 })
  @Index()
  username!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ length: 32, default: 'editor' })
  role!: string;

  @Column({ length: 128, nullable: true })
  displayName?: string;

  @Column({ length: 256, nullable: true })
  avatar?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
