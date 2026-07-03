import {
  Entity, Column, PrimaryColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('recycle_items')
export class RecycleItemEntity {
  @PrimaryColumn({ length: 64 })
  itemId!: string;

  @Column({ length: 64 })
  @Index()
  fileId!: string;

  @Column({ type: 'jsonb' })
  originalData!: string;

  @Column()
  deletedAt!: Date;

  @Column({ length: 64 })
  deletedBy!: string;

  @Column({ length: 32 })
  itemType!: string; // 'node' | 'document'

  @Column({ length: 512 })
  location!: string;

  @Column({ default: false })
  isRestored!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
