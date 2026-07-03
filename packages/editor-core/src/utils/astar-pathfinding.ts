/**
 * A* 寻路算法 —— 用于连线智能避障
 *
 * 将画布区域划分为网格，标记被节点占用的格子为障碍物，
 * 然后用 A* 算法寻找从起点到终点的最短路径（避开障碍物）。
 *
 * 使用场景：org-structure 布局的折线(肘形连接符)遇到节点遮挡时自动绕行。
 */

interface GridCell {
  x: number;
  y: number;
  g: number;    // 实际代价
  h: number;    // 启发估计
  f: number;    // f = g + h
  parent: GridCell | null;
  blocked: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CELL_SIZE = 20;         // 每个网格单元 20px
const OBSTACLE_PADDING = 4;   // 障碍物扩展边距（防止连线靠太近）

/**
 * 使用 A* 算法在网格上寻找最短路径
 */
export function findPath(
  start: Point,
  end: Point,
  obstacles: Rect[],
  options?: {
    cellSize?: number;
    maxIterations?: number;
  }
): Point[] {
  const cs = options?.cellSize ?? CELL_SIZE;
  const maxIter = options?.maxIterations ?? 5000;

  // 计算网格边界
  const bounds = getBounds(start, end, obstacles);
  const cols = Math.ceil(bounds.width / cs) + 2;
  const rows = Math.ceil(bounds.height / cs) + 2;
  const originX = bounds.x - cs;
  const originY = bounds.y - cs;

  // 初始化网格
  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const cx = originX + c * cs + cs / 2;
      const cy = originY + r * cs + cs / 2;
      grid[r][c] = {
        x: cx,
        y: cy,
        g: Infinity,
        h: 0,
        f: Infinity,
        parent: null,
        blocked: false,
      };
    }
  }

  // 标记障碍物
  for (const obs of obstacles) {
    const padded: Rect = {
      x: obs.x - OBSTACLE_PADDING,
      y: obs.y - OBSTACLE_PADDING,
      width: obs.width + OBSTACLE_PADDING * 2,
      height: obs.height + OBSTACLE_PADDING * 2,
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        if (
          cell.x >= padded.x &&
          cell.x <= padded.x + padded.width &&
          cell.y >= padded.y &&
          cell.y <= padded.y + padded.height
        ) {
          cell.blocked = true;
        }
      }
    }
  }

  // 找到起点和终点的网格坐标
  const startCol = Math.round((start.x - originX) / cs);
  const startRow = Math.round((start.y - originY) / cs);
  const endCol = Math.round((end.x - originX) / cs);
  const endRow = Math.round((end.y - originY) / cs);

  // 边界检查
  if (
    startCol < 0 || startCol >= cols || startRow < 0 || startRow >= rows ||
    endCol < 0 || endCol >= cols || endRow < 0 || endRow >= rows
  ) {
    // 超出范围，返回直线路径
    return [start, end];
  }

  const startCell = grid[startRow][startCol];
  const endCell = grid[endRow][endCol];

  if (startCell.blocked) startCell.blocked = false; // 起点不能是障碍物
  if (endCell.blocked) endCell.blocked = false;     // 终点不能是障碍物

  // A* 算法
  const openSet: GridCell[] = [];
  startCell.g = 0;
  startCell.h = heuristic(startCell, endCell);
  startCell.f = startCell.h;
  openSet.push(startCell);

  let iterations = 0;

  while (openSet.length > 0 && iterations++ < maxIter) {
    // 找 f 最小的节点
    let currentIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIdx].f) {
        currentIdx = i;
      }
    }
    const current = openSet.splice(currentIdx, 1)[0];

    // 到达终点
    if (current === endCell) {
      return reconstructPath(current, start, end);
    }

    // 探索邻居（8方向）
    const neighbors = getNeighbors(current, grid, rows, cols);
    for (const neighbor of neighbors) {
      if (neighbor.blocked) continue;

      const isDiagonal =
        neighbor.x !== current.x && neighbor.y !== current.y;
      const moveCost = isDiagonal ? Math.SQRT2 * cs : cs;
      const tentativeG = current.g + moveCost;

      if (tentativeG < neighbor.g) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor, endCell);
        neighbor.f = neighbor.g + neighbor.h;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  // 未找到路径，返回直线
  return [start, end];
}

/**
 * 曼哈顿距离启发函数
 */
function heuristic(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 获取8方向邻居
 */
function getNeighbors(
  cell: GridCell,
  grid: GridCell[][],
  rows: number,
  cols: number
): GridCell[] {
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],   // 4方向
    [-1, -1], [-1, 1], [1, -1], [1, 1],  // 对角
  ];
  const result: GridCell[] = [];
  const rIdx = Math.round(cell.y / 1); // 需要通过坐标反查
  const cIdx = Math.round(cell.x / 1);

  for (const [dr, dc] of dirs) {
    // 通过坐标找到邻居
    const nr = findCellRow(cell, grid);
    const nc = findCellCol(cell, grid);
    if (nr < 0 || nc < 0) continue;

    const tr = nr + dr;
    const tc = nc + dc;
    if (tr >= 0 && tr < rows && tc >= 0 && tc < cols) {
      result.push(grid[tr][tc]);
    }
  }
  return result;
}

function findCellRow(cell: GridCell, grid: GridCell[][]): number {
  // 由于网格坐标是均匀的，可以反算
  if (grid.length === 0 || grid[0].length === 0) return -1;
  const cs = Math.abs(grid[1]?.[0]?.y - grid[0]?.[0]?.y) || CELL_SIZE;
  // 使用近似法
  for (let r = 0; r < grid.length; r++) {
    if (Math.abs(grid[r][0].y - cell.y) < cs / 2) return r;
  }
  return -1;
}

function findCellCol(cell: GridCell, grid: GridCell[][]): number {
  if (grid.length === 0 || grid[0].length === 0) return -1;
  const cs = Math.abs(grid[0][1]?.x - grid[0][0]?.x) || CELL_SIZE;
  for (let c = 0; c < grid[0].length; c++) {
    if (Math.abs(grid[0][c].x - cell.x) < cs / 2) return c;
  }
  return -1;
}

/**
 * 重建路径
 */
function reconstructPath(
  endCell: GridCell,
  start: Point,
  end: Point
): Point[] {
  const path: Point[] = [{ x: end.x, y: end.y }];
  let current: GridCell | null = endCell;

  while (current && current.parent) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  path.unshift({ x: start.x, y: start.y });

  // 简化路径：移除共线的中间点
  return simplifyPath(path);
}

/**
 * 简化路径：移除共线或几乎共线的中间点
 */
function simplifyPath(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // 检查是否共线（三点一线）
    const cross = (curr.x - prev.x) * (next.y - prev.y) -
                  (curr.y - prev.y) * (next.x - prev.x);

    if (Math.abs(cross) > 1) {
      // 不共线，保留
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * 计算包含起点、终点和所有障碍物的边界
 */
function getBounds(
  start: Point,
  end: Point,
  obstacles: Rect[]
): Rect {
  let minX = Math.min(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxX = Math.max(start.x, end.x);
  let maxY = Math.max(start.y, end.y);

  for (const obs of obstacles) {
    minX = Math.min(minX, obs.x);
    minY = Math.min(minY, obs.y);
    maxX = Math.max(maxX, obs.x + obs.width);
    maxY = Math.max(maxY, obs.y + obs.height);
  }

  return {
    x: minX - CELL_SIZE,
    y: minY - CELL_SIZE,
    width: maxX - minX + CELL_SIZE * 2,
    height: maxY - minY + CELL_SIZE * 2,
  };
}

/**
 * 将路径点转换为 SVG path 字符串（折线）
 */
export function pathToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x},${points[i].y}`;
  }
  return d;
}

/**
 * 检测路径段是否与矩形相交（用于判断是否需要避障）
 */
export function pathIntersectsRect(
  x1: number, y1: number,
  x2: number, y2: number,
  rect: Rect
): boolean {
  // 线段与矩形的碰撞检测：检查线段是否与矩形的任意边相交
  // 或线段端点是否在矩形内

  // 端点是否在矩形内
  if (x1 >= rect.x && x1 <= rect.x + rect.width &&
      y1 >= rect.y && y1 <= rect.y + rect.height) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.width &&
      y2 >= rect.y && y2 <= rect.y + rect.height) return true;

  // 线段与矩形四条边检测
  const edges = [
    { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },               // top
    { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }, // right
    { x1: rect.x + rect.width, y1: rect.y + rect.height, x2: rect.x, y2: rect.y + rect.height }, // bottom
    { x1: rect.x, y1: rect.y + rect.height, x2: rect.x, y2: rect.y },               // left
  ];

  for (const e of edges) {
    if (segmentsIntersect(x1, y1, x2, y2, e.x1, e.y1, e.x2, e.y2)) {
      return true;
    }
  }

  return false;
}

/**
 * 两条线段是否相交
 */
function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);

  if (
    (d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) &&
    (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0)
  ) return true;

  if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;

  return false;
}

function direction(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): number {
  return (x3 - x1) * (y2 - y1) - (x2 - x1) * (y3 - y1);
}

function onSegment(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): boolean {
  return (
    Math.min(x1, x2) <= x3 && x3 <= Math.max(x1, x2) &&
    Math.min(y1, y2) <= y3 && y3 <= Math.max(y1, y2)
  );
}

/**
 * 生成带智能避障的肘形路径
 *
 * 基本肘形：start → vertical to midY → horizontal to child.x → vertical to child
 * 如果与任何障碍节点相交，使用 A* 重新计算路径
 */
export function computeSmartElbowPath(
  fromX: number, fromY: number,
  toX: number, toY: number,
  obstacles: Rect[]
): string {
  const midY = (fromY + toY) / 2;

  // 检查基本肘形路径是否与障碍物相交
  const segments = [
    { x1: fromX, y1: fromY, x2: fromX, y2: midY },
    { x1: fromX, y1: midY, x2: toX, y2: midY },
    { x1: toX, y1: midY, x2: toX, y2: toY },
  ];

  let hasObstacle = false;
  for (const seg of segments) {
    for (const obs of obstacles) {
      if (pathIntersectsRect(seg.x1, seg.y1, seg.x2, seg.y2, obs)) {
        hasObstacle = true;
        break;
      }
    }
    if (hasObstacle) break;
  }

  if (!hasObstacle) {
    // 无障碍，返回基本肘形路径
    return `M${fromX},${fromY} L${fromX},${midY} L${toX},${midY} L${toX},${toY}`;
  }

  // 有障碍，使用 A* 寻路
  const path = findPath(
    { x: fromX, y: fromY },
    { x: toX, y: toY },
    obstacles
  );

  return pathToSvgPath(path);
}
