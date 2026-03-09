export type DiffLineType = 'added' | 'removed' | 'same';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  lineA?: number;
  lineB?: number;
}

/**
 * 简单行级 diff：逐行比对，标记新增/删除/相同
 * 使用前向查找启发式，优先匹配最近的相同行
 */
export function computeDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: DiffLine[] = [];

  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    if (idxA >= linesA.length) {
      result.push({ type: 'added', content: linesB[idxB]!, lineB: idxB + 1 });
      idxB++;
    } else if (idxB >= linesB.length) {
      result.push({
        type: 'removed',
        content: linesA[idxA]!,
        lineA: idxA + 1,
      });
      idxA++;
    } else if (linesA[idxA] === linesB[idxB]) {
      result.push({
        type: 'same',
        content: linesA[idxA]!,
        lineA: idxA + 1,
        lineB: idxB + 1,
      });
      idxA++;
      idxB++;
    } else {
      // Check if line from A appears later in B (deletion)
      const futureInB = linesB.indexOf(linesA[idxA]!, idxB + 1);
      const futureInA = linesA.indexOf(linesB[idxB]!, idxA + 1);

      if (
        futureInB !== -1 &&
        (futureInA === -1 || futureInB - idxB <= futureInA - idxA)
      ) {
        // Lines added in B
        while (idxB < futureInB) {
          result.push({
            type: 'added',
            content: linesB[idxB]!,
            lineB: idxB + 1,
          });
          idxB++;
        }
      } else if (futureInA !== -1) {
        // Lines removed from A
        while (idxA < futureInA) {
          result.push({
            type: 'removed',
            content: linesA[idxA]!,
            lineA: idxA + 1,
          });
          idxA++;
        }
      } else {
        result.push({
          type: 'removed',
          content: linesA[idxA]!,
          lineA: idxA + 1,
        });
        result.push({
          type: 'added',
          content: linesB[idxB]!,
          lineB: idxB + 1,
        });
        idxA++;
        idxB++;
      }
    }
  }

  return result;
}
