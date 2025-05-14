/**
 * SQL에 전달할 값 배열에서 undefined를 null로 변환
 * @param {any[]} values - SQL 바인딩용 배열
 * @returns {any[]} - undefined가 null로 바뀐 배열
 */
export function normalizeParams(values) {
  return values.map((v) => (v === undefined ? null : v));
}
