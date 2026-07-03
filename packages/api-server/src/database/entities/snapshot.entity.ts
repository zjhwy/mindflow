import {
  Entity, Column, PrimaryColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('snapshots')
export class SnapshotEntity {
  @PrimaryColumn({ length: 64 })
  snapshotId!: string;

  @Column({ length: 64 })
  @Index()
  fileId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'jsonb' })
  data!: string;

  @Column({ length: 64 })
  createdBy!: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
