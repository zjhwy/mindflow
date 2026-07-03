import {
  Entity, Column, PrimaryColumn, CreateDateColumn, Index,
} from 'typeorm';

/**
 * 协同操作日志
 */
@Entity('operations_log')
export class OperationLogEntity {
  @PrimaryColumn({ length: 64 })
  opId!: string;

  @Column({ length: 64 })
  @Index()
  fileId!: string;

  @Column({ length: 64 })
  lineId!: string;

  @Column({ length: 32 })
  opType!: string; // insert | delete | update | move | fold | indent | outdent

  @Column({ type: 'jsonb', nullable: true })
  opData?: string;

  @Column({ length: 64 })
  userId!: string;

  @Column({ type: 'bigint' })
  timestamp!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
