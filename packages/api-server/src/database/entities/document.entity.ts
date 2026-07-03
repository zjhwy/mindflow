import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('documents')
export class DocumentEntity {
  @PrimaryColumn({ length: 64 })
  fileId!: string;

  @Column({ length: 256, default: '未命名导图' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 64 })
  @Index()
  ownerId!: string;

  @Column({ type: 'jsonb', default: '[]' })
  linesData!: string; // JSON 序列化的 InnerLine[]

  @Column({ type: 'jsonb', default: '{}' })
  settings!: string;

  @Column({ length: 32, default: 'logic-right' })
  layoutType!: string;

  @Column({ type: 'int', default: 0 })
  @Index()
  totalNodes!: number;

  @Column({ type: 'int', default: 0 })
  version!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
