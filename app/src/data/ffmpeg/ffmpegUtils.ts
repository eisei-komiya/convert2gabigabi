import { FFmpegSession } from 'ffmpeg-kit-react-native';

/**
 * ユニークなファイル名サフィックスを生成する。
 * Date.now() のみだと同一ミリ秒内で衝突する可能性があるため、
 * ランダム文字列を組み合わせて一意性を保証する。
 *
 * @returns `{timestamp}_{random6chars}` 形式の文字列
 */
export function generateUniqueFileSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * FFmpegセッションのログからエラーメッセージを取得する。
 *
 * @param session FFmpegKit セッション
 * @returns ログ文字列
 */
export async function extractErrorFromLogs(session: FFmpegSession): Promise<string> {
  return session.getAllLogsAsString();
}

/**
 * FFmpegのログ文字列から動画の長さ（秒）を取得する。
 * ログに "Duration: HH:MM:SS.ss" 形式が含まれている場合に解析する。
 *
 * @param logs FFmpegログ文字列
 * @returns 動画の長さ（秒）、見つからない場合は null
 */
export function extractDurationFromLogs(logs: string): number | null {
  const match = logs.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseFloat(match[3]);
  return h * 3600 + m * 60 + s;
}
