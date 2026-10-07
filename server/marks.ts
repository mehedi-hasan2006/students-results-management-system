export function isValidMarkRange(marks: number, fullMarks: number, passMarks: number): boolean {
  return Number.isFinite(marks)
    && Number.isFinite(fullMarks)
    && Number.isFinite(passMarks)
    && marks >= 0
    && fullMarks > 0
    && marks <= fullMarks
    && passMarks >= 0
    && passMarks <= fullMarks;
}

export function calculateGrade(marks: number, fullMarks: number, passMarks: number): string {
  if (marks < passMarks) return "F";
  const percentage = (marks / fullMarks) * 100;
  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  return "D";
}
